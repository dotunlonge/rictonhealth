import { Request, Response, NextFunction } from 'express';
import { prisma, UserRole, NotificationChannel, Prisma } from '@ricton/db';
import { JwtPayload } from '@ricton/auth-middleware';
import { successResponse, NotFoundError, ValidationError } from '@ricton/shared';

/**
 * List notifications for current user
 */
export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { isRead, limit = 20, offset = 0 } = req.query;

    const where: Prisma.NotificationWhereInput = {
      userId: userPayload.userId,
    };

    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        take: Number(limit),
        skip: Number(offset),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);

    res.status(200).json(
      successResponse({
        notifications,
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
 * Get notification by ID
 */
export const getNotificationById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userPayload.userId) {
      throw new NotFoundError('Notification not found');
    }

    res.status(200).json(successResponse(notification));
  } catch (error) {
    next(error);
  }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    if (notification.userId !== userPayload.userId) {
      throw new ValidationError('Not authorized to update this notification');
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.status(200).json(successResponse(updated));
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;

    const result = await prisma.notification.updateMany({
      where: {
        userId: userPayload.userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.status(200).json(
      successResponse({
        message: `Marked ${result.count} notifications as read`,
        count: result.count,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get notification preferences
 */
export const getPreferences = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;

    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId: userPayload.userId },
    });

    if (!preferences) {
      // Create default preferences
      preferences = await prisma.notificationPreference.create({
        data: {
          userId: userPayload.userId,
          emailEnabled: true,
          smsEnabled: true,
          pushEnabled: true,
        },
      });
    }

    res.status(200).json(successResponse(preferences));
  } catch (error) {
    next(error);
  }
};

/**
 * Update notification preferences
 */
export const updatePreferences = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { emailEnabled, smsEnabled, pushEnabled, quietHoursStart, quietHoursEnd } = req.body;

    const updated = await prisma.notificationPreference.upsert({
      where: { userId: userPayload.userId },
      create: {
        userId: userPayload.userId,
        emailEnabled: emailEnabled ?? true,
        smsEnabled: smsEnabled ?? true,
        pushEnabled: pushEnabled ?? true,
        quietHoursStart,
        quietHoursEnd,
      },
      update: {
        emailEnabled: emailEnabled ?? undefined,
        smsEnabled: smsEnabled ?? undefined,
        pushEnabled: pushEnabled ?? undefined,
        quietHoursStart,
        quietHoursEnd,
      },
    });

    res.status(200).json(successResponse(updated));
  } catch (error) {
    next(error);
  }
};

/**
 * Register push notification token
 */
export const registerPushToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { token, platform } = req.body;

    if (!token) {
      throw new ValidationError('Push token is required');
    }

    // Store in Redis or database for push notification delivery
    // This is a simplified implementation - in production, use a dedicated tokens table
    const key = `push_token:${userPayload.userId}:${platform || 'mobile'}`;

    // Using a simple storage approach - integrate with Redis in production
    console.log(`Registering push token for user ${userPayload.userId}: ${key}`);

    res.status(200).json(
      successResponse({
        message: 'Push token registered successfully',
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Delete notification
 */
export const deleteNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    if (notification.userId !== userPayload.userId) {
      throw new ValidationError('Not authorized to delete this notification');
    }

    await prisma.notification.delete({
      where: { id },
    });

    res.status(200).json(
      successResponse({
        message: 'Notification deleted successfully',
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Send test notification
 */
export const sendTestNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;

    if (userPayload.role !== UserRole.SUPER_ADMIN) {
      throw new ValidationError('Only admins can send test notifications');
    }

    const { userId, type, title, body, channel } = req.body;

    if (!userId || !type || !title || !body) {
      throw new ValidationError('userId, type, title, and body are required');
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        channel: (channel as NotificationChannel) || NotificationChannel.IN_APP,
      },
    });

    res.status(201).json(
      successResponse({
        message: 'Test notification sent',
        notification,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;

    const count = await prisma.notification.count({
      where: {
        userId: userPayload.userId,
        isRead: false,
      },
    });

    res.status(200).json(
      successResponse({
        count,
      })
    );
  } catch (error) {
    next(error);
  }
};
