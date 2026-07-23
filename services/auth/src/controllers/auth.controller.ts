import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma, UserRole, UserStatus, TransactionClient } from '@ricton/db';
import {
  successResponse,
  ConflictError,
  UnauthorizedError,
  ValidationError,
  NotFoundError,
  AppError,
  redis,
  hashOtp,
  verifyOtp,
} from '@ricton/shared';
import twilio from 'twilio';
import sgMail from '@sendgrid/mail';
import { OAuth2Client } from 'google-auth-library';
import appleSigninAuth from 'apple-signin-auth';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

if (!JWT_SECRET || !REFRESH_SECRET) {
  throw new Error('FATAL: JWT_SECRET or REFRESH_SECRET environment variable is missing.');
}

// Twilio Config
const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

// SendGrid Config
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Google Config
const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const generateTokens = async (
  user: { id: string; role: string; status: string; tokenVersion?: number },
  req?: Request,
  options?: { rememberMe?: boolean; deviceId?: string; deviceFingerprint?: string }
) => {
  const tokenVersion = user.tokenVersion ?? 0;
  const jti = crypto.randomUUID();

  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
      status: user.status,
      iss: 'ricton-issuer',
      tokenVersion,
      jti,
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshTokenExpiry = options?.rememberMe ? '30d' : '7d';
  const refreshToken = jwt.sign({ userId: user.id, jti }, REFRESH_SECRET, {
    expiresIn: refreshTokenExpiry,
  });

  const tokenHash = hashToken(refreshToken);

  // Store token in Redis set with appropriate TTL
  const refreshKey = `refresh:${user.id}`;
  const ttlSeconds = options?.rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
  await redis.sadd(refreshKey, refreshToken);
  await redis.expire(refreshKey, ttlSeconds);

  // Get device info from request
  const deviceIp = req
    ? (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress
    : null;
  const userAgent = req ? req.headers['user-agent'] : null;
  const deviceOs = parseUserAgent(userAgent || '');

  // Create new refresh token with family tracking
  const newRefreshToken = await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      deviceId: options?.deviceId || null,
      deviceFingerprint: options?.deviceFingerprint || null,
      deviceIp,
      deviceOs,
      userAgent,
      expiresAt: new Date(Date.now() + (options?.rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000),
      tokenFamily: options?.deviceId || jti.split('-')[0], // Use deviceId or first part of jti as family
    },
  });

  return { token, refreshToken, tokenId: newRefreshToken.id };
};

const parseUserAgent = (ua: string): string => {
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS') || ua.includes('iPhone')) return 'iOS';
  return 'Unknown';
};

