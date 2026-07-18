import { Router } from 'express';
import { requireAuth } from '@ricton/auth-middleware';
import * as controller from '../controllers/telemedicine.controller';

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /api/telemedicine/rooms:
 *   post:
 *     summary: Initialize a telemedicine video room
 *     tags:
 *       - Telemedicine
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               appointmentId:
 *                 type: string
 *                 format: uuid
 *               roomType:
 *                 type: string
 *                 enum: [ONE_ON_ONE, MDT]
 *     responses:
 *       201:
 *         description: Telemedicine room initialized
 *       400:
 *         description: Bad Request
 */
router.post('/rooms', controller.createRoom);

/**
 * @openapi
 * /api/telemedicine/rooms/{id}/token:
 *   post:
 *     summary: Retrieve Twilio Video participant join token
 *     tags:
 *       - Telemedicine
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Token successfully generated
 *       403:
 *         description: Forbidden
 */
router.post('/rooms/:id/token', controller.getRoomToken);

/**
 * @openapi
 * /api/telemedicine/rooms/{id}/end:
 *   post:
 *     summary: End telemedicine consultation room sessions
 *     tags:
 *       - Telemedicine
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Room session ended
 */
router.post('/rooms/:id/end', controller.endRoom);

export default router;
