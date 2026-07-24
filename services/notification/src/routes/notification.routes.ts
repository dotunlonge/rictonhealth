import { Router } from 'express';
import { requireAuth, requireRole } from '@ricton/auth-middleware';
import { rateLimit } from '@ricton/shared';
import * as notificationController from '../controllers/notification.controller';

const router = Router();

const notificationRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyPrefix: 'notification',
});

// All notification routes require authentication
router.use(requireAuth);
router.use(notificationRateLimit);

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     summary: List notifications for current user
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: isRead
 *         in: query
 *         schema:
 *           type: boolean
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *       - name: offset
 *         in: query
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of notifications
 */
router.get('/', notificationController.getNotifications);

/**
 * @openapi
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count
 */
router.get('/unread-count', notificationController.getUnreadCount);

/**
 * @openapi
 * /api/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.patch('/read-all', notificationController.markAllAsRead);

/**
 * @openapi
 * /api/notifications/preferences:
 *   get:
 *     summary: Get notification preferences
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification preferences
 */
router.get('/preferences', notificationController.getPreferences);

/**
 * @openapi
 * /api/notifications/preferences:
 *   put:
 *     summary: Update notification preferences
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailEnabled:
 *                 type: boolean
 *               smsEnabled:
 *                 type: boolean
 *               pushEnabled:
 *                 type: boolean
 *               quietHoursStart:
 *                 type: string
 *               quietHoursEnd:
 *                 type: string
 *     responses:
 *       200:
 *         description: Preferences updated
 */
router.put('/preferences', notificationController.updatePreferences);

/**
 * @openapi
 * /api/notifications/push-token:
 *   post:
 *     summary: Register push notification token
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *               platform:
 *                 type: string
 *                 enum: [ios, android, web]
 *     responses:
 *       200:
 *         description: Token registered
 */
router.post('/push-token', notificationController.registerPushToken);

/**
 * @openapi
 * /api/notifications/{id}:
 *   get:
 *     summary: Get notification by ID
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Notification details
 */
router.get('/:id', notificationController.getNotificationById);

/**
 * @openapi
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
router.patch('/:id/read', notificationController.markAsRead);

/**
 * @openapi
 * /api/notifications/{id}:
 *   delete:
 *     summary: Delete notification
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Notification deleted
 */
router.delete('/:id', notificationController.deleteNotification);

// Admin-only endpoints
router.use(requireRole('SUPER_ADMIN'));

/**
 * @openapi
 * /api/notifications/test:
 *   post:
 *     summary: Send test notification (Admin only)
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - type
 *               - title
 *               - body
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               type:
 *                 type: string
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               channel:
 *                 type: string
 *                 enum: [IN_APP, SMS, EMAIL, PUSH]
 *     responses:
 *       201:
 *         description: Test notification sent
 */
router.post('/test', notificationController.sendTestNotification);

export default router;
