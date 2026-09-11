import { Router } from 'express';
import { requireAuth, requireRole } from '@ricton/auth-middleware';
import * as appointmentController from '../controllers/appointment.controller';
import {
  validateRequest,
  validateQuery,
  CreateAppointmentSchema,
  UpdateAppointmentStatusSchema,
  GetAvailabilityQuerySchema,
  GetAppointmentsQuerySchema,
  SetAvailabilityInputSchema,
} from '@ricton/shared';
import { idempotency, rateLimit } from '@ricton/shared';
import { prisma } from '@ricton/db';

const router = Router();

const appointmentRateLimit = rateLimit({ windowMs: 60 * 1000, max: 10, keyPrefix: 'appointment' });

// All routes require authentication
router.use(requireAuth);

// Provider sets availability
router.post(
  '/availability',
  requireRole('CONSULTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'),
  validateRequest(SetAvailabilityInputSchema),
  appointmentController.setAvailability
);

// Get available slots
router.get(
  '/slots/:providerId',
  validateQuery(GetAvailabilityQuerySchema),
  appointmentController.getAvailability
);

// Book appointment (idempotent: mobile retries with the same Idempotency-Key)
router.post(
  '/',
  requireRole('PATIENT'),
  appointmentRateLimit,
  validateRequest(CreateAppointmentSchema),
  idempotency(prisma),
  appointmentController.createAppointment
);

// List appointments
router.get('/', validateQuery(GetAppointmentsQuerySchema), appointmentController.getAppointments);

// Get appointment by ID
router.get('/:id', appointmentController.getAppointmentById);

// Update appointment status
router.patch(
  '/:id/status',
  requireRole('CONSULTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'),
  validateRequest(UpdateAppointmentStatusSchema),
  appointmentController.updateAppointmentStatus
);

// Cancel appointment
router.patch(
  '/:id/cancel',
  requireRole('PATIENT', 'CONSULTANT'),
  appointmentController.cancelAppointment
);

export default router;
