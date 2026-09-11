import { Router } from 'express';
import { requireAuth } from '@ricton/auth-middleware';
import * as controller from '../controllers/telemedicine.controller';

const router = Router();

// Provider-signed status callbacks carry no JWT (Twilio cannot); the handler
// validates X-Twilio-Signature instead. Must precede the auth gate.
router.post('/callbacks/status', controller.handleStatusCallback);

router.use(requireAuth);

// List telemedicine rooms/meetings
router.get('/rooms', controller.listRooms);
router.get('/meetings', controller.listRooms);

// Create telemedicine room/meeting
router.post('/rooms', controller.createRoom);
router.post('/meetings', controller.createRoom);

// Get token
router.post('/rooms/:id/token', controller.getRoomToken);
router.post('/meetings/:id/token', controller.getRoomToken);

// Confirm lifecycle only after the browser/device RTC connection succeeds.
/**
 * @openapi
 * /api/telemedicine/rooms/{id}/join:
 *   post:
 *     summary: Confirm that the authenticated participant joined a room
 *     tags: [Telemedicine]
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
 *         description: Participant lifecycle updated
 */
router.post('/rooms/:id/join', controller.joinRoom);

/**
 * @openapi
 * /api/telemedicine/meetings/{id}/join:
 *   post:
 *     summary: Confirm that the authenticated participant joined a meeting
 *     tags: [Telemedicine]
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
 *         description: Participant lifecycle updated
 */
router.post('/meetings/:id/join', controller.joinRoom);

// End room session (host/provider/admin only — ends for everyone)
router.post('/rooms/:id/end', controller.endRoom);
router.post('/meetings/:id/end', controller.endRoom);

// Leave room session (any member — marks only the caller departed)
router.post('/rooms/:id/leave', controller.leaveRoom);
router.post('/meetings/:id/leave', controller.leaveRoom);

// Get participants
router.get('/rooms/:id/participants', controller.getParticipants);
router.get('/meetings/:id/participants', controller.getParticipants);

export default router;
