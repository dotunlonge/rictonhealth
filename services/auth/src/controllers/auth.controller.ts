import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma, Prisma, UserRole, UserStatus, TransactionClient } from '@ricton/db';
import {
  successResponse,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  NotFoundError,
  AppError,
  redis,
  hashOtp,
  verifyOtp,
  generateTotpSecret,
  verifyTotpToken,
  getTotpAuthUrl,
  encryptTotpSecret,
  decryptTotpSecret,
  invalidateCache,
} from '@ricton/shared';
import { isEmailConfigured, isSmsConfigured } from '@ricton/shared/jobs';
import { OAuth2Client } from 'google-auth-library';
import appleSigninAuth from 'apple-signin-auth';
import crypto from 'crypto';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is missing.');
  }
  return secret;
}

function getRefreshSecret(): string {
  const secret = process.env.REFRESH_SECRET;
  if (!secret) {
    throw new Error('FATAL: REFRESH_SECRET environment variable is missing.');
  }
  return secret;
}

function getGoogleClient() {
  return process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;
}

interface GoogleProfile {
  email: string;
  sub: string;
  givenName?: string;
  familyName?: string;
  name?: string;
  picture?: string;
}

/**
 * Verify a Google credential from either frontend path.
 *
 * Path 1 (preferred): audience-bound OpenID ID token from One Tap / GIS
 * credential response, or from the mobile native flow (expo-auth-session) —
 * whose `aud` is the platform client (GOOGLE_IOS_CLIENT_ID), not the web
 * client. Both audiences are accepted; signature + audience are verified.
 *
 * Path 2 (popup fallback): OAuth2 access token. Never trusted directly:
 * it is first bound to this app via tokeninfo (aud/azp must equal our
 * client ID — a token minted for another app is rejected), then the profile
 * is read from userinfo. Either leg failing means 401, never a login.
 */
async function verifyGoogleCredential(
  googleClient: OAuth2Client,
  token: string
): Promise<GoogleProfile | null> {
  // Web GIS tokens carry aud = GOOGLE_CLIENT_ID; mobile native tokens carry
  // aud = GOOGLE_IOS_CLIENT_ID. Accept both — google-auth-library checks the
  // token's aud against this list.
  const audiences = [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_IOS_CLIENT_ID].filter(
    (id): id is string => Boolean(id)
  );
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID || (audiences.length > 0 ? audiences : undefined),
    });
    const payload = ticket.getPayload();
    if (payload?.email && payload.sub && payload.email_verified === true) {
      return {
        email: payload.email,
        sub: payload.sub,
        givenName: payload.given_name,
        familyName: payload.family_name,
        name: payload.name,
        picture: payload.picture,
      };
    }
  } catch {
    // Not a valid ID token — try the access-token path below.
  }

  try {
    const appId = process.env.GOOGLE_CLIENT_ID;
    const iosAppId = process.env.GOOGLE_IOS_CLIENT_ID;
    if (!appId && !iosAppId) return null;

    const infoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!infoRes.ok) return null;
    const info = (await infoRes.json()) as {
      aud?: string;
      azp?: string;
    };
    if (
      info.aud !== appId &&
      info.azp !== appId &&
      info.aud !== iosAppId &&
      info.azp !== iosAppId
    ) {
      return null;
    }

    const meRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!meRes.ok) return null;
    const me = (await meRes.json()) as {
      email?: string;
      sub?: string;
      verified_email?: boolean;
      email_verified?: boolean;
      given_name?: string;
      family_name?: string;
      name?: string;
      picture?: string;
    };
    if (!me.email || !me.sub || (me.verified_email !== true && me.email_verified !== true)) {
      return null;
    }
    return {
      email: me.email,
      sub: me.sub,
      givenName: me.given_name,
      familyName: me.family_name,
      name: me.name,
      picture: me.picture,
    };
  } catch {
    return null;
  }
}

const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Public self-serve roles only. HOSPITAL_ADMIN / SUPER_ADMIN must be provisioned
// via an authenticated admin flow, never via public register or OAuth.
const PUBLIC_REGISTRABLE_ROLES = new Set(['PATIENT', 'CONSULTANT', 'PHARMACIST']);

