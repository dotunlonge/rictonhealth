import { Router } from 'express';
import { requireAuth } from '@ricton/auth-middleware';
import * as controller from '../controllers/telemedicine.controller';

const router = Router();

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

// End room session
router.post('/rooms/:id/end', controller.endRoom);
router.post('/meetings/:id/end', controller.endRoom);

// Get participants
router.get('/rooms/:id/participants', controller.getParticipants);
router.get('/meetings/:id/participants', controller.getParticipants);

export default router;
