import { Router } from 'express';
import { requireAuth } from '@ricton/auth-middleware';
import * as userController from '../controllers/user.controller';
import {
  validateRequest,
  UpdateProfileInputSchema,
  AvatarUploadInputSchema,
  MedicalHistoryInputSchema,
} from '@ricton/shared';

const router = Router();

// All user routes require authentication
router.use(requireAuth);

/**
 * @openapi
 * /api/users/me:
 *   get:
 *     summary: Get current logged-in user profile
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Unauthorized
 */
router.get('/me', userController.getCurrentUser);

/**
 * @openapi
 * /api/users/me:
 *   put:
 *     summary: Update current logged-in user profile
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               gender:
 *                 type: string
 *               bloodType:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
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

router.get('/providers', userController.getProviders);
router.get('/providers/:id', userController.getProviderById);

/**
 * @openapi
 * /api/users/dashboard/hospital:
 *   get:
 *     summary: Get dashboard statistics for Hospital Admin portal
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hospital Admin dashboard analytics
 *       403:
 *         description: Forbidden
 */
router.get('/dashboard/hospital', userController.getHospitalDashboard);

/**
 * @openapi
 * /api/users/dashboard/provider:
 *   get:
 *     summary: Get dashboard analytics and schedule for Consultant/Doctor portal
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Provider dashboard analytics and schedule queue
 *       403:
 *         description: Forbidden
 */
router.get('/dashboard/provider', userController.getProviderDashboard);

export default router;
