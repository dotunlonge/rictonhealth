import { Request, Response, NextFunction } from 'express';
import { prisma, UserRole, OrderStatus, DeliveryType, Prisma } from '@ricton/db';
import { JwtPayload } from '@ricton/auth-middleware';
import {
  successResponse,
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
} from '@ricton/shared';

/**
 * List pharmacy products with optional filtering
 */
export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, search, pharmacyId, limit = 20, offset = 0 } = req.query;

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
        take: Number(limit),
        skip: Number(offset),
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
        limit: Number(limit),
        offset: Number(offset),
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
 * Create product (Pharmacy only)
 */
export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;

    if (userPayload.role !== UserRole.PHARMACIST) {
      throw new ForbiddenError('Only pharmacists can create products');
    }

    const { name, description, category, price, stock, imageUrl } = req.body;

    if (!name || price === undefined || stock === undefined) {
      throw new ValidationError('Name, price, and stock are required');
    }

    if (Number(price) < 0 || stock < 0) {
      throw new ValidationError('Price and stock cannot be negative');
    }

    const product = await prisma.product.create({
      data: {
        pharmacyId: userPayload.userId,
        name,
        description: description || null,
        category: category || 'General',
        price,
        stock,
        imageUrl: imageUrl || null,
      },
    });

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

/**
 * Update product (Pharmacy only)
 */
export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
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
      throw new ForbiddenError('Not authorized to update this product');
    }

    const { name, description, category, price, stock, imageUrl, isActive } = req.body;

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(category && { category }),
        ...(price !== undefined && { price }),
        ...(stock !== undefined && { stock }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(isActive !== undefined && { isActive }),
      },
    });

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

    const { items, deliveryType, deliveryAddress, notes } = req.body;

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

    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        throw new ValidationError('Each item must have productId and a positive quantity');
      }

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

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.pharmacyOrder.create({
        data: {
          patientId: userPayload.userId,
          pharmacyId: pharmacyId!,
          status: OrderStatus.PLACED,
          deliveryType: deliveryType || DeliveryType.DELIVERY,
          deliveryAddress: deliveryAddress || null,
          notes: notes || null,
          totalAmount,
          items: {
            create: orderItemsData.map((d) => ({
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

      // Reduce stock
      await Promise.all(
        orderItemsData.map((item) =>
          tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { decrement: item.quantity },
            },
          })
        )
      );

      return newOrder;
    });

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
        take: Number(limit),
        skip: Number(offset),
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
        limit: Number(limit),
        offset: Number(offset),
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

    res.status(200).json(successResponse(order));
  } catch (error) {
    next(error);
  }
};

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

    const order = await prisma.pharmacyOrder.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.pharmacyId !== userPayload.userId) {
      throw new ForbiddenError('Not authorized to update this order');
    }

    if (status === OrderStatus.CANCELLED && order.status !== OrderStatus.CANCELLED) {
      await prisma.pharmacyOrder.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
      });

      const updatedOrder = await prisma.pharmacyOrder.findUnique({
        where: { id },
        include: { items: true },
      });

      return res.status(200).json(successResponse(updatedOrder));
    }

    const updated = await prisma.pharmacyOrder.update({
      where: { id },
      data: { status: status as OrderStatus },
      include: { items: true },
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

    const order = await prisma.pharmacyOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.patientId !== userPayload.userId) {
      throw new ForbiddenError('Not authorized to cancel this order');
    }

    if (order.status !== OrderStatus.PLACED) {
      throw new ValidationError('Only newly placed orders can be cancelled');
    }

    const updated = await prisma.pharmacyOrder.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
      },
      include: { items: true },
    });

    res.status(200).json(successResponse(updated));
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

    const { prescriptionId } = req.body;

    if (!prescriptionId) {
      throw new ValidationError('prescriptionId is required');
    }

    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        items: true,
        patient: true,
      },
    });

    if (!prescription) {
      throw new NotFoundError('Prescription not found');
    }

    if (prescription.status !== 'SENT_TO_PHARMACY') {
      throw new ValidationError(
        `Prescription cannot be fulfilled. Current status: ${prescription.status}`
      );
    }

    const existingOrder = await prisma.pharmacyOrder.findFirst({
      where: { prescriptionId: prescription.id },
    });

    if (existingOrder) {
      throw new ConflictError('Order already exists for this prescription');
    }

    const order = await prisma.pharmacyOrder.create({
      data: {
        patientId: prescription.patientId,
        pharmacyId: userPayload.userId,
        status: OrderStatus.PLACED,
        deliveryType: DeliveryType.PICKUP,
        totalAmount: 0,
        prescriptionId: prescription.id,
      },
    });

    res.status(201).json(successResponse(order));
  } catch (error) {
    next(error);
  }
};