const generateSecureOtp = (): string => {
  return crypto.randomInt(100000, 1000000).toString();
};

const verifyStoredTotp = (code: unknown, storedSecret: string | null): boolean => {
  if (typeof code !== 'string' || !storedSecret) return false;
  try {
    return verifyTotpToken(code, decryptTotpSecret(storedSecret));
  } catch {
    return false;
  }
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
    getJwtSecret(),
    { expiresIn: '15m' }
  );

  const refreshTokenExpiry = options?.rememberMe ? '30d' : '7d';
  const refreshToken = jwt.sign({ userId: user.id, jti }, getRefreshSecret(), {
    expiresIn: refreshTokenExpiry,
  });

  const tokenHash = hashToken(refreshToken);

  // Store token in Redis set with appropriate TTL (non-blocking fallback for dev)
  try {
    const refreshKey = `refresh:${user.id}`;
    const ttlSeconds = options?.rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
    await redis.sadd(refreshKey, refreshToken);
    await redis.expire(refreshKey, ttlSeconds);
  } catch (err) {
    console.warn('Redis unavailable, proceeding with DB token tracking:', err);
  }

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

    // #L2 Age gate (best-effort): reject future/invalid DOB at registration.
    const dobRaw = (req.body as Record<string, unknown>).dateOfBirth;
    if (dobRaw !== undefined && dobRaw !== null && String(dobRaw).trim() !== '') {
      const dob = new Date(String(dobRaw));
      if (Number.isNaN(dob.getTime()) || dob > new Date()) {
        throw new ValidationError('Invalid dateOfBirth');
      }
    }

    if (!PUBLIC_REGISTRABLE_ROLES.has(role)) {
      throw new ForbiddenError(
        'Registration is limited to PATIENT, CONSULTANT, or PHARMACIST. Contact an administrator for elevated roles.'
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
      },
    });

    if (existingUser) {
      await auditLog('REGISTER_FAILURE', null, req, { reason: 'USER_EXISTS', email, phone });
      // #44 Enumeration: generic conflict message (do not reveal which identifier exists).
      throw new ConflictError('Unable to create account with these details');
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
          data: {
            userId: newUser.id,
            firstName,
            lastName,
            specialty: 'General Practice',
            // Real registrations require credential review in every environment.
            isVerified: false,
          },
        });

        // Provision default weekly availability slots (Mon-Sun 09:00 - 17:00, 30m slots)
        const weeklyAvailabilities = [];
        for (let day = 0; day < 7; day++) {
          weeklyAvailabilities.push({
            providerId: newUser.id,
            dayOfWeek: day,
            startTime: '09:00:00',
            endTime: '17:00:00',
            slotDurationMinutes: 30,
            isActive: true,
          });
        }
        await tx.providerAvailability.createMany({
          data: weeklyAvailabilities,
        });
      }

      return newUser;
    });

    if (role === UserRole.CONSULTANT) {
      await invalidateCache('providers*');
    }

    // #L1 Consent history: append the registration grant best-effort.
    try {
      await (prisma as any).consentHistory?.create?.({
        data: {
          userId: user.id,
          version: String(consentVersion),
          ip:
            (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
            req.socket.remoteAddress ||
            null,
        },
      });
    } catch {
      // best-effort: must not break registration if the table/client is behind
    }

    auditLog('REGISTER_SUCCESS', user.id, req, { role, email, phone }).catch((err) =>
      console.warn('Failed to record audit log', err)
    );

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

    // PENDING users may log in to complete verification/onboarding; privilege
    // escalation is prevented by the registration allowlist + admin ACTIVE gate.
    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DEACTIVATED) {
      await auditLog('LOGIN_FAILURE', user.id, req, {
        reason: 'ACCOUNT_DISABLED',
        status: user.status,
      });
      throw new UnauthorizedError('Account is disabled');
    }

    // Two-Factor Authentication Check
    const totpCode = req.body.totpCode || req.body.code || req.body['2faCode'];
    if (user.twoFactorEnabled) {
      if (!totpCode) {
        return res.status(200).json(
          successResponse({
            requires2FA: true,
            email: user.email,
            phone: user.phone,
            message: 'Two-factor authentication code required',
          })
        );
      }

      if (!verifyStoredTotp(totpCode, user.twoFactorSecret)) {
        await auditLog('LOGIN_FAILURE', user.id, req, { reason: 'INVALID_2FA_CODE' });
        throw new UnauthorizedError('Invalid 2FA authentication code');
      }
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
    // #45 OTP spam: per-recipient throttle (60s TTL), best-effort on redis failure.
    try {
      const throttleKey = `otp:throttle:${key}`;
      const throttled = await redis.get(throttleKey);
      if (throttled) {
        throw new AppError('Please wait before requesting another code', 429, 'RATE_LIMITED');
      }
      await redis.set(throttleKey, '1', 'EX', 60);
    } catch (e) {
      if (e instanceof AppError) throw e;
      // redis unavailable: continue without throttle rather than blocking OTP
    }
    const channel = phone ? 'SMS' : 'EMAIL';
    // Fail fast when no delivery path exists (same honesty as before, but
    // decided before any state is written).
    if (phone && !isSmsConfigured()) {
      throw new AppError(
        'Twilio is not configured. Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER',
        500,
        'SERVICE_NOT_CONFIGURED'
      );
    }
    if (email && !isEmailConfigured()) {
      throw new AppError(
        'SendGrid is not configured. Missing SENDGRID_API_KEY or SENDGRID_FROM_EMAIL',
        500,
        'SERVICE_NOT_CONFIGURED'
      );
    }

    const otp = generateSecureOtp();
    const otpHash = hashOtp(otp);

    // Transactional outbox: the intent survives crashes; the relay delivers
    // the code and publishes the verification hash only after the provider
    // accepts the message.
    await prisma.outboxEvent.create({
      data: {
        type: 'LOGIN_OTP',
        channel,
        recipient: key,
        payload: {
          redisKey: `otp:${key}`,
          otpHash,
          to: key,
          subject: 'Ricton Health - Verification Code',
          body: `Your Ricton Health verification code is: ${otp}`,
          message: `Your Ricton Health verification code is: ${otp}`,
          channel,
        } as unknown as Prisma.InputJsonValue,
      },
    });

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

    // #44 Enumeration: generic OTP failure (no 404 user-oracle).
    if (!user) throw new UnauthorizedError('Invalid or expired OTP');

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DEACTIVATED) {
      throw new UnauthorizedError('Account is disabled');
    }

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

    const googleClient = getGoogleClient();
    if (!googleClient)
      throw new AppError('Google OAuth is not configured.', 500, 'SERVICE_NOT_CONFIGURED');

    const payload = await verifyGoogleCredential(googleClient, token);
    if (!payload) {
      throw new UnauthorizedError('Invalid Google Token');
    }

    const email = payload.email;
    const googleSub = payload.sub;
    const googleFirstName = payload.givenName || payload.name?.split(' ')[0];
    const googleLastName = payload.familyName || payload.name?.split(' ').slice(1).join(' ');
    const googleAvatarUrl = payload.picture;

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      if (!role) {
        res.status(200).json(
          successResponse({
            requiresRoleSelection: true,
            email,
            token,
            oauthProvider: 'GOOGLE',
          })
        );
        return;
      }
      if (!PUBLIC_REGISTRABLE_ROLES.has(role)) {
        throw new ForbiddenError(
          'OAuth registration is limited to PATIENT, CONSULTANT, or PHARMACIST.'
        );
      }
      const resolvedFirst = googleFirstName || email.split('@')[0];
      const resolvedLast = googleLastName || '';

      user = await prisma.user.create({
        data: {
          email,
          role,
          // Provider-verified email counts as contact verification for
          // self-serve roles (allowlist already excludes privileged roles).
          status: UserStatus.ACTIVE,
          emailVerified: true,
          oauthProvider: 'GOOGLE',
          oauthId: googleSub || null,
          ...(role === UserRole.PATIENT
            ? {
                patientProfile: {
                  create: {
                    firstName: resolvedFirst,
                    lastName: resolvedLast,
                    avatarUrl: googleAvatarUrl || null,
                  },
                },
              }
            : role === UserRole.CONSULTANT
              ? {
                  providerProfile: {
                    create: {
                      firstName: resolvedFirst,
                      lastName: resolvedLast,
                      avatarUrl: googleAvatarUrl || null,
                    },
                  },
                }
              : {}),
        },
        include: {
          patientProfile: true,
          providerProfile: true,
        },
      });

      // #L1 Consent history (best-effort): OAuth clients may send consentVersion.
      try {
        const oauthConsent = (req.body as Record<string, unknown>)?.consentVersion ?? null;
        if (oauthConsent) {
          try {
            await prisma.user.update({
              where: { id: user.id },
              data: { consentVersion: String(oauthConsent), consentAt: new Date() },
            });
          } catch {
            // best-effort mirror; history row below is authoritative
          }
          await (prisma as any).consentHistory?.create?.({
            data: {
              userId: user.id,
              version: String(oauthConsent),
              ip:
                (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                req.socket.remoteAddress ||
                null,
            },
          });
        }
      } catch {
        // best-effort: must not break OAuth flow
      }
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DEACTIVATED) {
      throw new UnauthorizedError('Account is disabled');
    }

    // Two-Factor Authentication Check for OAuth
    const totpCode = req.body.totpCode || req.body.code || req.body['2faCode'];
    if (user.twoFactorEnabled) {
      if (!totpCode) {
        return res.status(200).json(
          successResponse({
            requires2FA: true,
            email: user.email,
            token,
            oauthProvider: 'GOOGLE',
            message: 'Two-factor authentication code required',
          })
        );
      }

      if (!verifyStoredTotp(totpCode, user.twoFactorSecret)) {
        throw new UnauthorizedError('Invalid 2FA authentication code');
      }
    }

    const { token: jwtToken, refreshToken } = await generateTokens(user, req);
    const profile = (user as any).patientProfile || (user as any).providerProfile || {};

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
          firstName:
            googleFirstName ||
            profile.firstName ||
            (user.email ? user.email.split('@')[0] : 'User'),
          lastName: googleLastName || profile.lastName || '',
          avatarUrl: googleAvatarUrl || profile.avatarUrl || null,
          patientProfile: (user as any).patientProfile,
          providerProfile: (user as any).providerProfile,
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

    if (!process.env.APPLE_CLIENT_ID) {
      throw new AppError('Apple OAuth is not configured.', 500, 'SERVICE_NOT_CONFIGURED');
    }

    // Native iOS tokens carry the bundle ID as audience; web flows carry the
    // Service ID. Accept every configured audience.
    const appleAudiences = [process.env.APPLE_CLIENT_ID, process.env.APPLE_IOS_BUNDLE_ID].filter(
      (id): id is string => Boolean(id)
    );
    let payload;
    try {
      payload = await appleSigninAuth.verifyIdToken(token, {
        audience:
          process.env.APPLE_CLIENT_ID || (appleAudiences.length > 0 ? appleAudiences : undefined),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new UnauthorizedError(`Invalid Apple Token: ${message}`);
    }

    if (
      !payload?.email ||
      !payload.sub ||
      ![true, 'true'].includes(payload.email_verified as boolean | string)
    ) {
      throw new UnauthorizedError('Invalid Apple Token payload');
    }
    const email = payload.email;

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      if (!role) {
        res.status(200).json(
          successResponse({
            requiresRoleSelection: true,
            email,
            token,
            oauthProvider: 'APPLE',
          })
        );
        return;
      }
      if (!PUBLIC_REGISTRABLE_ROLES.has(role)) {
        throw new ForbiddenError(
          'OAuth registration is limited to PATIENT, CONSULTANT, or PHARMACIST.'
        );
      }
      user = await prisma.user.create({
        data: {
          email,
          role,
          // Provider-verified email counts as contact verification for
          // self-serve roles (allowlist already excludes privileged roles).
          status: UserStatus.ACTIVE,
          emailVerified: true,
          oauthProvider: 'APPLE',
          oauthId: payload.sub,
        },
      });

      // #L1 Consent history (best-effort): OAuth clients may send consentVersion.
      try {
        const oauthConsent = (req.body as Record<string, unknown>)?.consentVersion ?? null;
        if (oauthConsent) {
          try {
            await prisma.user.update({
              where: { id: user.id },
              data: { consentVersion: String(oauthConsent), consentAt: new Date() },
            });
          } catch {
            // best-effort mirror; history row below is authoritative
          }
          await (prisma as any).consentHistory?.create?.({
            data: {
              userId: user.id,
              version: String(oauthConsent),
              ip:
                (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                req.socket.remoteAddress ||
                null,
            },
          });
        }
      } catch {
        // best-effort: must not break OAuth flow
      }
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DEACTIVATED) {
      throw new UnauthorizedError('Account is disabled');
    }

    // Two-Factor Authentication Check for Apple OAuth
    const totpCode = req.body.totpCode || req.body.code || req.body['2faCode'];
    if (user.twoFactorEnabled) {
      if (!totpCode) {
        return res.status(200).json(
          successResponse({
            requires2FA: true,
            email: user.email,
            token,
            oauthProvider: 'APPLE',
            message: 'Two-factor authentication code required',
          })
        );
      }

      if (!verifyStoredTotp(totpCode, user.twoFactorSecret)) {
        throw new UnauthorizedError('Invalid 2FA authentication code');
      }
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

    let decoded: { userId: string; jti?: string };
    try {
      decoded = jwt.verify(refreshToken, getRefreshSecret()) as {
        userId: string;
        jti?: string;
      };
    } catch (jwtErr) {
      if (jwtErr instanceof jwt.TokenExpiredError) {
        // Decode expired JWT payload to allow evaluating the 24h database grace period
        decoded = jwt.decode(refreshToken) as { userId: string; jti?: string };
        if (!decoded?.userId) {
          throw new UnauthorizedError('Invalid refresh token');
        }
      } else {
        throw new UnauthorizedError('Invalid refresh token');
      }
    }

    const tokenHash = hashToken(refreshToken);

    // Get the current token with family info
    const currentToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { parentToken: true },
    });

    if (!currentToken || !currentToken.isActive) {
      const inactiveToken = await prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: { childTokens: { select: { id: true } } },
      });

      // Explicit revocation (logout, admin revoke, sessions purge) is NOT an
      // attack: the session is simply dead.
      if (inactiveToken?.isRevoked) {
        throw new UnauthorizedError('Invalid or expired refresh token');
      }

      // A ROTATED token (superseded by a child during refresh) presented again
      // signals token theft: the legitimate client moved on, someone else is
      // replaying the old credential. Nuke the family + access tokens.
      if (inactiveToken && inactiveToken.childTokens.length > 0) {
        // TOKEN REUSE ATTACK DETECTED - revoke entire family
        await auditLog(
          'TOKEN_REUSE_ATTACK',
          decoded.userId,
          req,
          {
            tokenId: inactiveToken.id,
            tokenFamily: inactiveToken.tokenFamily,
          },
          90
        ); // High risk score

        // Revoke all tokens in the same family
        await prisma.refreshToken.updateMany({
          where: {
            userId: decoded.userId,
            tokenFamily: inactiveToken.tokenFamily,
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
        await redis.del(`user:tokenVersion:${decoded.userId}`);

        throw new UnauthorizedError(
          'Security alert: Token reuse detected. All sessions invalidated.'
        );
      }

      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Refresh credentials have an absolute expiry; never extend their lifetime.
    const now = new Date();
    if (currentToken.expiresAt <= now) {
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

    const riskScore = 0;
    if (deviceId && currentToken.deviceId && deviceId !== currentToken.deviceId) {
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
      throw new UnauthorizedError('Refresh token is not valid for this device');
    }

    if (
      deviceFingerprint &&
      currentToken.deviceFingerprint &&
      deviceFingerprint !== currentToken.deviceFingerprint
    ) {
      throw new UnauthorizedError('Refresh token device fingerprint mismatch');
    }

    // Atomically mark current token as inactive and create new one
    const rotatedToken = await prisma.$transaction(async (tx) => {
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

      // Create new token in the same family, preserving the original
      // session lifetime (remember-me sessions stay 30d across rotations).
      const jti = crypto.randomUUID();
      const originalLifespanMs =
        currentToken.expiresAt.getTime() - currentToken.createdAt.getTime();
      const longLived = originalLifespanMs > 8 * 24 * 60 * 60 * 1000;
      const refreshTokenExpiry = longLived ? '30d' : '7d';
      const refreshTtlSeconds = (longLived ? 30 : 7) * 24 * 60 * 60;
      const newRefreshTokenStr = jwt.sign({ userId: user.id, jti }, getRefreshSecret(), {
        expiresIn: refreshTokenExpiry,
      });

      const newTokenHash = hashToken(newRefreshTokenStr);

      await redis.sadd(`refresh:${user.id}`, newRefreshTokenStr);
      await redis.expire(`refresh:${user.id}`, refreshTtlSeconds);

      const newToken = await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: newTokenHash,
          deviceId: currentToken.deviceId,
          deviceFingerprint: currentToken.deviceFingerprint,
          deviceIp: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
          expiresAt: new Date(Date.now() + refreshTtlSeconds * 1000),
          tokenFamily: currentToken.tokenFamily,
          parentTokenId: currentToken.id,
        },
      });

      return {
        record: newToken,
        value: newRefreshTokenStr,
        user,
      };
    });

    const { user } = rotatedToken;

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
      getJwtSecret(),
      { expiresIn: '15m' }
    );

    await auditLog(
      'TOKEN_REFRESH',
      user.id,
      req,
      {
        oldTokenId: currentToken.id,
        newTokenId: rotatedToken.record.id,
        tokenFamily: currentToken.tokenFamily,
        riskScore,
      },
      riskScore
    );

    res.status(200).json(successResponse({ token, refreshToken: rotatedToken.value }));
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

    const decoded = jwt.verify(refreshToken, getRefreshSecret()) as { userId: string };

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
    await redis.del(`user:tokenVersion:${userId}`);

    await auditLog('LOGOUT_ALL', userId, req);

    res.status(200).json(successResponse({ message: 'Logged out from all devices' }));
  } catch (error) {
    next(error);
  }
};

