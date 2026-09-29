import { Request, Response, NextFunction } from 'express';
import {
  prisma,
  UserRole,
  UserStatus,
  OrderStatus,
  DeliveryType,
  PaymentStatus,
  PrescriptionStatus,
  Prisma,
  TransactionClient,
  ensurePharmacySeeded,
} from '@ricton/db';
import { JwtPayload } from '@ricton/auth-middleware';
import {
  successResponse,
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
} from '@ricton/shared';

// #P2 NAFDAC registration format: alphanumeric, minimum 6 characters.
const NAFDAC_REG_NO_RE = /^[A-Za-z0-9]{6,}$/;
const isValidNafdacRegNo = (value: string): boolean => NAFDAC_REG_NO_RE.test(value);

/**
 * List pharmacy products with optional filtering
 */
export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensurePharmacySeeded(prisma);
    const { category, search, pharmacyId, limit = 20, offset = 0 } = req.query;
    const take = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const skip = Math.max(Number(offset) || 0, 0);

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(category && { category: String(category) }),
      ...(search && {
        OR: [
          { name: { contains: String(search), mode: 'insensitive' } },
          { description: { contains: String(search), mode: 'insensitive' } },
        ],
      }),
      ...(pharmacyId && { pharmacyId: String(pharmacyId) }),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          pharmacy: {
            select: {
              id: true,
              pharmacyProfile: { select: { pharmacyName: true } },
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    res.status(200).json(
      successResponse({
        products,
        total,
        limit: take,
        offset: skip,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get single product by ID
 */
export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        pharmacy: {
          select: {
            id: true,
            pharmacyProfile: { select: { pharmacyName: true } },
          },
        },
      },
    });

    if (!product || !product.isActive) {
      throw new NotFoundError('Product not found');
    }

    res.status(200).json(successResponse(product));
  } catch (error) {
    next(error);
  }
};

/**
 * List the authenticated pharmacist's complete inventory. Unlike the public
 * catalog, this includes inactive products so removed listings can still be
 * reviewed and managed without exposing another pharmacy's records.
 */
export const getInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { limit = 100, offset = 0 } = req.query;
    const take = Math.min(Math.max(Number(limit) || 100, 1), 50);
    const skip = Math.max(Number(offset) || 0, 0);
    const where: Prisma.ProductWhereInput = { pharmacyId: userPayload.userId };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    res.status(200).json(successResponse({ products, total, limit: take, offset: skip }));
  } catch (error) {
    next(error);
  }
};

/** Get one product only when it belongs to the authenticated pharmacist. */
export const getInventoryProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });

    if (!product) {
      throw new NotFoundError('Product not found');
    }
    if (product.pharmacyId !== userPayload.userId) {
      throw new ForbiddenError('Not authorized to view this product');
    }

    res.status(200).json(successResponse(product));
  } catch (error) {
    next(error);
  }
};

/**
 * Create product (Pharmacy only)
 */
