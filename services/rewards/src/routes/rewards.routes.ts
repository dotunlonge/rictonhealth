import { Router } from 'express';
import { authenticate, requireRole } from '@ricton/shared';
import * as rewardsController from '../controllers/rewards.controller';

const router = Router();

// All rewards routes require authentication
router.use(authenticate);

// User-facing endpoints
router.get('/balance', rewardsController.getBalance);
router.get('/earnings', rewardsController.getEarnings);
router.get('/redemptions', rewardsController.getRedemptions);
router.post('/redeem', rewardsController.redeemReward);
router.get('/catalog', rewardsController.getCatalog);
router.get('/tiers', rewardsController.getTiers);

// Internal service endpoint (should have additional service-to-service auth in production)
router.post('/internal/earn', rewardsController.earnPoints);

export default router;
