import { Router } from 'express';
import * as smartguardController from '../controllers/smartguard.controller';
import { requireAuth, requireRole } from '@ricton/auth-middleware';

const router = Router();

router.use(requireAuth);
// Security-operations surface: platform admins only.
router.use(requireRole('SUPER_ADMIN'));

router.get('/status', smartguardController.getStatus);
router.get('/alerts', smartguardController.getAlerts);
router.post('/alerts/:id/acknowledge', smartguardController.acknowledgeAlert);
router.get('/metrics', smartguardController.getMetrics);
router.get('/threats', smartguardController.getThreats);
router.post('/threats/:id/mitigate', smartguardController.mitigateThreat);
router.get('/audit-log', smartguardController.getAuditLog);

export default router;
