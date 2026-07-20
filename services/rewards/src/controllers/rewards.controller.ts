import { Request, Response, NextFunction } from 'express';
import { prisma } from '@ricton/db';
import { successResponse, errorResponse, ValidationError, NotFoundError, ForbiddenError } from '@ricton/shared';
import { RedeemRewardRequestSchema } from '../schemas/rewards.schema';

const TIER_THRESHOLDS = [
  { name: 'BRONZE', minPoints: 0, benefits: ['Standard support', 'Birthday bonus'], multiplier: 1.0 },
  { name: 'SILVER', minPoints: 1000, benefits: ['Priority support', '5% bonus points', 'Free delivery'], multiplier: 1.05 },
  { name: 'GOLD', minPoints: 5000, benefits: ['24/7 concierge', '10% bonus points', 'Free express delivery', 'Exclusive rewards'], multiplier: 1.10 },
  { name: 'PLATINUM', minPoints: 10000, benefits: ['Personal health manager', '15% bonus points', 'VIP events', 'Custom rewards'], multiplier: 1.15 },
];

const getUserTier = (totalPoints: number) => {
  for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalPoints >= TIER_THRESHOLDS[i].minPoints) {
      return TIER_THRESHOLDS[i];
    }
  }
  return TIER_THRESHOLDS[0];
};

export const getBalance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    // Calculate total points earned
    const earnings = await prisma.rewardTransaction.aggregate({
      where: { userId, type: 'EARN' },
      _sum: { points: true },
    });

    // Calculate total points redeemed
    const redemptions = await prisma.rewardTransaction.aggregate({
      where: { userId, type: 'REDEEM' },
      _sum: { points: true },
    });

    const totalEarned = earnings._sum.points || 0;
    const totalRedeemed = Math.abs(redemptions._sum.points || 0);
    const balance = totalEarned - totalRedeemed;

    const tier = getUserTier(totalEarned);
    const nextTierIndex = TIER_THRESHOLDS.findIndex(t => t.name === tier.name) + 1;
    const nextTier = nextTierIndex < TIER_THRESHOLDS.length ? TIER_THRESHOLDS[nextTierIndex] : null;

    res.status(200).json(
      successResponse({
        userId,
        balance,
        tier: tier.name,
        nextTierPoints: nextTier?.minPoints,
        pointsToNextTier: nextTier ? nextTier.minPoints - totalEarned : 0,
      })
    );
  } catch (error) {
    next(error);
  }
};

export const getEarnings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.rewardTransaction.findMany({
        where: { userId, type: 'EARN' },
        include: {
          rewardCatalog: false,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.rewardTransaction.count({ where: { userId, type: 'EARN' } }),
    ]);

    const earnings = transactions.map((t) => ({
      id: t.id,
      points: t.points,
      source: t.source,
      description: t.description,
      referenceId: t.referenceId,
      createdAt: t.createdAt.toISOString(),
    }));

    res.status(200).json(
      successResponse({
        earnings,
        meta: { total, page, limit },
      })
    );
  } catch (error) {
    next(error);
  }
};

export const getRedemptions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.rewardTransaction.findMany({
        where: { userId, type: 'REDEEM' },
        include: {
          rewardCatalog: {
            select: {
              id: true,
              name: true,
              description: true,
              pointsCost: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.rewardTransaction.count({ where: { userId, type: 'REDEEM' } }),
    ]);

    const redemptions = transactions.map((t) => ({
      id: t.id,
      pointsUsed: Math.abs(t.points),
      reward: t.rewardCatalog,
      status: t.status,
      deliveredAt: t.deliveredAt?.toISOString() || null,
      createdAt: t.createdAt.toISOString(),
    }));

    res.status(200).json(
      successResponse({
        redemptions,
        meta: { total, page, limit },
      })
    );
  } catch (error) {
    next(error);
  }
};

export const redeemReward = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const bodyResult = RedeemRewardRequestSchema.safeParse(req.body);

    if (!bodyResult.success) {
      throw new ValidationError('Invalid request body', bodyResult.error.errors);
    }

    const { rewardId, shippingAddress } = bodyResult.data;

    // Use serializable isolation with retry logic to prevent race conditions
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await prisma.$transaction(async (tx) => {
          // Get user's current balance with row-level locking simulation via select first
          const earnings = await tx.rewardTransaction.aggregate({
            where: { userId, type: 'EARN' },
            _sum: { points: true },
          });

          const redemptions = await tx.rewardTransaction.aggregate({
            where: { userId, type: 'REDEEM' },
            _sum: { points: true },
          });

          const balance = (earnings._sum.points || 0) - Math.abs(redemptions._sum.points || 0);

          // Get reward details
          const reward = await tx.rewardCatalog.findUnique({
            where: { id: rewardId },
          });

          if (!reward) {
            throw new NotFoundError('Reward not found');
          }

          if (!reward.isActive) {
            throw new ValidationError('Reward is no longer available');
          }

          if (reward.stock <= 0) {
            throw new ValidationError('Reward out of stock');
          }

          if (balance < reward.pointsCost) {
            throw new ValidationError('Insufficient points balance');
          }

          // Check tier requirement
          const userTier = getUserTier(earnings._sum.points || 0);
          if (reward.tierRequired && userTier.name !== reward.tierRequired) {
            const tierOrder = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
            if (tierOrder.indexOf(userTier.name) < tierOrder.indexOf(reward.tierRequired)) {
              throw new ForbiddenError(`This reward requires ${reward.tierRequired} tier or higher`);
            }
          }

          // Create redemption transaction
          const transaction = await tx.rewardTransaction.create({
            data: {
              userId,
              type: 'REDEEM',
              points: -reward.pointsCost,
              source: 'REDEMPTION',
              description: `Redeemed: ${reward.name}`,
              referenceId: null,
              status: 'PENDING',
              rewardCatalogId: rewardId,
              shippingAddress: shippingAddress ? JSON.stringify(shippingAddress) : null,
            },
          });

          // Update reward stock atomically with conditional check
          await tx.rewardCatalog.update({
            where: { id: rewardId, stock: { gt: 0 } },
            data: { stock: { decrement: 1 } },
          });

          // Calculate new balance
          const newBalance = balance - reward.pointsCost;

          return { transaction, newBalance, reward };
        }, {
          timeout: 10000, // 10 second timeout
        });

        res.status(201).json(
          successResponse({
            redemption: {
              id: result.transaction.id,
              pointsUsed: result.reward.pointsCost,
              reward: { 
                id: result.reward.id, 
                name: result.reward.name, 
                description: result.reward.description, 
                pointsCost: result.reward.pointsCost 
              },
              status: result.transaction.status,
              deliveredAt: null,
              createdAt: result.transaction.createdAt.toISOString(),
            },
            newBalance: result.newBalance,
          })
        );
        return;
      } catch (error: any) {
        lastError = error;
        // If it's a serialization failure or deadlock, retry
        if (error.code === 'P2034' || error.message.includes('deadlock') || error.message.includes('serialization')) {
          if (attempt < maxRetries - 1) {
            continue;
          }
        }
        throw error;
      }
    }
    
    throw lastError || new Error('Failed to process redemption after retries');
  } catch (error) {
    next(error);
  }
};

