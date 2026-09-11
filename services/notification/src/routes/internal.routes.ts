import { Router, Request, Response, NextFunction } from 'express';
import {
  AppError,
  ForbiddenError,
  getInternalApiSecret,
  internalSecretMatches,
} from '@ricton/shared';
import * as internalController from '../controllers/internal.controller';

const router = Router();

const requireInternalSecret = (req: Request, _res: Response, next: NextFunction) => {
  let expectedSecret: string;
  try {
    expectedSecret = getInternalApiSecret();
  } catch (error) {
    return next(new AppError((error as Error).message, 503, 'SERVICE_NOT_CONFIGURED'));
  }
  const presented = req.headers['x-internal-secret'] || req.headers.authorization;
  if (internalSecretMatches(presented, expectedSecret)) return next();
  return next(new ForbiddenError('Forbidden: Invalid internal service credentials'));
};

router.use(requireInternalSecret);

router.post('/payment/success', internalController.handlePaymentSuccess);
router.post('/payment/failed', internalController.handlePaymentFailed);

export default router;
