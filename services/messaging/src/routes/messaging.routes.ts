import { Router } from 'express';
import { requireAuth } from '@ricton/auth-middleware';
import { rateLimit } from '@ricton/shared';
import {
  listConversations,
  getConversationMessages,
  sendMessage,
  markAsRead,
  createConversation,
} from '../controllers/messaging.controller';

const router = Router();

const messagingRateLimit = rateLimit({ windowMs: 60 * 1000, max: 20, keyPrefix: 'messaging' });

// All messaging routes require authentication
router.use(requireAuth);
router.use(messagingRateLimit);

/**
 * @openapi
 * /api/messages/conversations:
 *   get:
 *     summary: List user's conversations
 *     tags: [Messaging]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of conversations
 */
router.get('/conversations', listConversations);

/**
 * @openapi
 * /api/messages/conversations:
 *   post:
 *     summary: Create a new conversation
 *     tags: [Messaging]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               participantIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               threadType:
 *                 type: string
 *                 enum: [DIRECT, GROUP, APPOINTMENT, MDT]
 *               title:
 *                 type: string
 *     responses:
 *       201:
 *         description: Conversation created
 */
router.post('/conversations', createConversation);

/**
 * @openapi
 * /api/messages/conversations/{id}:
 *   get:
 *     summary: Get conversation messages
 *     tags: [Messaging]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message history
 */
router.get('/conversations/:id', getConversationMessages);

/**
 * @openapi
 * /api/messages/conversations/{id}/messages:
 *   post:
 *     summary: Send a message
 *     tags: [Messaging]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               body:
 *                 type: string
 *               fileUrl:
 *                 type: string
 *               fileName:
 *                 type: string
 *               fileSize:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Message sent
 */
router.post('/conversations/:id/messages', sendMessage);

/**
 * @openapi
 * /api/messages/conversations/{id}/read:
 *   patch:
 *     summary: Mark messages as read
 *     tags: [Messaging]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               markAll:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Messages marked as read
 */
router.patch('/conversations/:id/read', markAsRead);

export default router;
