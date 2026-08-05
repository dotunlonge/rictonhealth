import { Router } from 'express';
import * as smartguardController from '../controllers/smartguard.controller';
import { requireAuth } from '@ricton/auth-middleware';

const router = Router();

router.get('/status', requireAuth, smartguardController.getStatus);
router.get('/alerts', requireAuth, smartguardController.getAlerts);
router.post('/alerts/acknowledge', requireAuth, smartguardController.acknowledgeAlert);
router.get('/metrics', requireAuth, smartguardController.getMetrics);
router.get('/threats', requireAuth, smartguardController.getThreats);
router.post('/threats/:id/mitigate', requireAuth, smartguardController.mitigateThreat);
router.get('/audit-log', requireAuth, smartguardController.getAuditLog);

export default router;
