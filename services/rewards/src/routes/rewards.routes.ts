import { Router } from 'express';
import { requireAuth, requireRole } from '@ricton/auth-middleware';
import * as rewardsController from '../controllers/rewards.controller';

const router = Router();

// All rewards routes require authentication
router.use(requireAuth);

// User-facing endpoints
router.get('/balance', rewardsController.getBalance);
router.get('/earnings', rewardsController.getEarnings);
router.get('/redemptions', rewardsController.getRedemptions);
router.post('/redeem', rewardsController.redeemReward);
router.get('/catalog', rewardsController.getCatalog);
router.get('/tiers', rewardsController.getTiers);

// Internal service endpoint - requires SERVICE role for security
router.post(
  '/internal/earn',
  requireRole('SERVICE' as unknown as UserRole),
  rewardsController.earnPoints
);

export default router;
