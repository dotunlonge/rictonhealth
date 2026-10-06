import { Router } from 'express';
import { requireAuth, requireActiveStatus } from '@ricton/auth-middleware';
import { rateLimit } from '@ricton/shared';
import { idempotency } from '@ricton/shared';
import { prisma } from '@ricton/db';
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

router.use(requireAuth, requireActiveStatus);
router.use(paymentRateLimit);

router.get('/banks', paymentController.getBanks);
router.get('/bank/resolve', paymentController.resolveAccount);

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
router.post('/initialize', idempotency(prisma), paymentController.initializePayment);

router.post(
  '/appointments/:appointmentId/wallet',
  idempotency(prisma),
  paymentController.payAppointmentWithWallet
);

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

router.post('/:id/refund', idempotency(prisma), paymentController.refundPayment);

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
