import { Router } from 'express';
import { requireAuth } from '@ricton/auth-middleware';
import { rateLimit } from '@ricton/shared';
import * as paymentController from '../controllers/payment.controller';

const router = Router();

const paymentRateLimit = rateLimit({ windowMs: 60 * 1000, max: 20, keyPrefix: 'payment' });

/**
 * @openapi
 * /api/payments/webhook:
 *   post:
 *     summary: Handle Paystack payment webhooks
 *     tags:
 *       - Payments
 *     responses:
 *       200:
 *         description: Webhook received and processed
 *       401:
 *         description: Invalid signature
 */
router.post('/webhook', paymentController.paystackWebhook);

// All other payment routes require authentication
router.use(requireAuth);
router.use(paymentRateLimit);

/**
 * @openapi
 * /api/payments/initialize:
 *   post:
 *     summary: Initialize a Paystack payment
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               email:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [APPOINTMENT, PHARMACY_ORDER, SUBSCRIPTION, WALLET_TOPUP]
 *     responses:
 *       200:
 *         description: Payment initialized
 */
router.post('/initialize', paymentController.initializePayment);

/**
 * @openapi
 * /api/payments/verify/{reference}:
 *   get:
 *     summary: Verify a Paystack payment
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment verified
 */
router.get('/verify/:reference', paymentController.verifyPayment);

/**
 * @openapi
 * /api/payments:
 *   get:
 *     summary: List all payments for current user
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of payments
 */
router.get('/', paymentController.getPayments);

/**
 * @openapi
 * /api/payments/{id}:
 *   get:
 *     summary: Get a specific payment
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Payment details
 */
router.get('/:id', paymentController.getPaymentById);

export default router;
