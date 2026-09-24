import { Router } from 'express';
import { requireAuth } from '@ricton/auth-middleware';
import { rateLimit } from '@ricton/shared';
import * as controller from '../controllers/telemedicine.controller';

const router = Router();

// Admit-by-code is a bearer credential: throttle join/token issuance before
// the membership check so room codes cannot be brute-forced.
const joinRateLimit = rateLimit({ windowMs: 60 * 1000, max: 20, keyPrefix: 'telemedicine-join' });

// Provider-signed status callbacks carry no JWT (LiveKit cannot); the handler
// validates the HMAC-SHA256 Authorization signature instead. Must precede the
// auth gate. Verified against raw bytes (express.raw in index.ts).
router.post('/callbacks/status', controller.handleStatusCallback);

router.use(requireAuth);

// List telemedicine rooms/meetings
router.get('/rooms', controller.listRooms);
router.get('/meetings', controller.listRooms);

// Create telemedicine room/meeting
router.post('/rooms', controller.createRoom);
router.post('/meetings', controller.createRoom);

// Get token
router.post('/rooms/:id/token', joinRateLimit, controller.getRoomToken);
router.post('/meetings/:id/token', joinRateLimit, controller.getRoomToken);

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
router.post('/rooms/:id/join', joinRateLimit, controller.joinRoom);

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
router.post('/meetings/:id/join', joinRateLimit, controller.joinRoom);

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
