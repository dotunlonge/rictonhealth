import { Router } from 'express';
import { requireAuth, requireRole } from '@ricton/auth-middleware';
import { idempotency, rateLimit } from '@ricton/shared';
import { prisma } from '@ricton/db';
import * as pharmacyController from '../controllers/pharmacy.controller';

const router = Router();

const pharmacyRateLimit = rateLimit({ windowMs: 60 * 1000, max: 20, keyPrefix: 'pharmacy' });

// Public endpoints (no auth required for browsing)
/**
 * @openapi
 * /api/pharmacy/products:
 *   get:
 *     summary: List pharmacy products with optional filtering
 *     tags:
 *       - Pharmacy
 *     parameters:
 *       - name: category
 *         in: query
 *         schema:
 *           type: string
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *       - name: offset
 *         in: query
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of products
 */
router.get('/products', pharmacyController.getProducts);

/**
 * @openapi
 * /api/pharmacy/products/:id:
 *   get:
 *     summary: Get product by ID
 *     tags:
 *       - Pharmacy
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 */
router.get('/products/:id', pharmacyController.getProductById);

/**
 * @openapi
 * /api/pharmacy/categories:
 *   get:
 *     summary: Get product categories
 *     tags:
 *       - Pharmacy
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/categories', pharmacyController.getCategories);

/**
 * @openapi
 * /api/pharmacy/pharmacies:
 *   get:
 *     summary: List active pharmacies available for prescription assignment
 *     tags: [Pharmacy]
 *     responses:
 *       200:
 *         description: Active pharmacy directory
 */
router.get('/pharmacies', pharmacyController.getPharmacies);

// Protected endpoints
router.use(requireAuth);
router.use(pharmacyRateLimit);

/**
 * @openapi
 * /api/pharmacy/orders:
 *   get:
 *     summary: List orders for current user
 *     tags:
 *       - Pharmacy
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [PLACED, CONFIRMED, PREPARING, READY_FOR_PICKUP, OUT_FOR_DELIVERY, DELIVERED, CANCELLED]
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *       - name: offset
 *         in: query
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of orders
 */
router.get('/orders', pharmacyController.getOrders);

/**
 * @openapi
 * /api/pharmacy/orders:
 *   post:
 *     summary: Create a new pharmacy order
 *     tags:
 *       - Pharmacy
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: string
 *                       format: uuid
 *                     quantity:
 *                       type: integer
 *               deliveryType:
 *                 type: string
 *                 enum: [DELIVERY, PICKUP]
 *               deliveryAddress:
 *                 type: object
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Validation error
 */
router.post('/orders', idempotency(prisma), pharmacyController.createOrder);

/**
 * @openapi
 * /api/pharmacy/orders/:id:
 *   get:
 *     summary: Get order by ID
 *     tags:
 *       - Pharmacy
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Order details
 *       404:
 *         description: Order not found
 */
router.get('/orders/:id', pharmacyController.getOrderById);

/**
 * @openapi
 * /api/pharmacy/orders/:id/cancel:
 *   patch:
 *     summary: Cancel an order (Patient only)
 *     tags:
 *       - Pharmacy
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 */
router.patch('/orders/:id/cancel', pharmacyController.cancelOrder);

/**
 * @openapi
 * /api/pharmacy/orders/:id/reorder:
 *   post:
 *     summary: Reorder a delivered order (clone items into a new PLACED order)
 *     tags:
 *       - Pharmacy
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       201:
 *         description: Reorder created successfully
 *       404:
 *         description: Order not found
 */
router.post('/orders/:id/reorder', idempotency(prisma), pharmacyController.reorderOrder);

// #P2 NAFDAC verification (SUPER_ADMIN only). Registered before the
// PHARMACIST gate below so admins can reach it.
router.patch('/products/:id/verify', requireRole('SUPER_ADMIN'), pharmacyController.verifyProduct);
router.get(
  '/products/review/pending',
  requireRole('SUPER_ADMIN'),
  pharmacyController.getPendingProducts
);

// Pharmacist-only endpoints
router.use(requireRole('PHARMACIST'));

// Tenant-scoped management views. These deliberately differ from the public
// catalog because pharmacists must be able to see their own inactive listings.
/**
 * @openapi
 * /api/pharmacy/inventory:
 *   get:
 *     summary: List the authenticated pharmacist's inventory
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tenant-scoped inventory
 */
router.get('/inventory', pharmacyController.getInventory);

/**
 * @openapi
 * /api/pharmacy/inventory/{id}:
 *   get:
 *     summary: Get one product from the authenticated pharmacist's inventory
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Inventory product
 *       403:
 *         description: Product belongs to another pharmacy
 *       404:
 *         description: Product not found
 */
router.get('/inventory/:id', pharmacyController.getInventoryProduct);

/**
 * @openapi
 * /api/pharmacy/products:
 *   post:
 *     summary: Create a new product
 *     tags:
 *       - Pharmacy
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               category:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Product created successfully
 */
router.post('/products', pharmacyController.createProduct);

/**
 * @openapi
 * /api/pharmacy/products/:id:
 *   put:
 *     summary: Update a product
 *     tags:
 *       - Pharmacy
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               category:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Product updated successfully
 */
router.put('/products/:id', pharmacyController.updateProduct);

/**
 * @openapi
 * /api/pharmacy/products/:id:
 *   delete:
 *     summary: Delete a product (soft delete)
 *     tags:
 *       - Pharmacy
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Product deleted successfully
 */
router.delete('/products/:id', pharmacyController.deleteProduct);

/**
 * @openapi
 * /api/pharmacy/orders/:id/status:
 *   patch:
 *     summary: Update order status
 *     tags:
 *       - Pharmacy
 *     security:
 *       - bearerAuth: []
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PLACED, CONFIRMED, PREPARING, READY_FOR_PICKUP, OUT_FOR_DELIVERY, DELIVERED, CANCELLED]
 *     responses:
 *       200:
 *         description: Order status updated successfully
 */
router.patch('/orders/:id/status', pharmacyController.updateOrderStatus);

/**
 * @openapi
 * /api/pharmacy/prescriptions/fulfill:
 *   post:
 *     summary: Fulfill a prescription (create order)
 *     tags:
 *       - Pharmacy
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prescriptionId
 *             properties:
 *               prescriptionId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Prescription fulfilled successfully
 */
router.post('/prescriptions/fulfill', idempotency(prisma), pharmacyController.fulfillPrescription);

export default router;
