import { Router } from 'express';
import { requireAuth } from '@ricton/auth-middleware';
import * as walletController from '../controllers/wallet.controller';

const router = Router();

// Webhook does not require auth, it uses signature verification
router.post('/webhook', walletController.paystackWebhook);

// All other wallet routes require authentication
router.use(requireAuth);

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
router.post('/virtual-account', walletController.createVirtualAccount);

export default router;
