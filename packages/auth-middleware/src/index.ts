import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError, redis } from '@ricton/shared';
import { prisma, UserRole, UserStatus } from '@ricton/db';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is missing.');
  }
  return secret;
}

export interface JwtPayload {
  userId: string;
  role: UserRole;
  status: UserStatus;
  iss: string;
  tokenVersion?: number;
  jti?: string;
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
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;

    if (decoded.iss !== 'ricton-issuer') {
      return next(new UnauthorizedError('Invalid issuer'));
    }

    // 1. Check if token is explicitly blacklisted (e.g. from logout).
    // Best-effort: a cache outage must not lock users out; revocation is
    // still enforced authoritatively via tokenVersion below.
    let isBlacklisted: string | null = null;
    try {
      isBlacklisted = await redis.get(`blacklist:token:${token}`);
    } catch {
      // Fall through to authoritative checks.
    }
    if (isBlacklisted) {
      return next(new UnauthorizedError('Token has been revoked'));
    }

    // 2. Check for live user status override (for instant suspension).
    let liveStatus: string | null = null;
    try {
      liveStatus = await redis.get(`user:status:${decoded.userId}`);
    } catch {
      // Fall through to the token payload status check below.
    }
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

    // 4. Enforce tokenVersion revocation (password reset / logout-all / reuse detection).
    // Tokens issued before a version bump must be rejected. Cache-aside: the
    // database is authoritative, so cache outages fall back to a DB read and
    // never lock users out on their own.
    if (typeof decoded.tokenVersion === 'number') {
      let cachedVersion: number | null = null;
      try {
        const raw = await redis.get(`user:tokenVersion:${decoded.userId}`);
        if (raw !== null && raw !== undefined && !Number.isNaN(Number(raw))) {
          cachedVersion = Number(raw);
        }
      } catch {
        // Cache unreadable — fall through to the authoritative DB check.
      }
      if (cachedVersion !== null) {
        if (decoded.tokenVersion !== cachedVersion) {
          return next(new UnauthorizedError('Token has been revoked. Please log in again.'));
        }
      } else {
        let user;
        try {
          user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { tokenVersion: true, status: true },
          });
        } catch {
          return next(new UnauthorizedError('Unable to verify token revocation status'));
        }
        if (!user) {
          return next(new UnauthorizedError('User no longer exists'));
        }
        if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DEACTIVATED) {
          return next(new ForbiddenError('Account is suspended or deactivated'));
        }
        if (decoded.tokenVersion !== user.tokenVersion) {
          return next(new UnauthorizedError('Token has been revoked. Please log in again.'));
        }
        try {
          // Cache briefly to avoid DB hit on every request; invalidated on bump paths.
          await redis.set(
            `user:tokenVersion:${decoded.userId}`,
            String(user.tokenVersion),
            'EX',
            60
          );
        } catch {
          // Best-effort cache write; the request is already authorized.
        }
      }
    }

    req.user = decoded;
    next();
  } catch (err) {
    next(new UnauthorizedError('Invalid or expired token'));
  }
};

export const requireRole = (...roles: UserRole[]) => {
  // #43 stale-role hardening: JWT role is trusted for at most 15m (access-token
  // lifetime), but requireRole rechecks the authoritative role on every guarded
  // route. Cache-aside on redis `user:role:{id}` (60s TTL); DB is authoritative.
  // Best-effort: Redis/DB outage falls back to the verified token role so a
  // cache/DB blip does not lock users out (revocation still enforced above).
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    let effectiveRole: UserRole = req.user.role;
    try {
      let freshRole: string | null = null;
      try {
        freshRole = await redis.get(`user:role:${req.user.userId}`);
      } catch {
        freshRole = null;
      }
      if (!freshRole) {
        const user = await prisma.user.findUnique({
          where: { id: req.user.userId },
          select: { role: true },
        });
        if (!user) {
          return next(new UnauthorizedError('User no longer exists'));
        }
        freshRole = user.role;
        try {
          await redis.set(`user:role:${req.user.userId}`, freshRole, 'EX', 60);
        } catch {
          // Best-effort cache write.
        }
      }
      effectiveRole = freshRole as UserRole;
      if (freshRole !== req.user.role) {
        return next(new ForbiddenError('Role changed. Please log in again.'));
      }
    } catch {
      // DB unreachable after cache miss — fall back to the verified token role.
      effectiveRole = req.user.role;
    }

    if (!roles.includes(effectiveRole)) {
      return next(new ForbiddenError('You do not have permission to perform this action'));
    }

    next();
  };
};

/**
 * Defense-in-depth for privileged surfaces (e.g. platform admin): even a
 * correctly-signed token is rejected unless the account is ACTIVE. This closes
 * the "PENDING token accepted by the admin service" class even if a privileged
 * row ever exists in PENDING state.
 */
export const requireActiveStatus = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }
  if (req.user.status !== UserStatus.ACTIVE) {
    return next(new ForbiddenError('Account must be active to access this resource'));
  }
  next();
};

/**
 * Optional authentication: if a valid Bearer token is provided, populates req.user.
 * If no token or an invalid token is provided, proceeds anonymously without error.
 */
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
    if (decoded && decoded.iss === 'ricton-issuer') {
      req.user = decoded;
    }
  } catch {
    // Non-blocking fallback for optional auth
  }
  next();
};