export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;

    if (userPayload.role !== UserRole.PHARMACIST) {
      throw new ForbiddenError('Only pharmacists can create products');
    }

    // #143 Ownership gate: verified + ACTIVE pharmacy only (best-effort lookup).
    try {
      const me = await prisma.user.findUnique({
        where: { id: userPayload.userId },
        select: {
          status: true,
          pharmacyProfile: { select: { isVerified: true } },
        },
      });
      if (!me || me.status !== UserStatus.ACTIVE || !me.pharmacyProfile?.isVerified) {
        throw new ForbiddenError('Pharmacy verification required');
      }
    } catch (e) {
      if (e instanceof ForbiddenError) throw e;
    }

    const { name, description, category, price, stock, imageUrl, requiresPrescription } = req.body;
    // #P2/#P3 optional compliance fields; persisted best-effort (ignored until
    // the 20260929000001 migration + client regen land).
    const nafdacRegNo =
      typeof req.body.nafdacRegNo === 'string' && req.body.nafdacRegNo.trim() !== ''
        ? req.body.nafdacRegNo.trim()
        : null;
    const scheduleRaw = typeof req.body.schedule === 'string' ? req.body.schedule.trim() : '';
    const schedule = scheduleRaw !== '' ? scheduleRaw.toUpperCase() : null;

    // #P2 NAFDAC format validation on write.
    if (nafdacRegNo && !isValidNafdacRegNo(nafdacRegNo)) {
      throw new ValidationError('Invalid nafdacRegNo format: alphanumeric, 6+ characters');
    }

    if (!name || price === undefined || stock === undefined) {
      throw new ValidationError('Name, price, and stock are required');
    }

    if (!Number.isFinite(Number(price)) || !Number.isInteger(Number(stock))) {
      throw new ValidationError('Price must be numeric and stock must be an integer');
    }
    if (Number(price) < 0 || Number(stock) < 0) {
      throw new ValidationError('Price and stock cannot be negative');
    }

    // #P1 Expiry/batch: Product has no expiry column yet — validate here and
    // reject missing/expired dates. TODO(migration): add Product.expiryDate /
    // batchNumber columns; until then the validated date is not persisted.
    const expiryRaw = req.body.expiryDate ?? req.body.expiry;
    if (expiryRaw === undefined || expiryRaw === null || String(expiryRaw).trim() === '') {
      throw new ValidationError('expiryDate required');
    }
    const expiryDate = new Date(expiryRaw);
    if (Number.isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
      throw new ValidationError('expiryDate required');
    }

    let product;
    try {
      product = await (prisma.product.create as any)({
        data: {
          pharmacyId: userPayload.userId,
          name,
          description: description || null,
          category: category || 'General',
          price,
          stock: Number(stock),
          imageUrl: imageUrl || null,
          requiresPrescription: Boolean(requiresPrescription),
          ...(nafdacRegNo ? { nafdacRegNo } : {}),
          ...(schedule ? { schedule } : {}),
          // #P2 New listings stay inactive until SUPER_ADMIN verifies
          // (PATCH /products/:id/verify). The public catalog only serves
          // isActive products, so unverified stock cannot be ordered.
          isActive: false,
        },
      });
    } catch (e) {
      if (e instanceof Error && /nafdacRegNo|schedule|Unknown argument/i.test(e.message)) {
        product = await prisma.product.create({
          data: {
            pharmacyId: userPayload.userId,
            name,
            description: description || null,
            category: category || 'General',
            price,
            stock: Number(stock),
            imageUrl: imageUrl || null,
            requiresPrescription: Boolean(requiresPrescription),
            // #P2 see above: inactive until admin verification.
            isActive: false,
          },
        });
      } else {
        throw e;
      }
    }

    res.status(201).json(successResponse(product));
  } catch (error) {
    next(error);
  }
};

/**
 * Get product categories
 */
export const getCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.product.findMany({
      select: { category: true },
      distinct: ['category'],
    });
    res.status(200).json(successResponse(categories.map((c) => c.category).filter(Boolean)));
  } catch (error) {
    next(error);
  }
};

/** Minimal active-pharmacy directory used when a patient assigns a prescription. */
export const getPharmacies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensurePharmacySeeded(prisma);
    const requestedLimit = Number(req.query.limit) || 100;
    const take = Math.min(Math.max(requestedLimit, 1), 50);
    const pharmacies = await prisma.user.findMany({
      where: {
        role: UserRole.PHARMACIST,
        status: UserStatus.ACTIVE,
        pharmacyProfile: { isNot: null },
      },
      select: {
        id: true,
        pharmacyProfile: {
          select: { pharmacyName: true, address: true },
        },
      },
      orderBy: { createdAt: 'asc' },
      take,
    });
    res.status(200).json(successResponse(pharmacies));
  } catch (error) {
    next(error);
  }
};

/**
 * Update product (Pharmacy only)
 */