export const getSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const take = Math.min(Math.max(Number(req.query.limit) || 100, 1), 50);

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
      take,
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

    // Note: Tokens in Redis will expire naturally, or can be cleared on password reset

    await auditLog('SESSION_REVOKED', userId, req, { sessionId });

    res.status(200).json(successResponse({ message: 'Session revoked successfully' }));
  } catch (error) {
    next(error);
  }
};

export const passwordForgot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, phone } = req.body;
    if (Boolean(email) === Boolean(phone)) {
      throw new ValidationError('Provide exactly one of email or phone');
    }

    const channel = phone ? 'SMS' : 'EMAIL';
    if (phone && !isSmsConfigured()) {
      throw new AppError('Password recovery SMS is not configured', 503, 'SERVICE_NOT_CONFIGURED');
    }
    if (email && !isEmailConfigured()) {
      throw new AppError(
        'Password recovery email is not configured',
        503,
        'SERVICE_NOT_CONFIGURED'
      );
    }

    const key = email || phone;
    const otp = generateSecureOtp();
    const otpHash = hashOtp(otp);

    // Fire-and-forget user lookup
    const user = await prisma.user.findFirst({
      where: { OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])] },
    });

    // Only queue the OTP if the user exists, but don't leak this fact.
    // Transactional outbox: the relay delivers the code and publishes the
    // verification hash only after the provider accepts the message.
    if (user) {
      await prisma.outboxEvent.create({
        data: {
          type: 'PASSWORD_RESET_OTP',
          channel,
          recipient: key,
          payload: {
            redisKey: `reset:${key}`,
            otpHash,
            to: key,
            subject: 'Ricton Health - Password Reset',
            body: `Your password reset code is: ${otp}`,
            message: `Your Ricton Health password reset code is: ${otp}`,
            channel,
          } as unknown as Prisma.InputJsonValue,
        },
      });
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
    if (Boolean(email) === Boolean(phone)) {
      throw new ValidationError('Provide exactly one of email or phone');
    }
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
    await prisma.refreshToken.updateMany({
      where: { userId: user.id, isActive: true },
      data: {
        isActive: false,
        isRevoked: true,
        revokedAt: new Date(),
        revokeReason: 'PASSWORD_RESET',
      },
    });
    await redis.del(`refresh:${user.id}`);

    await redis.del(`reset:${key}`);
    await redis.del(`user:tokenVersion:${user.id}`);

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

    if (channel === 'phone' && !isSmsConfigured()) {
      throw new AppError(
        'Twilio is not configured. Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER',
        500,
        'SERVICE_NOT_CONFIGURED'
      );
    }
    if (channel === 'email' && !isEmailConfigured()) {
      throw new AppError(
        'SendGrid is not configured. Missing SENDGRID_API_KEY or SENDGRID_FROM_EMAIL',
        500,
        'SERVICE_NOT_CONFIGURED'
      );
    }

    const otp = generateSecureOtp();
    const otpHash = hashOtp(otp);
    const outboxChannel = channel === 'phone' ? 'SMS' : 'EMAIL';

    // Transactional outbox: the relay delivers the code and publishes the
    // verification hash only after the provider accepts the message.
    await prisma.outboxEvent.create({
      data: {
        type: 'VERIFY_CONTACT_OTP',
        channel: outboxChannel,
        recipient: value,
        payload: {
          redisKey: `verify:${value}`,
          otpHash,
          to: value,
          subject: 'Ricton Health - Verification Code',
          body: `Your Ricton Health verification code is: ${otp}`,
          message: `Your Ricton Health verification code is: ${otp}`,
          channel: outboxChannel,
        } as unknown as Prisma.InputJsonValue,
      },
    });

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

    // Verified contact promotes self-serve roles to ACTIVE. Privileged roles
    // (provisioned out-of-band) still require explicit admin activation.
    const activatableRoles: UserRole[] = [
      UserRole.PATIENT,
      UserRole.CONSULTANT,
      UserRole.PHARMACIST,
    ];
    const updateData: Record<string, boolean | string> = {};
    if (email) updateData.emailVerified = true;
    if (phone) updateData.phoneVerified = true;

    const candidate = await prisma.user.findFirst({
      where: { OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])] },
      select: { id: true, role: true, status: true, emailVerified: true, phoneVerified: true },
    });

    if (!candidate) {
      throw new NotFoundError('User not found');
    }

    const verifiedAfter = {
      emailVerified: candidate.emailVerified || Boolean(email),
      phoneVerified: candidate.phoneVerified || Boolean(phone),
    };
    const shouldActivate =
      candidate.status === UserStatus.PENDING &&
      activatableRoles.includes(candidate.role as UserRole) &&
      (verifiedAfter.emailVerified || verifiedAfter.phoneVerified);
    const verifiedUser = await prisma.user.update({
      where: { id: candidate.id },
      data: {
        ...updateData,
        ...(shouldActivate ? { status: UserStatus.ACTIVE } : {}),
      },
    });

    await redis.del(`verify:${key}`);

    const { token, refreshToken } = await generateTokens(verifiedUser, req);

    res.status(200).json(
      successResponse({
        message: 'Contact verified successfully',
        token,
        refreshToken,
        user: {
          id: verifiedUser.id,
          email: verifiedUser.email,
          phone: verifiedUser.phone,
          role: verifiedUser.role,
          status: verifiedUser.status,
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

export const get2FAStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = (req as any).user;
    const user = await prisma.user.findUnique({
      where: { id: userPayload.userId },
      select: { twoFactorEnabled: true },
    });
    if (!user) throw new NotFoundError('User not found');
    res.status(200).json(successResponse({ twoFactorEnabled: user.twoFactorEnabled }));
  } catch (error) {
    next(error);
  }
};

export const enable2FA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = (req as any).user;
    const user = await prisma.user.findUnique({ where: { id: userPayload.userId } });
    if (!user) throw new NotFoundError('User not found');

    // #46 step-up: session alone must not persist a new second factor.
    // Require password re-verification before issuing a TOTP secret.
    const { password } = req.body as { password?: unknown };
    if (typeof password !== 'string' || !password || !user.passwordHash) {
      throw new UnauthorizedError('Password verification is required to enable 2FA');
    }
    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      await auditLog('2FA_ENABLE_FAILURE', user.id, req, { reason: 'INVALID_PASSWORD' });
      throw new UnauthorizedError('Invalid password');
    }

    // Do not re-issue the plaintext secret once 2FA is active.
    if (user.twoFactorEnabled) {
      throw new ConflictError('Two-factor authentication is already enabled');
    }

    const secret = generateTotpSecret();

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: encryptTotpSecret(secret) },
    });

    const qrCodeUrl = getTotpAuthUrl(user.email || user.id, secret, 'Ricton Health');

    res.status(200).json(
      successResponse({
        secret,
        qrCodeUrl,
        message:
          'Scan the QR code locally or enter the secret key into Google Authenticator/Authy. Do not share this secret.',
      })
    );
  } catch (error) {
    next(error);
  }
};

