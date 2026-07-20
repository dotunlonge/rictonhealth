import { Request, Response, NextFunction } from 'express';
import { prisma, UserRole } from '@ricton/db';
import { JwtPayload } from '@ricton/auth-middleware';
import { successResponse, NotFoundError, ForbiddenError, ValidationError } from '@ricton/shared';
import { CreateConversationSchema, SendMessageSchema, MarkAsReadSchema } from '../schemas/messaging.schema';

export const listConversations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const conversations = await prisma.chatThread.findMany({
      where: {
        participants: {
          some: {
            userId: userPayload.userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                role: true,
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
                firstName: true,
                lastName: true,
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
      skip,
      take: limit,
    });

    const total = await prisma.chatThread.count({
      where: {
        participants: {
          some: {
            userId: userPayload.userId,
          },
        },
      },
    });

    const formattedConversations = conversations.map((conv) => ({
      id: conv.id,
      threadType: 'DIRECT' as const,
      title: null,
      participants: conv.participants.map((p) => ({
        id: p.id,
        userId: p.userId,
        user: p.user,
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
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

export const getConversationMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

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

    const messages = await prisma.chatMessage.findMany({
      where: { threadId: id },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        receipts: {
          where: { userId: userPayload.userId },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const total = await prisma.chatMessage.count({
      where: { threadId: id },
    });

    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      threadId: msg.threadId,
      senderId: msg.senderId,
      sender: msg.sender,
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
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + formattedMessages.length < total,
        },
      })
    );
  } catch (error) {
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
              firstName: true,
              lastName: true,
              avatarUrl: true,
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

    res.status(201).json(
      successResponse({
        id: message.id,
        threadId: message.threadId,
        senderId: message.senderId,
        sender: message.sender,
        body: message.body,
        fileUrl: message.fileUrl,
        fileName: message.fileName,
        fileSize: message.fileSize,
        isRead: true,
        readAt: new Date().toISOString(),
        createdAt: message.createdAt.toISOString(),
      })
    );
  } catch (error) {
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
      await prisma.$transaction(async (tx) => {
        const unreadMessages = await tx.chatMessage.findMany({
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

        for (const msg of unreadMessages) {
          await tx.chatMessageReceipt.create({
            data: {
              messageId: msg.id,
              userId: userPayload.userId,
            },
          });
        }
      });

      res.status(200).json(successResponse({ success: true, markedCount: 'all' }));
    } else if (validatedData.messageIds && validatedData.messageIds.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const messageId of validatedData.messageIds) {
          await tx.chatMessageReceipt.upsert({
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
          });
        }
      });

      res.status(200).json(
        successResponse({ success: true, markedCount: validatedData.messageIds.length })
      );
    } else {
      throw new ValidationError('Either markAll must be true or messageIds must be provided');
    }
  } catch (error) {
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
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                  role: true,
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
        participants: conversation.participants.map((p) => ({
          id: p.id,
          userId: p.userId,
          user: p.user,
          joinedAt: p.joinedAt.toISOString(),
        })),
        lastMessage: null,
        unreadCount: 0,
        updatedAt: conversation.updatedAt.toISOString(),
        createdAt: conversation.createdAt.toISOString(),
      })
    );
  } catch (error) {
    next(error);
  }
};