export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { id } = req.params;

    // #143 Ownership gate: verified + ACTIVE pharmacy only (best-effort lookup).
    try {
      if (userPayload.role === UserRole.PHARMACIST) {
        const me = await prisma.user.findUnique({
          where: { id: userPayload.userId },
          select: {
            status: true,
            pharmacyProfile: { select: { isVerified: true } },
          },
        });
        if (!me || me.status !== UserStatus.ACTIVE || !me.pharmacyProfile?.isVerified) {
          throw new ForbiddenError('Pharmacy verification required');
        }
      }
    } catch (e) {
      if (e instanceof ForbiddenError) throw e;
    }

    const existingProduct = await prisma.product.findUnique({ where: { id } });

    if (!existingProduct) {
      throw new NotFoundError('Product not found');
    }

    if (
      existingProduct.pharmacyId !== userPayload.userId &&
      userPayload.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenError('Not authorized to update this product');
    }

    const { name, description, category, price, stock, imageUrl, isActive, requiresPrescription } =
      req.body;
    // #P2/#P3 optional compliance updates (best-effort until client regen).
    const nafdacUpdate =
      typeof req.body.nafdacRegNo === 'string'
        ? { nafdacRegNo: req.body.nafdacRegNo.trim() || null }
        : {};
    const scheduleUpdate =
      typeof req.body.schedule === 'string'
        ? {
            schedule:
              req.body.schedule.trim() !== '' ? req.body.schedule.trim().toUpperCase() : null,
          }
        : {};

    // #P2 NAFDAC format validation on write.
    if (
      typeof req.body.nafdacRegNo === 'string' &&
      req.body.nafdacRegNo.trim() !== '' &&
      !isValidNafdacRegNo(req.body.nafdacRegNo.trim())
    ) {
      throw new ValidationError('Invalid nafdacRegNo format: alphanumeric, 6+ characters');
    }
    // #P2 Activation gate: only SUPER_ADMIN may (re)activate a listing
    // (pharmacists keep the soft-delete path via isActive:false / DELETE).
    const mayActivate = userPayload.role === UserRole.SUPER_ADMIN;
    const isActiveUpdate =
      isActive !== undefined && (mayActivate || isActive === false) ? { isActive } : {};

    if (price !== undefined && (!Number.isFinite(Number(price)) || Number(price) < 0)) {
      throw new ValidationError('Price must be a non-negative number');
    }
    if (stock !== undefined && (!Number.isInteger(Number(stock)) || Number(stock) < 0)) {
      throw new ValidationError('Stock must be a non-negative integer');
    }

    let updated;
    try {
      updated = await (prisma.product.update as any)({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(category && { category }),
          ...(price !== undefined && { price }),
          ...(stock !== undefined && { stock: Number(stock) }),
          ...(imageUrl !== undefined && { imageUrl }),
          ...isActiveUpdate,
          ...(requiresPrescription !== undefined && {
            requiresPrescription: Boolean(requiresPrescription),
          }),
          ...nafdacUpdate,
          ...scheduleUpdate,
        },
      });
    } catch (e) {
      if (e instanceof Error && /nafdacRegNo|schedule|Unknown argument/i.test(e.message)) {
        updated = await prisma.product.update({
          where: { id },
          data: {
            ...(name && { name }),
            ...(description !== undefined && { description }),
            ...(category && { category }),
            ...(price !== undefined && { price }),
            ...(stock !== undefined && { stock: Number(stock) }),
            ...(imageUrl !== undefined && { imageUrl }),
            ...isActiveUpdate,
            ...(requiresPrescription !== undefined && {
              requiresPrescription: Boolean(requiresPrescription),
            }),
          },
        });
      } else {
        throw e;
      }
    }

    res.status(200).json(successResponse(updated));
  } catch (error) {
    next(error);
  }
};

/**
 * #P2 NAFDAC verification (SUPER_ADMIN only):
 * PATCH /pharmacy/products/:id/verify { verified, nafdacRegNo }.
 * verified:true flips isActive true, but only when a valid nafdacRegNo is
 * present (existing or supplied in the same call).
 */
