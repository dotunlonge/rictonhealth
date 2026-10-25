import { Router } from 'express';
import {
  requireAuth,
  requireRole,
  requireActiveStatus,
  optionalAuth,
} from '@ricton/auth-middleware';
import { rateLimit } from '@ricton/shared';
import * as userController from '../controllers/user.controller';
import {
  validateRequest,
  validateQuery,
  UpdateProfileInputSchema,
  AvatarUploadInputSchema,
  MedicalHistoryInputSchema,
  GetProvidersQuerySchema,
  UpdatePracticeLocationSchema,
} from '@ricton/shared';

const router = Router();

const userRateLimit = rateLimit({ windowMs: 60 * 1000, max: 300, keyPrefix: 'user' });

// Provider search is public (with optional authentication)
router.get(
  '/providers',
  optionalAuth,
  validateQuery(GetProvidersQuerySchema),
  userController.getProviders
);
router.get('/providers/:id', optionalAuth, userController.getProviderById);

// All user routes below require authentication
router.use(requireAuth);
router.use(userRateLimit);

// Public within auth
router.get('/me', userController.getCurrentUser);
router.put('/me', validateRequest(UpdateProfileInputSchema), userController.updateCurrentUser);
router.put(
  '/me/avatar',
  validateRequest(AvatarUploadInputSchema),
  userController.getAvatarUploadUrl
);
router.put(
  '/me/medical-history',
  validateRequest(MedicalHistoryInputSchema),
  userController.updateMedicalHistory
);
router.put(
  '/me/practice-location',
  requireRole('CONSULTANT'),
  validateRequest(UpdatePracticeLocationSchema),
  userController.updatePracticeLocation
);
// #L1 Versioned re-consent (minimal: { version } only, validated inline).
router.put('/me/consent', userController.updateConsent);
// #L3 Erasure request (legal hold enforced in controller).
router.delete('/me', userController.requestErasure);

// PHI routes require clinical roles. PATIENT self-access is enforced inside the controller.
router.get(
  '/patients',
  requireRole('CONSULTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'),
  userController.getPatients
);
// Route gate mirrors the controller: PATIENT (self only), CONSULTANT
// (relationship), HOSPITAL_ADMIN (same hospital), SUPER_ADMIN. PHARMACIST
// has no clinical-record access. Controller checks stay as defense-in-depth.
router.get(
  '/patients/:id',
  requireRole('PATIENT', 'CONSULTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'),
  requireActiveStatus,
  userController.getPatientById
);

router.get(
  '/dashboard/hospital',
  requireRole('HOSPITAL_ADMIN'),
  userController.getHospitalDashboard
);
router.get('/dashboard/provider', requireRole('CONSULTANT'), userController.getProviderDashboard);
router.get('/dashboard/patient', requireRole('PATIENT'), userController.getPatientDashboard);

export default router;
