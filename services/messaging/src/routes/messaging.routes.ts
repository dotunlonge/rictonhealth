import { Router } from 'express';
import { authenticate } from '@ricton/auth-middleware';
import {
  listConversations,
  getConversationMessages,
  sendMessage,
  markAsRead,
  createConversation,
} from '../controllers/messaging.controller';

const router = Router();

// All messaging routes require authentication
router.use(authenticate);

/**
 * @openapi
 * /api/messages/conversations:
 *   get:
 *     summary: List user's conversations
 *     tags: [Messaging]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
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
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
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