// Audit log helper
const auditLog = async (
  action: string,
  actorId: string | null,
  req: Request,
  metadata?: Record<string, unknown>,
  riskScore?: number
) => {
  try {
    const deviceId = req.headers['x-device-id'] as string;
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        resourceType: 'AUTH',
        metadata: (metadata || {}) as any,
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        deviceId,
        riskScore,
      },
    });
  } catch (error) {
    // Don't fail auth flow if audit logging fails
    console.error('Audit log failed:', error);
  }
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, phone, password, role, firstName, lastName, consentVersion } = req.body;

    if (!email && !phone) {
      throw new ValidationError('Email or phone is required');
    }

    if (!consentVersion) {
      throw new ValidationError('consentVersion is required for NDPA compliance registration');
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
      },
    });

    if (existingUser) {
      await auditLog('REGISTER_FAILURE', null, req, { reason: 'USER_EXISTS', email, phone });
      throw new ConflictError('User already exists with this email or phone');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.$transaction(async (tx: TransactionClient) => {
      const newUser = await tx.user.create({
        data: {
          email,
          phone,
          passwordHash,
          role,
          status: UserStatus.PENDING,
          consentVersion: consentVersion || null,
          consentAt: consentVersion ? new Date() : null,
        },
      });

      if (role === UserRole.PATIENT) {
        await tx.patientProfile.create({
          data: { userId: newUser.id, firstName, lastName },
        });
      } else if (role === UserRole.CONSULTANT) {
        await tx.providerProfile.create({
          data: { userId: newUser.id, firstName, lastName },
        });
      }

      return newUser;
    });

    await auditLog('REGISTER_SUCCESS', user.id, req, { role, email, phone });

    res.status(201).json(successResponse({ id: user.id, role: user.role, status: user.status }));
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, phone, password, rememberMe } = req.body;

    if (!email && !phone) throw new ValidationError('Email or phone is required');

    const user = await prisma.user.findFirst({
      where: {
        OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
      },
    });

    if (!user || !user.passwordHash) {
      await auditLog('LOGIN_FAILURE', null, req, { reason: 'INVALID_CREDENTIALS', email, phone });
      throw new UnauthorizedError('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      await auditLog('LOGIN_FAILURE', user.id, req, { reason: 'INVALID_PASSWORD' });
      throw new UnauthorizedError('Invalid credentials');
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DEACTIVATED) {
      await auditLog('LOGIN_FAILURE', user.id, req, {
        reason: 'ACCOUNT_DISABLED',
        status: user.status,
      });
      throw new UnauthorizedError('Account is disabled');
    }

    // Get device info for fingerprinting
    const deviceId = req.headers['x-device-id'] as string | undefined;
    const deviceFingerprint = req.headers['x-device-fingerprint'] as string | undefined;

    // Calculate risk score based on device consistency
    let riskScore = 0;
    const existingToken = await prisma.refreshToken.findFirst({
      where: { userId: user.id, deviceId: deviceId || null, isActive: true },
    });

    if (!existingToken && deviceId) {
      riskScore += 20; // New device
    }

    // Check for impossible travel (simplified - compare with last login location)
    if (user.lastLoginAt) {
      const timeSinceLastLogin = Date.now() - user.lastLoginAt.getTime();
      if (timeSinceLastLogin < 3600000) {
        // Less than 1 hour
        // Could add geo-IP check here
        riskScore += 10;
      }
    }

    const { token, refreshToken, tokenId } = await generateTokens(user, req, {
      rememberMe: rememberMe === true,
      deviceId,
      deviceFingerprint,
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await auditLog(
      'LOGIN_SUCCESS',
      user.id,
      req,
      {
        deviceId,
        rememberMe: rememberMe === true,
        tokenId,
      },
      riskScore
    );

    res.status(200).json(
      successResponse({
        token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

export const sendOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, phone } = req.body;
    if (!email && !phone) throw new ValidationError('Email or phone is required');

    const key = email || phone;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = hashOtp(otp);

    if (phone) {
      if (!twilioClient || !process.env.TWILIO_PHONE_NUMBER) {
        throw new AppError(
          'Twilio is not configured. Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER',
          500,
          'SERVICE_NOT_CONFIGURED'
        );
      }
      await twilioClient.messages.create({
        body: `Your Ricton Health verification code is: ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
    } else if (email) {
      if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
        throw new AppError(
          'SendGrid is not configured. Missing SENDGRID_API_KEY or SENDGRID_FROM_EMAIL',
          500,
          'SERVICE_NOT_CONFIGURED'
        );
      }
      await sgMail.send({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: 'Ricton Health - Verification Code',
        text: `Your Ricton Health verification code is: ${otp}`,
        html: `<strong>Your Ricton Health verification code is: ${otp}</strong>`,
      });
    }

    // Store in Redis only after successful dispatch
    await redis.set(`otp:${key}`, JSON.stringify({ hash: otpHash, attempts: 0 }), 'EX', 600); // 10 minutes expiry

    res.status(200).json(successResponse({ message: `OTP sent to ${key}` }));
  } catch (error) {
    next(error);
  }
};

export const verifyOtpCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, phone, otp } = req.body;
    if (!email && !phone) throw new ValidationError('Email or phone is required');
    if (!otp) throw new ValidationError('OTP is required');

    const key = email || phone;
    const storedData = await redis.get(`otp:${key}`);

    if (!storedData) {
      throw new UnauthorizedError('Invalid or expired OTP');
    }

    const parsedData = JSON.parse(storedData);

    if (!verifyOtp(parsedData.hash, otp)) {
      parsedData.attempts += 1;
      if (parsedData.attempts >= 3) {
        await redis.del(`otp:${key}`);
        throw new UnauthorizedError('Too many failed attempts. Please request a new OTP.');
      } else {
        // preserve the remaining TTL (approximate)
        const ttl = await redis.ttl(`otp:${key}`);
        if (ttl > 0) {
          await redis.set(`otp:${key}`, JSON.stringify(parsedData), 'EX', ttl);
        }
        throw new UnauthorizedError('Invalid OTP');
      }
    }

    const user = await prisma.user.findFirst({
      where: { OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])] },
    });

    if (!user) throw new NotFoundError('User not found');

    // Delete OTP only after DB lookup succeeds
    await redis.del(`otp:${key}`);

    const { token, refreshToken } = await generateTokens(user, req);

    res.status(200).json(
      successResponse({
        token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

export const oauthGoogle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, role } = req.body;
    if (!token) throw new ValidationError('OAuth token is required');

    if (!googleClient)
      throw new AppError('Google OAuth is not configured.', 500, 'SERVICE_NOT_CONFIGURED');

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) throw new UnauthorizedError('Invalid Google Token');

    const email = payload.email;

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      if (!role) throw new ValidationError('Role is required for new OAuth users');
      user = await prisma.user.create({
        data: {
          email,
          role,
          status: UserStatus.PENDING,
          oauthProvider: 'GOOGLE',
          oauthId: payload.sub,
        },
      });
    }

    const { token: jwtToken, refreshToken } = await generateTokens(user, req);

    res.status(200).json(
      successResponse({
        token: jwtToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

export const oauthApple = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, role } = req.body;
    if (!token) throw new ValidationError('OAuth token is required');

    const verifyOpts = process.env.APPLE_CLIENT_ID
      ? { audience: process.env.APPLE_CLIENT_ID }
      : undefined;

    let payload;
    try {
      payload = await appleSigninAuth.verifyIdToken(token, verifyOpts);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new UnauthorizedError(`Invalid Apple Token: ${message}`);
    }

    if (!payload || !payload.email) throw new UnauthorizedError('Invalid Apple Token payload');
    const email = payload.email;

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      if (!role) throw new ValidationError('Role is required for new OAuth users');
      user = await prisma.user.create({
        data: {
          email,
          role,
          status: UserStatus.PENDING,
          oauthProvider: 'APPLE',
          oauthId: payload.sub,
        },
      });
    }

    const { token: jwtToken, refreshToken } = await generateTokens(user, req);

    res.status(200).json(
      successResponse({
        token: jwtToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new ValidationError('Refresh token is required');

    const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as { userId: string; jti?: string };

    const tokenHash = hashToken(refreshToken);

    // Get the current token with family info
    const currentToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { parentToken: true },
    });

    if (!currentToken || !currentToken.isActive) {
      // Check if this is a token reuse attack (token was already used)
      const revokedToken = await prisma.refreshToken.findUnique({
        where: { tokenHash },
      });

      if (revokedToken && revokedToken.isRevoked) {
        // TOKEN REUSE ATTACK DETECTED - revoke entire family
        await auditLog(
          'TOKEN_REUSE_ATTACK',
          decoded.userId,
          req,
          {
            tokenId: revokedToken.id,
            tokenFamily: revokedToken.tokenFamily,
          },
          90
        ); // High risk score

        // Revoke all tokens in the same family
        await prisma.refreshToken.updateMany({
          where: {
            userId: decoded.userId,
            tokenFamily: revokedToken.tokenFamily,
            isActive: true,
          },
          data: {
            isRevoked: true,
            revokedAt: new Date(),
            revokeReason: 'TOKEN_REUSE_ATTACK_DETECTED',
          },
        });

        // Also increment tokenVersion to invalidate all access tokens
        await prisma.user.update({
          where: { id: decoded.userId },
          data: { tokenVersion: { increment: 1 } },
        });

        throw new UnauthorizedError(
          'Security alert: Token reuse detected. All sessions invalidated.'
        );
      }

      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Grace period check: allow token refresh within 24h of expiry even if expired
    const now = new Date();
    const gracePeriodMs = 24 * 60 * 60 * 1000; // 24 hours
    if (
      currentToken.expiresAt < now &&
      currentToken.expiresAt.getTime() + gracePeriodMs < now.getTime()
    ) {
      // Expired beyond grace period
      await auditLog(
        'REFRESH_TOKEN_EXPIRED',
        decoded.userId,
        req,
        {
          expiresAt: currentToken.expiresAt,
        },
        30
      );
      throw new UnauthorizedError('Refresh token expired');
    }

    // Device fingerprint validation
    const deviceId = req.headers['x-device-id'] as string | undefined;
    const deviceFingerprint = req.headers['x-device-fingerprint'] as string | undefined;

    let riskScore = 0;
    if (deviceId && currentToken.deviceId && deviceId !== currentToken.deviceId) {
      riskScore += 50; // Device mismatch - high risk
      await auditLog(
        'DEVICE_MISMATCH',
        decoded.userId,
        req,
        {
          storedDeviceId: currentToken.deviceId,
          incomingDeviceId: deviceId,
        },
        riskScore
      );
    }

    if (
      deviceFingerprint &&
      currentToken.deviceFingerprint &&
      deviceFingerprint !== currentToken.deviceFingerprint
    ) {
      riskScore += 30; // Fingerprint mismatch
    }

    // Atomically mark current token as inactive and create new one
    const [newRefreshToken] = await prisma.$transaction(async (tx) => {
      // Mark current token as used
      await tx.refreshToken.update({
        where: { id: currentToken.id },
        data: {
          isActive: false,
          lastUsedAt: new Date(),
          usageCount: { increment: 1 },
        },
      });

      // Remove from Redis
      await redis.srem(`refresh:${decoded.userId}`, refreshToken);

      // Get user with updated tokenVersion
      const user = await tx.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, role: true, status: true, tokenVersion: true },
      });

      if (!user) throw new NotFoundError('User not found');
      if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DEACTIVATED) {
        throw new UnauthorizedError('Account is disabled');
      }

      // Create new token in the same family
      const jti = crypto.randomUUID();
      const refreshTokenExpiry = '7d';
      const newRefreshTokenStr = jwt.sign({ userId: user.id, jti }, REFRESH_SECRET, {
        expiresIn: refreshTokenExpiry,
      });

      const newTokenHash = hashToken(newRefreshTokenStr);
      const ttlSeconds = 7 * 24 * 60 * 60;

      await redis.sadd(`refresh:${user.id}`, newRefreshTokenStr);
      await redis.expire(`refresh:${user.id}`, ttlSeconds);

      const newToken = await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: newTokenHash,
          deviceId: currentToken.deviceId,
          deviceFingerprint: currentToken.deviceFingerprint,
          deviceIp: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          tokenFamily: currentToken.tokenFamily,
          parentTokenId: currentToken.id,
        },
      });

      return [newToken, newRefreshTokenStr, user];
    });

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, status: true, tokenVersion: true },
    });

    if (!user) throw new NotFoundError('User not found');

    // Generate new access token with updated tokenVersion
    const jti = crypto.randomUUID();
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        status: user.status,
        iss: 'ricton-issuer',
        tokenVersion: user.tokenVersion,
        jti,
      },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    await auditLog(
      'TOKEN_REFRESH',
      user.id,
      req,
      {
        oldTokenId: currentToken.id,
        newTokenId: newRefreshToken.id,
        tokenFamily: currentToken.tokenFamily,
        riskScore,
      },
      riskScore
    );

    res.status(200).json(successResponse({ token, refreshToken: newRefreshToken }));
  } catch (error) {
    if (
      error instanceof ValidationError ||
      error instanceof UnauthorizedError ||
      error instanceof NotFoundError
    ) {
      return next(error);
    }
    next(new UnauthorizedError('Invalid refresh token'));
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new ValidationError('Refresh token is required');

    const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as { userId: string };

    // Get token info before revoking for audit
    const tokenHash = hashToken(refreshToken);
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    await redis.srem(`refresh:${decoded.userId}`, refreshToken);

    if (tokenRecord) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: {
          isActive: false,
          isRevoked: true,
          revokedAt: new Date(),
          revokeReason: 'USER_LOGOUT',
        },
      });
    }

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = jwt.decode(token) as { exp?: number } | null;
      if (payload && payload.exp) {
        const ttl = payload.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await redis.set(`blacklist:token:${token}`, '1', 'EX', ttl);
        }
      }
    }

    await auditLog('LOGOUT', decoded.userId, req, { tokenId: tokenRecord?.id });

    res.status(200).json(successResponse({ message: 'Logged out successfully' }));
  } catch (error) {
    if (error instanceof ValidationError) return next(error);
    next(new UnauthorizedError('Invalid refresh token'));
  }
};

export const logoutAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    // Revoke all refresh tokens for this user
    await prisma.refreshToken.updateMany({
      where: { userId, isActive: true },
      data: {
        isActive: false,
        isRevoked: true,
        revokedAt: new Date(),
        revokeReason: 'LOGOUT_ALL_DEVICES',
      },
    });

    // Clear Redis
    await redis.del(`refresh:${userId}`);

    // Increment tokenVersion to invalidate all access tokens
    await prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });

    await auditLog('LOGOUT_ALL', userId, req);

    res.status(200).json(successResponse({ message: 'Logged out from all devices' }));
  } catch (error) {
    next(error);
  }
};

export const getSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const sessions = await prisma.refreshToken.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        deviceId: true,
        deviceOs: true,
        userAgent: true,
        deviceIp: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        tokenFamily: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });

    res.status(200).json(successResponse({ sessions }));
  } catch (error) {
    next(error);
  }
};

export const revokeSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user!.userId;

    const session = await prisma.refreshToken.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new NotFoundError('Session not found');
    }

    await prisma.refreshToken.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        isRevoked: true,
        revokedAt: new Date(),
        revokeReason: 'USER_REVOKED_SESSION',
      },
    });

    // Remove from Redis
    const tokens = await redis.smembers(`refresh:${userId}`);
    // Note: We can't directly remove without the token value, but it will expire naturally

    await auditLog('SESSION_REVOKED', userId, req, { sessionId });

    res.status(200).json(successResponse({ message: 'Session revoked successfully' }));
  } catch (error) {
    next(error);
  }
};

export const passwordForgot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, phone } = req.body;
    if (!email && !phone) throw new ValidationError('Email or phone is required');

    const key = email || phone;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = hashOtp(otp);

    // Fire-and-forget user lookup
    const user = await prisma.user.findFirst({
      where: { OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])] },
    });

    // Only send the OTP if the user exists, but don't leak this fact
    if (user) {
      if (phone && twilioClient && process.env.TWILIO_PHONE_NUMBER) {
        await twilioClient.messages.create({
          body: `Your Ricton Health password reset code is: ${otp}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone,
        });
      } else if (email && process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
        await sgMail.send({
          to: email,
          from: process.env.SENDGRID_FROM_EMAIL,
          subject: 'Ricton Health - Password Reset',
          text: `Your password reset code is: ${otp}`,
        });
      }

      // Store in Redis only after dispatch
      await redis.set(`reset:${key}`, JSON.stringify({ hash: otpHash, attempts: 0 }), 'EX', 600); // 10 mins
    }

    res
      .status(200)
      .json(successResponse({ message: `If an account exists, a reset code was sent.` }));
  } catch (error) {
    next(error);
  }
};

export const passwordReset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, phone, otp, newPassword } = req.body;
    if (!email && !phone) throw new ValidationError('Email or phone is required');
    if (!otp) throw new ValidationError('OTP is required');

    const key = email || phone;
    const storedData = await redis.get(`reset:${key}`);

    if (!storedData) {
      await auditLog('PASSWORD_RESET_FAILURE', null, req, { reason: 'INVALID_OTP', email, phone });
      throw new UnauthorizedError('Invalid or expired OTP');
    }

    const parsedData = JSON.parse(storedData);

    if (!verifyOtp(parsedData.hash, otp)) {
      parsedData.attempts += 1;
      if (parsedData.attempts >= 3) {
        await redis.del(`reset:${key}`);
        await auditLog(
          'PASSWORD_RESET_FAILURE',
          null,
          req,
          {
            reason: 'TOO_MANY_ATTEMPTS',
            email,
            phone,
            attempts: parsedData.attempts,
          },
          40
        );
        throw new UnauthorizedError('Too many failed attempts. Please request a new reset code.');
      } else {
        const ttl = await redis.ttl(`reset:${key}`);
        if (ttl > 0) {
          await redis.set(`reset:${key}`, JSON.stringify(parsedData), 'EX', ttl);
        }
        throw new UnauthorizedError('Invalid OTP');
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    const user = await prisma.user.findFirst({
      where: { OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])] },
    });

    if (!user) {
      await redis.del(`reset:${key}`);
      throw new NotFoundError('User not found');
    }

    // Update password and increment tokenVersion to invalidate all existing sessions
    await prisma.user.updateMany({
      where: { id: user.id },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
      },
    });

    await redis.del(`reset:${key}`);

    await auditLog('PASSWORD_RESET_SUCCESS', user.id, req, { email, phone });

    res.status(200).json(successResponse({ message: 'Password reset successfully' }));
  } catch (error) {
    next(error);
  }
};

