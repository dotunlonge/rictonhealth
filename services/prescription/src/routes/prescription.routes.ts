import { Router } from 'express';
import { requireAuth } from '@ricton/auth-middleware';
import * as controller from '../controllers/prescription.controller';

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /api/prescriptions:
 *   post:
 *     summary: Create a new prescription in DRAFT status
 *     tags:
 *       - Prescriptions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - items
 *             properties:
 *               patientId:
 *                 type: string
 *                 format: uuid
 *               appointmentId:
 *                 type: string
 *                 format: uuid
 *               notes:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - drugName
 *                     - dosage
 *                     - quantity
 *                     - frequency
 *                     - duration
 *                   properties:
 *                     drugName:
 *                       type: string
 *                     dosage:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                     frequency:
 *                       type: string
 *                     duration:
 *                       type: string
 *                     instructions:
 *                       type: string
 *     responses:
 *       210:
 *         description: Prescription drafted successfully
 *       400:
 *         description: Validation error
 */
router.post('/', controller.createPrescription);

/**
 * @openapi
 * /api/prescriptions:
 *   get:
 *     summary: List patient/provider/pharmacist accessible prescriptions
 *     tags:
 *       - Prescriptions
 *     responses:
 *       200:
 *         description: List of prescriptions
 */
router.get('/', controller.listPrescriptions);

/**
 * @openapi
 * /api/prescriptions/{id}:
 *   get:
 *     summary: Get full prescription details including line items
 *     tags:
 *       - Prescriptions
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Prescription details retrieved
 *       404:
 *         description: Not Found
 */
router.get('/:id', controller.getPrescriptionById);

/**
 * @openapi
 * /api/prescriptions/{id}/sign:
 *   post:
 *     summary: Digitally sign a DRAFT prescription with clinical license check and OTP
 *     tags:
 *       - Prescriptions
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - otpCode
 *             properties:
 *               otpCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Prescription Digitally Signed
 *       401:
 *         description: Invalid signature verification OTP
 *       403:
 *         description: Unverified license forbidden
 */
router.post('/:id/sign', controller.signPrescription);

/**
 * @openapi
 * /api/prescriptions/{id}/dispense:
 *   patch:
 *     summary: Mark a prescription as dispensed by a pharmacist
 *     tags:
 *       - Prescriptions
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Prescription Dispensed
 *       400:
 *         description: Bad Request
 */
router.patch('/:id/dispense', controller.dispensePrescription);

export default router;