export const verifyProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    if (userPayload.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only admins can verify products');
    }
    const { id } = req.params;
    const { verified, nafdacRegNo } = req.body as {
      verified?: unknown;
      nafdacRegNo?: unknown;
    };

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Product not found');
    }

    let regNo: string | null =
      (existing as unknown as { nafdacRegNo?: string | null }).nafdacRegNo ?? null;
    if (nafdacRegNo !== undefined) {
      if (typeof nafdacRegNo === 'string' && nafdacRegNo.trim() !== '') {
        const clean = nafdacRegNo.trim();
        if (!isValidNafdacRegNo(clean)) {
          throw new ValidationError('Invalid nafdacRegNo format: alphanumeric, 6+ characters');
        }
        regNo = clean;
      } else if (nafdacRegNo === null) {
        regNo = null;
      } else {
        throw new ValidationError('Invalid nafdacRegNo format: alphanumeric, 6+ characters');
      }
    }

    const data: Record<string, unknown> = {};
    if (nafdacRegNo !== undefined) data.nafdacRegNo = regNo;
    if (verified === true) {
      if (!regNo) {
        throw new ValidationError('nafdacRegNo is required to verify a product');
      }
      data.isActive = true;
    } else if (verified === false) {
      data.isActive = false;
    }
    if (Object.keys(data).length === 0) {
      throw new ValidationError('Provide verified and/or nafdacRegNo');
    }

    let updated;
    try {
      updated = await (prisma.product.update as any)({ where: { id }, data });
    } catch (e) {
      if (e instanceof Error && /nafdacRegNo|Unknown argument/i.test(e.message)) {
        if (data.isActive === undefined) throw e;
        updated = await prisma.product.update({
          where: { id },
          data: { isActive: data.isActive as boolean },
        });
      } else {
        throw e;
      }
    }

    res.status(200).json(successResponse(updated));
  } catch (error) {
    next(error);
  }
};

/**
 * Delete product (Pharmacy only)
 */
export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { id } = req.params;

    const existingProduct = await prisma.product.findUnique({ where: { id } });

    if (!existingProduct) {
      throw new NotFoundError('Product not found');
    }

    if (
      existingProduct.pharmacyId !== userPayload.userId &&
      userPayload.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenError('Not authorized to delete this product');
    }

    // Soft delete by setting isActive to false
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    res.status(200).json(successResponse({ message: 'Product deleted successfully' }));
  } catch (error) {
    next(error);
  }
};

/**
 * Create order (Patient only)
 */