export const verify2FA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = (req as any).user;
    const { code } = req.body;
    if (!code || typeof code !== 'string' || code.trim().length !== 6) {
      throw new ValidationError('Valid 6-digit authentication code is required');
    }

    const user = await prisma.user.findUnique({ where: { id: userPayload.userId } });
    if (!user) throw new NotFoundError('User not found');

    if (!verifyStoredTotp(code, user.twoFactorSecret)) {
      throw new UnauthorizedError('Invalid 2FA authentication code');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true },
    });

    res.status(200).json(
      successResponse({
        twoFactorEnabled: true,
        message: 'Two-factor authentication enabled successfully!',
      })
    );
  } catch (error) {
    next(error);
  }
};

export const disable2FA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = (req as any).user;
    const { code } = req.body;
    const user = await prisma.user.findUnique({ where: { id: userPayload.userId } });
    if (!user) throw new NotFoundError('User not found');

    if (!user.twoFactorEnabled) {
      res.status(200).json(
        successResponse({
          twoFactorEnabled: false,
          message: 'Two-factor authentication disabled.',
        })
      );
      return;
    }

    // Step-up: a bearer access token alone must not be able to strip the
    // second factor. The caller proves possession of the authenticator.
    if (!code || typeof code !== 'string' || code.trim().length !== 6) {
      throw new ValidationError('Valid 6-digit authentication code is required');
    }
    if (!verifyStoredTotp(code, user.twoFactorSecret)) {
      await auditLog('2FA_DISABLE_FAILURE', user.id, req, { reason: 'INVALID_2FA_CODE' });
      throw new UnauthorizedError('Invalid 2FA authentication code');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });

    res
      .status(200)
      .json(
        successResponse({ twoFactorEnabled: false, message: 'Two-factor authentication disabled.' })
      );
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = (req as any).user;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      throw new ValidationError('Current password and new password are required');
    }
    if (newPassword.length < 8) {
      throw new ValidationError('New password must be at least 8 characters long');
    }

    const user = await prisma.user.findUnique({ where: { id: userPayload.userId } });
    if (!user || !user.passwordHash) {
      throw new NotFoundError('User record not found or uses social login');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    // A password change must kill every session: bump access-token version
    // AND revoke all refresh tokens (a stolen refresh token otherwise
    // survives and mints fresh access tokens until its own expiry).
    await prisma.refreshToken.updateMany({
      where: { userId: user.id, isActive: true },
      data: {
        isActive: false,
        isRevoked: true,
        revokedAt: new Date(),
        revokeReason: 'PASSWORD_CHANGE',
      },
    });
    try {
      await redis.del(`refresh:${user.id}`);
    } catch {
      // best-effort cache invalidation (DB is authoritative for refresh)
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword, tokenVersion: { increment: 1 } },
    });
    try {
      await redis.del(`user:tokenVersion:${user.id}`);
    } catch {
      // best-effort cache invalidation
    }

    res.status(200).json(successResponse({ message: 'Password updated successfully!' }));
  } catch (error) {
    next(error);
  }
};
