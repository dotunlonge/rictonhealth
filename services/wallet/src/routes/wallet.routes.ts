import { Router } from 'express';
import { requireAuth, requireActiveStatus } from '@ricton/auth-middleware';
import { idempotency, rateLimit } from '@ricton/shared';
import { prisma } from '@ricton/db';
import * as walletController from '../controllers/wallet.controller';

const router = Router();

const withdrawRateLimit = rateLimit({ windowMs: 60 * 1000, max: 5, keyPrefix: 'withdraw' });
// Top-up mints Paystack transactions (provider cost per call); virtual-account
// creation provisions bank rails. Both are idempotent but must be throttled.
const topupRateLimit = rateLimit({ windowMs: 60 * 1000, max: 10, keyPrefix: 'topup' });
const dvaRateLimit = rateLimit({ windowMs: 60 * 1000, max: 5, keyPrefix: 'dva' });

/**
 * @openapi
 * /api/wallets/webhook:
 *   post:
 *     summary: Handle Paystack Nuban DVA wallet topup webhooks
 *     tags:
 *       - Wallets
 *     responses:
 *       200:
 *         description: Webhook received and processed
 *       401:
 *         description: Invalid signature
 */
router.post('/webhook', walletController.paystackWebhook);

// All other wallet routes require authentication + active status (webhook above stays public/signature-based)
router.use(requireAuth, requireActiveStatus);

/**
 * @openapi
 * /api/wallets/me:
 *   get:
 *     summary: Get current logged-in user's wallet
 *     tags:
 *       - Wallets
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet details and balance
 */
router.get('/me', walletController.getMyWallet);

/**
 * @openapi
 * /api/wallets/virtual-account:
 *   post:
 *     summary: Create a dedicated virtual account for the user's wallet
 *     tags:
 *       - Wallets
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Virtual account created or retrieved
 */
router.post(
  '/virtual-account',
  requireActiveStatus,
  dvaRateLimit,
  idempotency(prisma),
  walletController.createVirtualAccount
);

/**
 * @openapi
 * /api/wallets/topup:
 *   post:
 *     summary: Top-up wallet via Paystack payment
 *     tags:
 *       - Wallets
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 100
 *     responses:
 *       200:
 *         description: Payment URL for wallet top-up
 */
router.post(
  '/topup',
  requireActiveStatus,
  topupRateLimit,
  idempotency(prisma),
  walletController.topupWallet
);

/**
 * @openapi
 * /api/wallets/withdraw:
 *   post:
 *     summary: Withdraw wallet funds to a verified bank account
 *     tags:
 *       - Wallets
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - bankCode
 *               - accountNumber
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 100
 *               bankCode:
 *                 type: string
 *               accountNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transfer initiated (debited, provider reference returned)
 */
router.post(
  '/withdraw',
  requireActiveStatus,
  withdrawRateLimit,
  idempotency(prisma),
  walletController.withdrawToBank
);

/**
 * @openapi
 * /api/wallets/transactions:
 *   get:
 *     summary: Get wallet transaction history
 *     tags:
 *       - Wallets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [CREDIT, DEBIT]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Transaction history
 */
router.get('/transactions', walletController.getTransactions);

export default router;
