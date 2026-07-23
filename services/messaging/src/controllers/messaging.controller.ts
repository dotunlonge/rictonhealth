import { Request, Response, NextFunction } from 'express';
import { prisma, UserRole } from '@ricton/db';
import { JwtPayload } from '@ricton/auth-middleware';
import {
  successResponse,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  decodeCursor,
  encodeCursor,
} from '@ricton/shared';
import {
  CreateConversationSchema,
  SendMessageSchema,
  MarkAsReadSchema,
} from '../schemas/messaging.schema';

function formatUser(user: any) {
  if (!user) return null;
  const profile = user.role === UserRole.PATIENT ? user.patientProfile : user.providerProfile;
  return {
    id: user.id,
    role: user.role,
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    avatarUrl: profile?.avatarUrl || null,
  };
}

export const listConversations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const cursor = req.query.cursor as string | undefined;

    const whereClause: any = {
      participants: {
        some: {
          userId: userPayload.userId,
        },
      },
    };

    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded) {
        whereClause.updatedAt = { lt: new Date(decoded.timestamp) };
      }
    }

    const conversations = await prisma.chatThread.findMany({
      where: whereClause,
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                role: true,
                patientProfile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    avatarUrl: true,
                  },
                },
                providerProfile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: {
                id: true,
                role: true,
                patientProfile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    avatarUrl: true,
                  },
                },
                providerProfile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                receipts: {
                  none: {
                    userId: userPayload.userId,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = conversations.length > limit;
    const data = hasMore ? conversations.slice(0, limit) : conversations;

    const nextCursor =
      hasMore && data.length > 0
        ? encodeCursor(data[data.length - 1].id, data[data.length - 1].updatedAt.toISOString())
        : null;

    const formattedConversations = data.map((conv: any) => ({
      id: conv.id,
      threadType: 'DIRECT' as const,
      title: null,
      participants: conv.participants.map((p: any) => ({
        id: p.id,
        userId: p.userId,
        user: formatUser(p.user),
        joinedAt: p.joinedAt.toISOString(),
      })),
      lastMessage: conv.messages[0]
        ? {
            id: conv.messages[0].id,
            body: conv.messages[0].body,
            senderId: conv.messages[0].senderId,
            createdAt: conv.messages[0].createdAt.toISOString(),
          }
        : null,
      unreadCount: conv._count.messages,
      updatedAt: conv.updatedAt.toISOString(),
      createdAt: conv.createdAt.toISOString(),
    }));

    res.status(200).json(
      successResponse({
        conversations: formattedConversations,
        pagination: {
          nextCursor,
          hasMore,
        },
      })
    );
  } catch (error: unknown) {
    next(error);
  }
};

