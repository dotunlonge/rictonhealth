import { Router } from 'express';
import { requireAuth, requireRole } from '@ricton/auth-middleware';
import * as userController from '../controllers/user.controller';
import {
  validateRequest,
  validateQuery,
  UpdateProfileInputSchema,
  AvatarUploadInputSchema,
  MedicalHistoryInputSchema,
  GetProvidersQuerySchema,
} from '@ricton/shared';

const router = Router();

// All user routes require authentication
router.use(requireAuth);

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

// Provider search is public
router.get('/providers', validateQuery(GetProvidersQuerySchema), userController.getProviders);
router.get('/providers/:id', userController.getProviderById);

// Dashboards require specific roles
router.get(
  '/dashboard/hospital',
  requireRole('HOSPITAL_ADMIN', 'SUPER_ADMIN'),
  userController.getHospitalDashboard
);
router.get('/dashboard/provider', requireRole('CONSULTANT'), userController.getProviderDashboard);

export default router;