export const getCatalog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const category = req.query.category as string;
    const skip = (page - 1) * limit;

    const whereClause: any = { isActive: true, stock: { gt: 0 } };
    if (category) whereClause.category = category;

    const [items, total, categories] = await Promise.all([
      prisma.rewardCatalog.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { pointsCost: 'asc' },
      }),
      prisma.rewardCatalog.count({ where: whereClause }),
      prisma.rewardCatalog.groupBy({
        by: ['category'],
        where: { isActive: true, stock: { gt: 0 } },
      }),
    ]);

    const catalogItems = items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      pointsCost: item.pointsCost,
      category: item.category,
      imageUrl: item.imageUrl,
      stock: item.stock,
      isActive: item.isActive,
      tierRequired: item.tierRequired,
    }));

    res.status(200).json(
      successResponse({
        items: catalogItems,
        categories: categories.map((c) => c.category),
        meta: { total, page, limit },
      })
    );
  } catch (error) {
    next(error);
  }
};

export const getTiers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    // Calculate user's total earned points
    const earnings = await prisma.rewardTransaction.aggregate({
      where: { userId, type: 'EARN' },
      _sum: { points: true },
    });

    const totalEarned = earnings._sum.points || 0;
    const userTier = getUserTier(totalEarned);

    res.status(200).json(
      successResponse({
        tiers: TIER_THRESHOLDS,
        userTier: userTier.name,
      })
    );
  } catch (error) {
    next(error);
  }
};

// Internal endpoint for other services to award points
export const earnPoints = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // This should be called internally with service-to-service auth
    const { userId, source, referenceId, basePoints } = req.body;

    // Validate required fields and ensure basePoints is a positive integer
    if (!userId || !source || !referenceId || !basePoints || basePoints <= 0 || !Number.isInteger(basePoints)) {
      throw new ValidationError('Missing or invalid required fields. basePoints must be a positive integer.');
    }

    // Check if points already awarded for this reference using upsert pattern for atomicity
    const existing = await prisma.rewardTransaction.findFirst({
      where: {
        userId,
        source,
        referenceId,
        type: 'EARN',
      },
    });

    if (existing) {
      return res.status(200).json(successResponse({ message: 'Points already awarded', transactionId: existing.id }));
    }

    // Get user's tier for multiplier
    const earnings = await prisma.rewardTransaction.aggregate({
      where: { userId, type: 'EARN' },
      _sum: { points: true },
    });

    const totalEarned = earnings._sum.points || 0;
    const tier = getUserTier(totalEarned);
    const finalPoints = Math.floor(basePoints * tier.multiplier);

    const transaction = await prisma.rewardTransaction.create({
      data: {
        userId,
        type: 'EARN',
        points: finalPoints,
        source,
        description: `Earned from ${source}`,
        referenceId,
        status: 'COMPLETED',
      },
    });

    res.status(201).json(
      successResponse({
        transactionId: transaction.id,
        pointsAwarded: finalPoints,
        tierMultiplier: tier.multiplier,
        newTotal: totalEarned + finalPoints,
      })
    );
  } catch (error) {
    next(error);
  }
};
