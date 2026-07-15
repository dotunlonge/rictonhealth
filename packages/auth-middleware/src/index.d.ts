import { Request, Response, NextFunction } from 'express';
import { UserRole, UserStatus } from '@ricton/db';
export interface JwtPayload {
  userId: string;
  role: UserRole;
  status: UserStatus;
  iat?: number;
  exp?: number;
}
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
export declare const requireAuth: (
  req: Request,
  _res: Response,
  next: NextFunction
) => Promise<void>;
export declare const requireRole: (
  ...roles: UserRole[]
) => (req: Request, _res: Response, next: NextFunction) => void;
