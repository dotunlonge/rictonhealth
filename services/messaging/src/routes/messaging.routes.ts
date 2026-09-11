import { Router } from 'express';
import { requireAuth } from '@ricton/auth-middleware';
import { idempotency, rateLimit } from '@ricton/shared';
import { prisma } from '@ricton/db';
import {
  listConversations,
  getConversationMessages,
  sendMessage,
  markAsRead,
  createConversation,
} from '../controllers/messaging.controller';

const router = Router();

const messagingRateLimit = rateLimit({ windowMs: 60 * 1000, max: 20, keyPrefix: 'messaging' });

router.use(requireAuth);
router.use(messagingRateLimit);

// Conversations & Threads list
router.get('/conversations', listConversations);
router.get('/threads', listConversations);

// Create conversation / thread
router.post('/conversations', createConversation);
router.post('/threads', createConversation);

// Get conversation messages
router.get('/conversations/:id', getConversationMessages);
router.get('/threads/:id', getConversationMessages);

// Send message (accepts body or content; idempotent on retry)
router.post('/conversations/:id/messages', idempotency(prisma), sendMessage);
router.post('/threads/:id/messages', idempotency(prisma), sendMessage);

// Mark read
router.patch('/conversations/:id/read', markAsRead);
router.patch('/threads/:id/read', markAsRead);

export default router;
