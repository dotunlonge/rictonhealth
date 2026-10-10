import { Router } from 'express';
import { requireAuth, requireRole, requireActiveStatus } from '@ricton/auth-middleware';
import * as appointmentController from '../controllers/appointment.controller';
import * as referralController from '../controllers/referral.controller';
import {
  validateRequest,
  validateQuery,
  CreateAppointmentSchema,
  UpdateAppointmentStatusSchema,
  RescheduleAppointmentSchema,
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

// Get available slots (mobile shape: providerId in query)
router.get(
  '/slots',
  validateQuery(GetAvailabilityQuerySchema),
  appointmentController.getAvailability
);

// Get available slots (web shape: providerId in path)
router.get(
  '/slots/:providerId',
  validateQuery(GetAvailabilityQuerySchema),
  appointmentController.getAvailability
);

// Book appointment (idempotent: mobile retries with the same Idempotency-Key)
// Restricted to verified ACTIVE patients
router.post(
  '/',
  requireRole('PATIENT'),
  requireActiveStatus,
  appointmentRateLimit,
  validateRequest(CreateAppointmentSchema),
  idempotency(prisma),
  appointmentController.createAppointment
);

// #C1 Leave: provider unavailability days (must precede /:id)
router.post(
  '/leave',
  requireRole('CONSULTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'),
  appointmentController.upsertLeave
);
router.get(
  '/leave',
  requireRole('CONSULTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'),
  appointmentController.listLeaves
);
router.delete(
  '/leave/:id',
  requireRole('CONSULTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'),
  appointmentController.deleteLeave
);

// #F2 Referrals: provider-to-provider handoff (must precede /:id)
router.post(
  '/referrals',
  requireRole('CONSULTANT'),
  requireActiveStatus,
  referralController.createReferral
);
router.get('/referrals', referralController.listReferrals);

// List appointments
router.get('/', validateQuery(GetAppointmentsQuerySchema), appointmentController.getAppointments);

// #20 Reviews: provider review list (must precede /:id or "providers" matches :id)
router.get('/providers/:id/reviews', appointmentController.getProviderReviews);

// Get appointment by ID
router.get('/:id', appointmentController.getAppointmentById);

// #20 Reviews: patient rates their own COMPLETED visit (one per visit)
router.post(
  '/:id/reviews',
  requireRole('PATIENT'),
  requireActiveStatus,
  appointmentRateLimit,
  appointmentController.createReview
);

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
  requireRole('PATIENT', 'CONSULTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'),
  idempotency(prisma),
  appointmentController.cancelAppointment
);

// Reschedule appointment (same provider, new slot; never double-books)
router.patch(
  '/:id/reschedule',
  requireRole('PATIENT', 'CONSULTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'),
  idempotency(prisma),
  validateRequest(RescheduleAppointmentSchema),
  appointmentController.rescheduleAppointment
);

export default router;