const sendVerificationOtp = async (
  req: Request,
  res: Response,
  next: NextFunction,
  channel: 'email' | 'phone'
) => {
  try {
    const value = req.body[channel];
    if (!value) throw new ValidationError(`${channel === 'email' ? 'Email' : 'Phone'} is required`);

    const user = await prisma.user.findFirst({
      where: { [channel]: value },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = hashOtp(otp);

    if (channel === 'phone') {
      if (!twilioClient || !process.env.TWILIO_PHONE_NUMBER) {
        throw new AppError(
          'Twilio is not configured. Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER',
          500,
          'SERVICE_NOT_CONFIGURED'
        );
      }
      await twilioClient.messages.create({
        body: `Your Ricton Health verification code is: ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: value,
      });
    } else {
      if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
        throw new AppError(
          'SendGrid is not configured. Missing SENDGRID_API_KEY or SENDGRID_FROM_EMAIL',
          500,
          'SERVICE_NOT_CONFIGURED'
        );
      }
      await sgMail.send({
        to: value,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: 'Ricton Health - Verification Code',
        text: `Your Ricton Health verification code is: ${otp}`,
        html: `<strong>Your Ricton Health verification code is: ${otp}</strong>`,
      });
    }

    await redis.set(`verify:${value}`, JSON.stringify({ hash: otpHash, attempts: 0 }), 'EX', 600);

    res.status(200).json(successResponse({ message: `Verification code sent to ${value}` }));
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  return sendVerificationOtp(req, res, next, 'email');
};

export const verifyPhone = async (req: Request, res: Response, next: NextFunction) => {
  return sendVerificationOtp(req, res, next, 'phone');
};

export const verifyContact = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, phone, otp } = req.body;
    if (!email && !phone) throw new ValidationError('Email or phone is required');
    if (!otp) throw new ValidationError('OTP is required');

    const key = email || phone;
    const storedData = await redis.get(`verify:${key}`);

    if (!storedData) {
      throw new UnauthorizedError('Invalid or expired verification code');
    }

    const parsedData = JSON.parse(storedData);

    if (!verifyOtp(parsedData.hash, otp)) {
      parsedData.attempts += 1;
      if (parsedData.attempts >= 3) {
        await redis.del(`verify:${key}`);
        throw new UnauthorizedError('Too many failed attempts. Please request a new code.');
      } else {
        const ttl = await redis.ttl(`verify:${key}`);
        if (ttl > 0) {
          await redis.set(`verify:${key}`, JSON.stringify(parsedData), 'EX', ttl);
        }
        throw new UnauthorizedError('Invalid OTP');
      }
    }

    const updateData: Record<string, boolean> = {};
    if (email) updateData.emailVerified = true;
    if (phone) updateData.phoneVerified = true;

    const updateResult = await prisma.user.updateMany({
      where: { OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])] },
      data: updateData,
    });

    if (updateResult.count === 0) {
      throw new NotFoundError('User not found');
    }

    await redis.del(`verify:${key}`);

    res.status(200).json(successResponse({ message: 'Contact verified successfully' }));
  } catch (error) {
    next(error);
  }
};
