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
  redis,
  hashOtp,
  verifyOtp,
} from '@ricton/shared';
import twilio from 'twilio';
import sgMail from '@sendgrid/mail';
import { OAuth2Client } from 'google-auth-library';
import appleSigninAuth from 'apple-signin-auth';

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

const generateTokens = async (user: { id: string; role: string; status: string }) => {
  const token = jwt.sign(
    { userId: user.id, role: user.role, status: user.status, iss: 'ricton-issuer' },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: '7d' });

  const refreshKey = `refresh:${user.id}`;
  await redis.sadd(refreshKey, refreshToken);
  await redis.expire(refreshKey, 7 * 24 * 60 * 60); // 7 days

  return { token, refreshToken };
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, phone, password, role, firstName, lastName } = req.body;

    if (!email && !phone) {
      throw new ValidationError('Email or phone is required');
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
      },
    });

    if (existingUser) {
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

    res.status(201).json(successResponse({ id: user.id, role: user.role, status: user.status }));
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, phone, password } = req.body;

    if (!email && !phone) throw new ValidationError('Email or phone is required');

    const user = await prisma.user.findFirst({
      where: {
        OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
      },
    });

    if (!user || !user.passwordHash) throw new UnauthorizedError('Invalid credentials');

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) throw new UnauthorizedError('Invalid credentials');

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DEACTIVATED) {
      throw new UnauthorizedError('Account is disabled');
    }

    const { token, refreshToken } = await generateTokens(user);

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
        throw new Error(
          'Twilio is not configured. Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER'
        );
      }
      await twilioClient.messages.create({
        body: `Your Ricton Health verification code is: ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
    } else if (email) {
      if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
        throw new Error(
          'SendGrid is not configured. Missing SENDGRID_API_KEY or SENDGRID_FROM_EMAIL'
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

    const { token, refreshToken } = await generateTokens(user);

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

    if (!googleClient) throw new Error('Google OAuth is not configured.');

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

    const { token: jwtToken, refreshToken } = await generateTokens(user);

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

    const { token: jwtToken, refreshToken } = await generateTokens(user);

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

    const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as { userId: string };

    const isMember = await redis.sismember(`refresh:${decoded.userId}`, refreshToken);
    if (!isMember) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Rotate refresh token: remove old one before issuing new one
    await redis.srem(`refresh:${decoded.userId}`, refreshToken);

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) throw new NotFoundError('User not found');
    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DEACTIVATED) {
      throw new UnauthorizedError('Account is disabled');
    }

    const tokens = await generateTokens(user);

    res.status(200).json(successResponse(tokens));
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
    await redis.srem(`refresh:${decoded.userId}`, refreshToken);

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

    res.status(200).json(successResponse({ message: 'Logged out successfully' }));
  } catch (error) {
    if (error instanceof ValidationError) return next(error);
    next(new UnauthorizedError('Invalid refresh token'));
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
      throw new UnauthorizedError('Invalid or expired OTP');
    }

    const parsedData = JSON.parse(storedData);

    if (!verifyOtp(parsedData.hash, otp)) {
      parsedData.attempts += 1;
      if (parsedData.attempts >= 3) {
        await redis.del(`reset:${key}`);
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

    const updateResult = await prisma.user.updateMany({
      where: { OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])] },
      data: { passwordHash },
    });

    if (updateResult.count === 0) {
      throw new NotFoundError('User not found');
    }

    await redis.del(`reset:${key}`);

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
        throw new Error(
          'Twilio is not configured. Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER'
        );
      }
      await twilioClient.messages.create({
        body: `Your Ricton Health verification code is: ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: value,
      });
    } else {
      if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
        throw new Error(
          'SendGrid is not configured. Missing SENDGRID_API_KEY or SENDGRID_FROM_EMAIL'
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
