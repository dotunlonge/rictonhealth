import { Router } from 'express';
import { requireAuth } from '@ricton/auth-middleware';
import * as addressController from '../controllers/address.controller';

const router = Router();

// All address routes require authentication
router.use(requireAuth);

/**
 * @openapi
 * /api/addresses:
 *   get:
 *     summary: List all addresses for current user
 *     tags:
 *       - Addresses
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user addresses
 */
router.get('/', addressController.getAddresses);

/**
 * @openapi
 * /api/addresses:
 *   post:
 *     summary: Create a new address
 *     tags:
 *       - Addresses
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - addressLine1
 *               - city
 *               - state
 *             properties:
 *               addressLine1:
 *                 type: string
 *               addressLine2:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               country:
 *                 type: string
 *                 default: Nigeria
 *               postalCode:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Address created successfully
 */
router.post('/', addressController.createAddress);

/**
 * @openapi
 * /api/addresses/validate:
 *   post:
 *     summary: Validate address format
 *     tags:
 *       - Addresses
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               addressLine1:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               country:
 *                 type: string
 *               postalCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Validation result
 */
router.post('/validate', addressController.validateAddress);

/**
 * @openapi
 * /api/addresses/{id}:
 *   get:
 *     summary: Get address by ID
 *     tags:
 *       - Addresses
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Address details
 */
router.get('/:id', addressController.getAddressById);

/**
 * @openapi
 * /api/addresses/{id}:
 *   put:
 *     summary: Update address
 *     tags:
 *       - Addresses
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               addressLine1:
 *                 type: string
 *               addressLine2:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               country:
 *                 type: string
 *               postalCode:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Address updated successfully
 */
router.put('/:id', addressController.updateAddress);

/**
 * @openapi
 * /api/addresses/{id}:
 *   delete:
 *     summary: Delete address
 *     tags:
 *       - Addresses
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Address deleted successfully
 */
router.delete('/:id', addressController.deleteAddress);

/**
 * @openapi
 * /api/addresses/{id}/set-default:
 *   patch:
 *     summary: Set address as default
 *     tags:
 *       - Addresses
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Address set as default
 */
router.patch('/:id/set-default', addressController.setDefaultAddress);

export default router;