export const getConversationMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const cursor = req.query.cursor as string | undefined;

    const conversation = await prisma.chatThread.findUnique({
      where: { id },
      include: {
        participants: {
          where: { userId: userPayload.userId },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    if (conversation.participants.length === 0) {
      throw new ForbiddenError('You are not a participant in this conversation');
    }

    const whereClause: any = { threadId: id };

    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded) {
        whereClause.createdAt = { lt: new Date(decoded.timestamp) };
      }
    }

    const messages = await prisma.chatMessage.findMany({
      where: whereClause,
      include: {
        sender: {
          select: {
            id: true,
            role: true,
            patientProfile: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
            providerProfile: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
        receipts: {
          where: { userId: userPayload.userId },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    const data = hasMore ? messages.slice(0, limit) : messages;

    const nextCursor =
      hasMore && data.length > 0
        ? encodeCursor(data[data.length - 1].id, data[data.length - 1].createdAt.toISOString())
        : null;

    const formattedMessages = data.map((msg: any) => ({
      id: msg.id,
      threadId: msg.threadId,
      senderId: msg.senderId,
      sender: formatUser(msg.sender),
      body: msg.body,
      fileUrl: msg.fileUrl,
      fileName: msg.fileName,
      fileSize: msg.fileSize,
      isRead: msg.receipts.length > 0,
      readAt: msg.receipts[0]?.readAt?.toISOString() || null,
      createdAt: msg.createdAt.toISOString(),
    }));

    res.status(200).json(
      successResponse({
        messages: formattedMessages.reverse(),
        pagination: {
          nextCursor,
          hasMore,
        },
      })
    );
  } catch (error: unknown) {
    next(error);
  }
};

export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { id } = req.params;
    const validatedData = SendMessageSchema.parse(req.body);

    const conversation = await prisma.chatThread.findUnique({
      where: { id },
      include: {
        participants: {
          where: { userId: userPayload.userId },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    if (conversation.participants.length === 0) {
      throw new ForbiddenError('You are not a participant in this conversation');
    }

    if (!validatedData.body && !validatedData.fileUrl) {
      throw new ValidationError('Either message body or file attachment is required');
    }

    const message = await prisma.$transaction(async (tx) => {
      const newMessage = await tx.chatMessage.create({
        data: {
          threadId: id,
          senderId: userPayload.userId,
          body: validatedData.body || null,
          fileUrl: validatedData.fileUrl || null,
          fileName: validatedData.fileName || null,
          fileSize: validatedData.fileSize || null,
        },
        include: {
          sender: {
            select: {
              id: true,
              role: true,
              patientProfile: {
                select: {
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                },
              },
              providerProfile: {
                select: {
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      await tx.chatMessageReceipt.create({
        data: {
          messageId: newMessage.id,
          userId: userPayload.userId,
        },
      });

      await tx.chatThread.update({
        where: { id },
        data: { updatedAt: new Date() },
      });

      return newMessage;
    });

    const payload = {
      id: message.id,
      threadId: message.threadId,
      senderId: message.senderId,
      sender: formatUser(message.sender),
      body: message.body,
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      fileSize: message.fileSize,
      isRead: true,
      readAt: new Date().toISOString(),
      createdAt: message.createdAt.toISOString(),
    };

    const io = req.app.get('io');
    if (io) {
      io.to(id).emit('message', payload);
    }

    res.status(201).json(successResponse(payload));
  } catch (error: unknown) {
    next(error);
  }
};

export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { id } = req.params;
    const validatedData = MarkAsReadSchema.parse(req.body);

    const conversation = await prisma.chatThread.findUnique({
      where: { id },
      include: {
        participants: {
          where: { userId: userPayload.userId },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    if (conversation.participants.length === 0) {
      throw new ForbiddenError('You are not a participant in this conversation');
    }

    if (validatedData.markAll) {
      const unreadMessages = await prisma.chatMessage.findMany({
        where: {
          threadId: id,
          receipts: {
            none: {
              userId: userPayload.userId,
            },
          },
        },
        select: { id: true },
      });

      if (unreadMessages.length > 0) {
        await prisma.chatMessageReceipt.createMany({
          data: unreadMessages.map((msg) => ({
            messageId: msg.id,
            userId: userPayload.userId,
          })),
          skipDuplicates: true,
        });
      }

      res.status(200).json(successResponse({ success: true, markedCount: 'all' }));
    } else if (validatedData.messageIds && validatedData.messageIds.length > 0) {
      await prisma.$transaction(
        validatedData.messageIds.map((messageId) =>
          prisma.chatMessageReceipt.upsert({
            where: {
              messageId_userId: {
                messageId,
                userId: userPayload.userId,
              },
            },
            create: {
              messageId,
              userId: userPayload.userId,
            },
            update: {},
          })
        )
      );

      res
        .status(200)
        .json(successResponse({ success: true, markedCount: validatedData.messageIds.length }));
    } else {
      throw new ValidationError('Either markAll must be true or messageIds must be provided');
    }
  } catch (error: unknown) {
    next(error);
  }
};

export const createConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const validatedData = CreateConversationSchema.parse(req.body);

    const allParticipantIds = [...new Set([userPayload.userId, ...validatedData.participantIds])];

    const conversation = await prisma.$transaction(async (tx) => {
      const thread = await tx.chatThread.create({
        data: {
          participants: {
            create: allParticipantIds.map((userId) => ({
              userId,
            })),
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  role: true,
                  patientProfile: {
                    select: {
                      firstName: true,
                      lastName: true,
                      avatarUrl: true,
                    },
                  },
                  providerProfile: {
                    select: {
                      firstName: true,
                      lastName: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return thread;
    });

    res.status(201).json(
      successResponse({
        id: conversation.id,
        threadType: validatedData.threadType,
        title: validatedData.title || null,
        participants: conversation.participants.map((p: any) => ({
          id: p.id,
          userId: p.userId,
          user: formatUser(p.user),
          joinedAt: p.joinedAt.toISOString(),
        })),
        lastMessage: null,
        unreadCount: 0,
        updatedAt: conversation.updatedAt.toISOString(),
        createdAt: conversation.createdAt.toISOString(),
      })
    );
  } catch (error: unknown) {
    next(error);
  }
};
