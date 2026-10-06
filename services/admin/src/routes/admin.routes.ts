import { Router } from 'express';
import { requireAuth, requireRole, requireActiveStatus } from '@ricton/auth-middleware';
import * as adminController from '../controllers/admin.controller';

const router = Router();

// All admin routes require authentication AND active status
// (a PENDING privileged token must never be accepted here).
router.use(requireAuth);

// #127/#149 Staffing: hospital doctors attach/detach. HOSPITAL_ADMIN is
// scoped to their own hospital inside the controller; SUPER_ADMIN is global.
router.post(
  '/hospitals/doctors',
  requireRole('HOSPITAL_ADMIN', 'SUPER_ADMIN'),
  requireActiveStatus,
  adminController.attachDoctor
);
router.delete(
  '/hospitals/doctors/:id',
  requireRole('HOSPITAL_ADMIN', 'SUPER_ADMIN'),
  requireActiveStatus,
  adminController.detachDoctor
);

// #C3 Disputes: user-facing ticket filing (any authenticated ACTIVE user;
// placed before the SUPER_ADMIN gate below).
router.post('/support/tickets', requireActiveStatus, adminController.createTicket);
router.get('/support/tickets', adminController.listMyTickets);

// Everything below remains SUPER_ADMIN-only.
router.use(requireRole('SUPER_ADMIN'));
router.use(requireActiveStatus);

// User Management
router.get('/users', adminController.listUsers);
router.post('/users', adminController.provisionUser);
router.get('/users/:id', adminController.getUserById);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.post('/users/:id/verify', adminController.verifyUser);

// Provider Verification
router.get('/providers/pending', adminController.getPendingProviders);
router.post('/providers/:id/verify', adminController.verifyProvider);

// Hospital Management
router.get('/hospitals', adminController.listHospitals);
router.post('/hospitals', adminController.createHospital);
// #150/#151 Quarantine queue (must precede /hospitals/:id or "pending" matches :id)
router.get('/hospitals/pending', adminController.getPendingHospitals);
router.post('/hospitals/:id/verify', adminController.verifyHospital);
router.get('/hospitals/:id', adminController.getHospitalById);
router.put('/hospitals/:id', adminController.updateHospital);

// Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);

// #C3 Disputes: SUPER_ADMIN triage queue + resolve.
router.get('/support/tickets/all', adminController.listAllTickets);
router.patch('/support/tickets/:id', adminController.resolveTicket);

// Analytics
router.get('/analytics', adminController.getAnalytics);

export default router;
