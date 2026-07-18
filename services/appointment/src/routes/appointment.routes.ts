import { Router } from 'express';
import { requireAuth } from '@ricton/auth-middleware';
import * as controller from '../controllers/appointment.controller';

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /api/appointments/slots:
 *   get:
 *     summary: Retrieve available schedule slots for a provider
 *     tags:
 *       - Appointments
 *     parameters:
 *       - name: providerId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: date
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of open slots
 *       400:
 *         description: Bad Request
 */
router.get('/slots', controller.getAvailableSlots);

/**
 * @openapi
 * /api/appointments:
 *   post:
 *     summary: Book a new medical appointment
 *     tags:
 *       - Appointments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - providerId
 *               - scheduledAt
 *             properties:
 *               providerId:
 *                 type: string
 *                 format: uuid
 *               hospitalId:
 *                 type: string
 *                 format: uuid
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *               type:
 *                 type: string
 *                 enum: [IN_PERSON, VIDEO]
 *               notes:
 *                 type: string
 *     responses:
 *       210:
 *         description: Appointment created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Overlapping Slot Conflict
 */
router.post('/', controller.bookAppointment);

/**
 * @openapi
 * /api/appointments:
 *   get:
 *     summary: List authenticated patient/provider appointments
 *     tags:
 *       - Appointments
 *     responses:
 *       200:
 *         description: List of appointments
 */
router.get('/', controller.listAppointments);

/**
 * @openapi
 * /api/appointments/{id}/cancel:
 *   patch:
 *     summary: Cancel a booked appointment
 *     tags:
 *       - Appointments
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Appointment Cancelled
 *       404:
 *         description: Not Found
 */
router.patch('/:id/cancel', controller.cancelAppointment);

export default router;
