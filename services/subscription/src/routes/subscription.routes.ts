import { Router } from 'express';
import { requireAuth } from '@ricton/auth-middleware';
import * as subscriptionController from '../controllers/subscription.controller';

const router = Router();

// Webhook does not require auth, it uses signature verification
router.post('/webhook', subscriptionController.handleWebhook);

// All other subscription routes require authentication
router.use(requireAuth);

/**
 * @openapi
 * /api/subscriptions/plans:
 *   get:
 *     summary: List available subscription plans
 *     tags:
 *       - Subscriptions
 *     responses:
 *       200:
 *         description: List of subscription plans
 */
router.get('/plans', subscriptionController.getPlans);

/**
 * @openapi
 * /api/subscriptions/my:
 *   get:
 *     summary: Get current user's subscription status
 *     tags:
 *       - Subscriptions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current subscription details
 */
router.get('/my', subscriptionController.getMySubscription);

/**
 * @openapi
 * /api/subscriptions/upgrade:
 *   post:
 *     summary: Upgrade to premium subscription
 *     tags:
 *       - Subscriptions
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               plan:
 *                 type: string
 *                 enum: [PREMIUM]
 *     responses:
 *       200:
 *         description: Payment URL for subscription upgrade
 */
router.post('/upgrade', subscriptionController.upgradeSubscription);

/**
 * @openapi
 * /api/subscriptions/cancel:
 *   post:
 *     summary: Cancel current subscription
 *     tags:
 *       - Subscriptions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription cancelled
 */
router.post('/cancel', subscriptionController.cancelSubscription);

/**
 * @openapi
 * /api/subscriptions/history:
 *   get:
 *     summary: Get subscription history
 *     tags:
 *       - Subscriptions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Subscription history
 */
router.get('/history', subscriptionController.getSubscriptionHistory);

export default router;
