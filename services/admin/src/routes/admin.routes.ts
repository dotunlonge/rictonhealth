import { Router } from 'express';
import { requireRole } from '@ricton/auth-middleware';
import * as adminController from '../controllers/admin.controller';

const router = Router();

// All admin routes require SUPER_ADMIN role
router.use(requireRole('SUPER_ADMIN'));

// User Management
router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUserById);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.post('/users/:id/verify', adminController.verifyUser);

// Provider Verification
router.get('/providers/pending', adminController.getPendingProviders);
router.post('/providers/:id/verify', adminController.verifyProvider);

// Hospital Management
router.get('/hospitals', adminController.listHospitals);
router.post('/hospitals', adminController.createHospital);
router.get('/hospitals/:id', adminController.getHospitalById);
router.put('/hospitals/:id', adminController.updateHospital);

// Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);

// Analytics
router.get('/analytics', adminController.getAnalytics);

export default router;
