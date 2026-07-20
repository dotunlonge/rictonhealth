import { Request, Response, NextFunction } from 'express';
import { prisma, UserRole, OrderStatus, DeliveryType, Prisma } from '@ricton/db';
import { JwtPayload } from '@ricton/auth-middleware';
import { successResponse, NotFoundError, ValidationError, ForbiddenError } from '@ricton/shared';

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
            pharmacyProfile: { select: { pharmacyName: true, address: true } },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    res.status(200).json(successResponse(product));
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new product (Pharmacist only)
 */
export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    
    if (userPayload.role !== UserRole.PHARMACIST) {
      throw new ForbiddenError('Only pharmacists can create products');
    }

    const { name, description, price, stock, category, imageUrl } = req.body;

    if (!name || !price) {
      throw new ValidationError('Name and price are required');
    }

    const product = await prisma.product.create({
      data: {
        pharmacyId: userPayload.userId,
        name,
        description: description || null,
        price: Number(price),
        stock: Number(stock) || 0,
        category: category || null,
        imageUrl: imageUrl || null,
      },
    });

    res.status(201).json(successResponse(product));
  } catch (error) {
    next(error);
  }
};

/**
 * Update product (Pharmacist only, own products)
 */
export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    
    if (userPayload.role !== UserRole.PHARMACIST) {
      throw new ForbiddenError('Only pharmacists can update products');
    }

    const { id } = req.params;
    const { name, description, price, stock, category, imageUrl, isActive } = req.body;

    const existing = await prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Product not found');
    }

    if (existing.pharmacyId !== userPayload.userId) {
      throw new ForbiddenError('You can only update your own products');
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        price: price !== undefined ? Number(price) : undefined,
        stock: stock !== undefined ? Number(stock) : undefined,
        category,
        imageUrl,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    res.status(200).json(successResponse(updated));
  } catch (error) {
    next(error);
  }
};

/**
 * Delete product (soft delete via isActive)
 */
export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    
    if (userPayload.role !== UserRole.PHARMACIST) {
      throw new ForbiddenError('Only pharmacists can delete products');
    }

    const { id } = req.params;

    const existing = await prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Product not found');
    }

    if (existing.pharmacyId !== userPayload.userId) {
      throw new ForbiddenError('You can only delete your own products');
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    res.status(200).json(successResponse(updated));
  } catch (error) {
    next(error);
  }
};

/**
 * Get product categories
 */
export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.product.groupBy({
      by: ['category'],
      where: { isActive: true, category: { not: null } },
      _count: true,
    });

    res.status(200).json(
      successResponse(
        categories.map((c) => ({
          name: c.category,
          count: c._count,
        }))
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Create pharmacy order
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

    // Validate items and calculate total
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of items) {
      if (!item.productId || !item.quantity) {
        throw new ValidationError('Each item must have productId and quantity');
      }

      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product || !product.isActive) {
        throw new NotFoundError(`Product ${item.productId} not found or inactive`);
      }

      if (product.stock < item.quantity) {
        throw new ValidationError(`Insufficient stock for ${product.name}`);
      }

      totalAmount += Number(product.price) * item.quantity;
      orderItemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(product.price),
      });
    }

    // Create order with items in transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.pharmacyOrder.create({
        data: {
          patientId: userPayload.userId,
          pharmacyId: orderItemsData[0] 
            ? (await tx.product.findUnique({ where: { id: orderItemsData[0].productId } }))?.pharmacyId
            : userPayload.userId,
          status: OrderStatus.PENDING,
          deliveryType: deliveryType || DeliveryType.DELIVERY,
          deliveryAddress: deliveryAddress || null,
          notes: notes || null,
          totalAmount,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                },
              },
            },
          },
          pharmacy: {
            select: {
              pharmacyProfile: {
                select: {
                  pharmacyName: true,
                  address: true,
                },
              },
            },
          },
        },
      });

      // Reduce stock
      for (const item of orderItemsData) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
          },
        });
      }

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
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                },
              },
            },
          },
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
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
        pharmacy: {
          select: {
            pharmacyProfile: {
              select: {
                pharmacyName: true,
                address: true,
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

    // Authorization check
    if (
      userPayload.role === UserRole.PATIENT &&
      order.patientId !== userPayload.userId
    ) {
      throw new ForbiddenError('Not authorized to view this order');
    }

    if (
      userPayload.role === UserRole.PHARMACIST &&
      order.pharmacyId !== userPayload.userId
    ) {
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

    const updated = await prisma.pharmacyOrder.update({
      where: { id },
      data: { status: status as OrderStatus },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    res.status(200).json(successResponse(updated));
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel order (Patient only, pending orders)
 */
export const cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { id } = req.params;
    const { reason } = req.body;

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

    if (order.status !== OrderStatus.PENDING) {
      throw new ValidationError('Only pending orders can be cancelled');
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Restore stock
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
          },
        });
      }

      // Cancel order
      return tx.pharmacyOrder.update({
        where: { id },
        data: {
          status: OrderStatus.CANCELLED,
          cancellationReason: reason || null,
        },
        include: { items: true },
      });
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

    // Create order from prescription items
    const order = await prisma.pharmacyOrder.create({
      data: {
        patientId: prescription.patientId,
        pharmacyId: userPayload.userId,
        status: OrderStatus.PENDING,
        deliveryType: DeliveryType.PICKUP,
        totalAmount: 0, // To be calculated based on products
        prescriptionId: prescription.id,
      },
    });

    res.status(201).json(successResponse(order));
  } catch (error) {
    next(error);
  }
};