export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;

    if (userPayload.role !== UserRole.PATIENT) {
      throw new ForbiddenError('Only patients can create orders');
    }

    const { items, deliveryType, deliveryAddress, notes, prescriptionId } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new ValidationError('At least one item is required');
    }

    let totalAmount = 0;
    const orderItemsData: {
      drugName: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      productId: string;
    }[] = [];
    let pharmacyId: string | null = null;

    const productIds = items.map((item: { productId: string }) => item.productId).filter(Boolean);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    const requestedByProduct = new Map<string, number>();

    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        throw new ValidationError('Each item must have productId and a positive quantity');
      }

      requestedByProduct.set(
        item.productId,
        (requestedByProduct.get(item.productId) || 0) + Number(item.quantity)
      );

      const product = productMap.get(item.productId);

      if (!product || !product.isActive) {
        throw new NotFoundError(`Product ${item.productId} not found or inactive`);
      }

      if (Number(product.price) < 0 || product.stock < 0) {
        throw new ValidationError(`Invalid product data for ${product.name}`);
      }

      if (product.stock < item.quantity) {
        throw new ValidationError(`Insufficient stock for ${product.name}`);
      }

      // #P3 Controlled schedule qty cap (best-effort read until client regen).
      const sched = String((product as Record<string, unknown>).schedule ?? '').toUpperCase();
      if (sched === 'CONTROLLED' && Number(item.quantity) > 30) {
        throw new ValidationError(
          `Controlled product ${product.name} limited to 30 units per order`
        );
      }

      if (pharmacyId === null) {
        pharmacyId = product.pharmacyId;
      } else if (product.pharmacyId !== pharmacyId) {
        throw new ValidationError('All items in an order must belong to the same pharmacy');
      }

      const subtotal = Number(product.price) * item.quantity;
      totalAmount += subtotal;
      orderItemsData.push({
        drugName: product.name,
        quantity: item.quantity,
        unitPrice: Number(product.price),
        subtotal,
        productId: product.id,
      });
    }

    const prescriptionProducts = products.filter((product) => product.requiresPrescription);
    let prescription:
      | (Awaited<ReturnType<typeof prisma.prescription.findUnique>> & {
          items?: Array<{ drugName: string; quantity: number }>;
        })
      | null = null;

    if (prescriptionProducts.length > 0) {
      if (!prescriptionId) {
        throw new ValidationError('A pharmacy-assigned prescription is required for this order');
      }
      prescription = await prisma.prescription.findUnique({
        where: { id: prescriptionId },
        include: { items: true },
      });
      if (!prescription) throw new NotFoundError('Prescription not found');
      if (prescription.patientId !== userPayload.userId) {
        throw new ForbiddenError('This prescription belongs to another patient');
      }
      if (
        prescription.status !== PrescriptionStatus.SENT_TO_PHARMACY ||
        prescription.pharmacyId !== pharmacyId
      ) {
        throw new ValidationError('Prescription is not assigned to this pharmacy');
      }

      const prescribedQuantities = new Map<string, number>();
      for (const item of prescription.items || []) {
        const key = item.drugName.trim().toLocaleLowerCase();
        prescribedQuantities.set(key, (prescribedQuantities.get(key) || 0) + item.quantity);
      }
      for (const product of prescriptionProducts) {
        const prescribed = prescribedQuantities.get(product.name.trim().toLocaleLowerCase()) || 0;
        const requested = requestedByProduct.get(product.id) || 0;
        if (prescribed < requested) {
          throw new ValidationError(`${product.name} is not covered by this prescription`);
        }
      }
    } else if (prescriptionId) {
      throw new ValidationError('prescriptionId is only accepted for prescription products');
    }

    // #P4 Address: DELIVERY orders require a usable delivery address.
    const effectiveDeliveryType = (deliveryType as DeliveryType) || DeliveryType.DELIVERY;
    if (effectiveDeliveryType === DeliveryType.DELIVERY) {
      const addr = deliveryAddress as Record<string, unknown> | string | undefined;
      const line1 =
        typeof addr === 'string' ? addr : (addr?.line1 ?? addr?.street ?? addr?.address);
      const city = typeof addr === 'string' ? undefined : addr?.city;
      const phone = typeof addr === 'string' ? undefined : addr?.phone;
      if (!line1 || !city || !phone) {
        throw new ValidationError(
          'deliveryAddress with line1/city/phone is required for DELIVERY orders'
        );
      }
    }

    const order = await prisma.$transaction(
      async (tx) => {
        if (prescription) {
          const claimed = await tx.prescription.updateMany({
            where: {
              id: prescription.id,
              patientId: userPayload.userId,
              pharmacyId: pharmacyId!,
              status: PrescriptionStatus.SENT_TO_PHARMACY,
            },
            data: { status: PrescriptionStatus.DISPENSED },
          });
          if (claimed.count !== 1) {
            throw new ConflictError('Prescription was already used or changed; reload and retry');
          }
        }

        const newOrder = await tx.pharmacyOrder.create({
          data: {
            patientId: userPayload.userId,
            pharmacyId: pharmacyId!,
            status: OrderStatus.PLACED,
            deliveryType: deliveryType || DeliveryType.DELIVERY,
            deliveryAddress: deliveryAddress || null,
            notes: notes || null,
            prescriptionId: prescription?.id || null,
            totalAmount,
            items: {
              create: orderItemsData.map((d) => ({
                productId: d.productId,
                drugName: d.drugName,
                quantity: d.quantity,
                unitPrice: d.unitPrice,
                subtotal: d.subtotal,
              })),
            },
          },
          include: {
            items: true,
            pharmacy: {
              select: {
                pharmacyProfile: {
                  select: {
                    pharmacyName: true,
                  },
                },
              },
            },
          },
        });

        // Atomically reduce stock with non-negative constraint
        for (const item of orderItemsData) {
          const updated = await tx.product.updateMany({
            where: {
              id: item.productId,
              stock: { gte: item.quantity },
              isActive: true,
            },
            data: {
              stock: { decrement: item.quantity },
            },
          });

          if (updated.count === 0) {
            throw new ValidationError(`Insufficient stock for product ${item.drugName}`);
          }
        }

        return newOrder;
      },
      { timeout: 30000, maxWait: 15000 }
    );

    res.status(201).json(successResponse(order));
  } catch (error) {
    next(error);
  }
};

/**
 * List orders for current user
 */
