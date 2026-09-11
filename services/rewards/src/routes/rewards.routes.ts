import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '@ricton/auth-middleware';
import { prisma } from '@ricton/db';
import {
  AppError,
  ForbiddenError,
  getInternalApiSecret,
  idempotency,
  internalSecretMatches,
} from '@ricton/shared';
import * as rewardsController from '../controllers/rewards.controller';

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

// Service-to-service routes authenticate independently and must precede the
// user JWT gate.
router.post('/internal/earn', requireInternalSecret, rewardsController.earnPoints);

router.use(requireAuth);
router.get('/balance', rewardsController.getBalance);
router.get('/earnings', rewardsController.getEarnings);
router.get('/redemptions', rewardsController.getRedemptions);
router.post('/redeem', idempotency(prisma), rewardsController.redeemReward);
router.post('/claim', idempotency(prisma), rewardsController.redeemReward);
router.get('/catalog', rewardsController.getCatalog);
router.get('/tiers', rewardsController.getTiers);

export default router;
