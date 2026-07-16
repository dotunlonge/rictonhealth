import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError, redis } from '@ricton/shared';
import { UserRole, UserStatus } from '@ricton/db';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is missing.');
}

export interface JwtPayload {
  userId: string;
  role: UserRole;
  status: UserStatus;
  iss: string;
  iat?: number;
  exp?: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  // If request comes through Kong and Kong handles JWT validation, Kong will set specific headers.
  // We can either rely on Kong or do a local check. For safety, we verify here as well or read Kong headers.
  // For MVP, we check the Authorization header directly here.
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid Authorization header'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    if (decoded.iss !== 'ricton-issuer') {
      return next(new UnauthorizedError('Invalid issuer'));
    }

    // 1. Check if token is explicitly blacklisted (e.g. from logout)
    const isBlacklisted = await redis.get(`blacklist:token:${token}`);
    if (isBlacklisted) {
      return next(new UnauthorizedError('Token has been revoked'));
    }

    // 2. Check for live user status override (for instant suspension)
    const liveStatus = await redis.get(`user:status:${decoded.userId}`);
    if (liveStatus === UserStatus.SUSPENDED || liveStatus === UserStatus.DEACTIVATED) {
      return next(new ForbiddenError('Account is suspended or deactivated'));
    }

    // 3. Fallback to token payload status if no live status override exists
    if (
      !liveStatus &&
      (decoded.status === UserStatus.SUSPENDED || decoded.status === UserStatus.DEACTIVATED)
    ) {
      return next(new ForbiddenError('Account is suspended or deactivated'));
    }

    req.user = decoded;
    next();
  } catch (err) {
    next(new UnauthorizedError('Invalid or expired token'));
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to perform this action'));
    }

    next();
  };
};