export const getOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { status, limit = 20, offset = 0 } = req.query;
    const take = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const skip = Math.max(Number(offset) || 0, 0);

    const where: Prisma.PharmacyOrderWhereInput = {};

    if (userPayload.role === UserRole.PATIENT) {
      where.patientId = userPayload.userId;
    } else if (userPayload.role === UserRole.PHARMACIST) {
      where.pharmacyId = userPayload.userId;
    } else if (userPayload.role === UserRole.SUPER_ADMIN) {
      // Super admin sees all
    } else {
      throw new ForbiddenError('Unauthorized to view orders');
    }

    if (status) {
      where.status = status as OrderStatus;
    }

    const [orders, total] = await Promise.all([
      prisma.pharmacyOrder.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          pharmacy: {
            select: {
              pharmacyProfile: {
                select: {
                  pharmacyName: true,
                },
              },
            },
          },
          payment: true,
        },
      }),
      prisma.pharmacyOrder.count({ where }),
    ]);

    res.status(200).json(
      successResponse({
        orders,
        total,
        limit: take,
        offset: skip,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get order by ID
 */
export const getOrderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { id } = req.params;

    const order = await prisma.pharmacyOrder.findUnique({
      where: { id },
      include: {
        items: true,
        pharmacy: {
          select: {
            pharmacyProfile: {
              select: {
                pharmacyName: true,
              },
            },
          },
        },
        patient: {
          select: {
            id: true,
            email: true,
            phone: true,
            patientProfile: true,
          },
        },
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (userPayload.role === UserRole.PATIENT && order.patientId !== userPayload.userId) {
      throw new ForbiddenError('Not authorized to view this order');
    }

    if (userPayload.role === UserRole.PHARMACIST && order.pharmacyId !== userPayload.userId) {
      throw new ForbiddenError('Not authorized to view this order');
    }
    if (
      userPayload.role !== UserRole.PATIENT &&
      userPayload.role !== UserRole.PHARMACIST &&
      userPayload.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenError('Not authorized to view this order');
    }

    res.status(200).json(successResponse(order));
  } catch (error) {
    next(error);
  }
};

/**
 * Explicit order lifecycle. CANCELLED and DELIVERED are terminal; forward-only
 * otherwise (e.g. DELIVERED can never return to PLACED).
 */
const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  [OrderStatus.PLACED]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED],
  [OrderStatus.READY_FOR_PICKUP]: [
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

/** Restock every stored item productId when an order is cancelled. */
async function restockOrderItems(
  tx: TransactionClient,
  items: Array<{ productId?: string | null; quantity: number }>
) {
  for (const item of items) {
    if (!item.productId) continue;
    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
    });
  }
}

/**
 * Update order status (Pharmacist only)
 */
export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;

    if (userPayload.role !== UserRole.PHARMACIST) {
      throw new ForbiddenError('Only pharmacists can update order status');
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(OrderStatus).includes(status as OrderStatus)) {
      throw new ValidationError('Invalid status');
    }

    const next = status as OrderStatus;
    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.pharmacyOrder.findUnique({
        where: { id },
        include: { items: true, payment: true },
      });
      if (!order) throw new NotFoundError('Order not found');
      if (order.pharmacyId !== userPayload.userId) {
        throw new ForbiddenError('Not authorized to update this order');
      }
      if (!ORDER_TRANSITIONS[order.status].includes(next)) {
        throw new ValidationError(`Invalid transition from ${order.status} to ${next}`);
      }
      // #147 Payment gate: no delivery before successful payment (free orders exempt).
      if (next === OrderStatus.DELIVERED && Number(order.totalAmount) > 0) {
        if (order.payment?.status !== PaymentStatus.SUCCESS) {
          throw new ValidationError('Payment required before delivery');
        }
      }

      const claimed = await tx.pharmacyOrder.updateMany({
        where: { id, pharmacyId: userPayload.userId, status: order.status },
        data: { status: next },
      });
      if (claimed.count !== 1) {
        throw new ConflictError('Order status changed concurrently; reload and retry');
      }
      if (next === OrderStatus.CANCELLED) {
        await restockOrderItems(tx, order.items);
      }
      return tx.pharmacyOrder.findUniqueOrThrow({
        where: { id },
        include: { items: true },
      });
    });

    res.status(200).json(successResponse(updated));
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel order (Patient only, placed orders)
 */
