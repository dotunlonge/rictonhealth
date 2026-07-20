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
  BookAppointmentInputSchema,
} from '@ricton/shared';
import { rateLimit } from '@ricton/shared';

const router = Router();

const appointmentRateLimit = rateLimit({ windowMs: 60 * 1000, max: 10, keyPrefix: 'appointment' });

// All routes require authentication
router.use(requireAuth);

// Provider sets availability
router.post(
  '/availability',
  requireRole('CONSULTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'),
  validateRequest(BookAppointmentInputSchema),
  appointmentController.getAvailability
);

// Get available slots
router.get(
  '/slots/:providerId',
  validateQuery(GetAvailabilityQuerySchema),
  appointmentController.getAvailability
);

// Book appointment
router.post(
  '/',
  appointmentRateLimit,
  validateRequest(CreateAppointmentSchema),
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