export const cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { id } = req.params;

    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.pharmacyOrder.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!order) throw new NotFoundError('Order not found');
      if (order.patientId !== userPayload.userId) {
        throw new ForbiddenError('Not authorized to cancel this order');
      }
      if (order.status !== OrderStatus.PLACED) {
        throw new ValidationError('Only newly placed orders can be cancelled');
      }

      const claimed = await tx.pharmacyOrder.updateMany({
        where: { id, patientId: userPayload.userId, status: OrderStatus.PLACED },
        data: { status: OrderStatus.CANCELLED },
      });
      if (claimed.count !== 1) {
        throw new ConflictError('Order was already cancelled or changed concurrently');
      }
      await restockOrderItems(tx, order.items);
      return tx.pharmacyOrder.findUniqueOrThrow({
        where: { id },
        include: { items: true },
      });
    });

    res.status(200).json(successResponse(updated));
  } catch (error) {
    next(error);
  }
};

/**
 * #135 Refill: clone a DELIVERED order's items into a new PLACED order.
 * Patient-only, own orders. Stock is re-validated and decremented; the
 * prescription link is not carried over (it was consumed by the source order).
 */
export const reorderOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { id } = req.params;

    if (userPayload.role !== UserRole.PATIENT) {
      throw new ForbiddenError('Only patients can reorder');
    }

    const source = await prisma.pharmacyOrder.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!source) throw new NotFoundError('Order not found');
    if (source.patientId !== userPayload.userId) {
      throw new ForbiddenError('Not authorized to reorder this order');
    }
    if (source.status !== OrderStatus.DELIVERED) {
      throw new ValidationError('Only delivered orders can be reordered');
    }
    if (source.items.length === 0) {
      throw new ValidationError('Source order has no items to reorder');
    }

    // Re-resolve products (price/stock may have changed); same-pharmacy only.
    const productIds = source.items.map((i) => i.productId).filter(Boolean) as string[];
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    let totalAmount = 0;
    const orderItemsData: Array<{
      productId: string;
      drugName: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }> = [];
    for (const item of source.items) {
      if (!item.productId) {
        throw new ValidationError(`Item ${item.drugName} is no longer available for reorder`);
      }
      const product = productMap.get(item.productId);
      if (!product || !product.isActive) {
        throw new ValidationError(`${item.drugName} is no longer available`);
      }
      if (product.pharmacyId !== source.pharmacyId) {
        throw new ValidationError('Order items must belong to the same pharmacy');
      }
      if (product.stock < item.quantity) {
        throw new ValidationError(`Insufficient stock for ${product.name}`);
      }
      const unitPrice = Number(product.price);
      const subtotal = unitPrice * item.quantity;
      totalAmount += subtotal;
      orderItemsData.push({
        productId: product.id,
        drugName: product.name,
        quantity: item.quantity,
        unitPrice,
        subtotal,
      });
    }

    const order = await prisma.$transaction(
      async (tx) => {
        const newOrder = await tx.pharmacyOrder.create({
          data: {
            patientId: userPayload.userId,
            pharmacyId: source.pharmacyId,
            status: OrderStatus.PLACED,
            deliveryType: source.deliveryType,
            deliveryAddress: (source.deliveryAddress ?? undefined) as any,
            notes: source.notes ?? null,
            prescriptionId: null,
            totalAmount,
            items: { create: orderItemsData },
          },
          include: { items: true },
        });
        for (const item of orderItemsData) {
          const updated = await tx.product.updateMany({
            where: { id: item.productId, stock: { gte: item.quantity }, isActive: true },
            data: { stock: { decrement: item.quantity } },
          });
          if (updated.count === 0) {
            throw new ValidationError(`Insufficient stock for product ${item.drugName}`);
          }
        }
        return newOrder;
      },
      { timeout: 30000, maxWait: 15000 }
    );

    res.status(201).json(successResponse(order));
  } catch (error) {
    next(error);
  }
};

/**
 * Fulfill prescription (create order from prescription)
 */
export const fulfillPrescription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;

    if (userPayload.role !== UserRole.PHARMACIST) {
      throw new ForbiddenError('Only pharmacists can fulfill prescriptions');
    }

    // #143 Ownership gate: verified + ACTIVE pharmacy only (best-effort lookup).
    try {
      const me = await prisma.user.findUnique({
        where: { id: userPayload.userId },
        select: {
          status: true,
          pharmacyProfile: { select: { isVerified: true } },
        },
      });
      if (!me || me.status !== UserStatus.ACTIVE || !me.pharmacyProfile?.isVerified) {
        throw new ForbiddenError('Pharmacy verification required');
      }
    } catch (e) {
      if (e instanceof ForbiddenError) throw e;
    }

    const { prescriptionId, deliveryType, deliveryAddress, notes } = req.body;

    if (!prescriptionId) {
      throw new ValidationError('prescriptionId is required');
    }

    if (deliveryType && !Object.values(DeliveryType).includes(deliveryType as DeliveryType)) {
      throw new ValidationError('Invalid delivery type');
    }

    const order = await prisma.$transaction(
      async (tx) => {
        const prescription = await tx.prescription.findUnique({
          where: { id: prescriptionId },
          include: { items: true },
        });

        if (!prescription) throw new NotFoundError('Prescription not found');
        if (prescription.pharmacyId !== userPayload.userId) {
          throw new ForbiddenError('Prescription is assigned to another pharmacy');
        }
        if (prescription.status !== PrescriptionStatus.SENT_TO_PHARMACY) {
          throw new ValidationError(
            `Prescription cannot be fulfilled. Current status: ${prescription.status}`
          );
        }
        if (prescription.items.length === 0) {
          throw new ValidationError('Prescription has no medication items');
        }

        const orderItems: Array<{
          productId: string;
          drugName: string;
          quantity: number;
          unitPrice: number;
          subtotal: number;
        }> = [];
        let totalAmount = 0;

        for (const prescriptionItem of prescription.items) {
          const product = await tx.product.findFirst({
            where: {
              pharmacyId: userPayload.userId,
              name: { equals: prescriptionItem.drugName, mode: 'insensitive' },
              isActive: true,
            },
            orderBy: { createdAt: 'asc' },
          });
          if (!product) {
            throw new ValidationError(
              `${prescriptionItem.drugName} is not available in this pharmacy inventory`
            );
          }
          if (product.stock < prescriptionItem.quantity) {
            throw new ValidationError(`Insufficient stock for ${product.name}`);
          }
          // #P3 Controlled schedule qty cap (best-effort read).
          const fulfillSched = String(
            (product as Record<string, unknown>).schedule ?? ''
          ).toUpperCase();
          if (fulfillSched === 'CONTROLLED' && Number(prescriptionItem.quantity) > 30) {
            throw new ValidationError(
              `Controlled product ${product.name} limited to 30 units per order`
            );
          }

          const unitPrice = Number(product.price);
          const subtotal = unitPrice * prescriptionItem.quantity;
          totalAmount += subtotal;
          orderItems.push({
            productId: product.id,
            drugName: product.name,
            quantity: prescriptionItem.quantity,
            unitPrice,
            subtotal,
          });
        }

        const claimed = await tx.prescription.updateMany({
          where: {
            id: prescription.id,
            pharmacyId: userPayload.userId,
            status: PrescriptionStatus.SENT_TO_PHARMACY,
          },
          data: { status: PrescriptionStatus.DISPENSED },
        });
        if (claimed.count !== 1) {
          throw new ConflictError('Prescription was already fulfilled or changed concurrently');
        }

        for (const item of orderItems) {
          const stocked = await tx.product.updateMany({
            where: {
              id: item.productId,
              pharmacyId: userPayload.userId,
              isActive: true,
              stock: { gte: item.quantity },
            },
            data: { stock: { decrement: item.quantity } },
          });
          if (stocked.count !== 1) {
            throw new ValidationError(`Insufficient stock for ${item.drugName}`);
          }
        }

        return tx.pharmacyOrder.create({
          data: {
            patientId: prescription.patientId,
            pharmacyId: userPayload.userId,
            prescriptionId: prescription.id,
            status: OrderStatus.PLACED,
            deliveryType: (deliveryType as DeliveryType) || DeliveryType.PICKUP,
            deliveryAddress: deliveryAddress || null,
            notes: notes || null,
            totalAmount,
            items: {
              create: orderItems,
            },
          },
          include: { items: true },
        });
      },
      { timeout: 30000, maxWait: 15000 }
    );

    res.status(201).json(successResponse(order));
  } catch (error) {
    next(error);
  }
};
