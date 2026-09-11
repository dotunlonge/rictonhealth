/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type NotificationsListResponse = {
  success: boolean;
  data: {
    notifications: Array<{
      id: string;
      userId: string;
      type: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
      channel: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
      title: string;
      message: string;
      data: Record<string, any> | null;
      isRead: boolean;
      readAt: string | null;
      sentAt: string | null;
      deliveredAt: string | null;
      failedAt: string | null;
      failureReason: string | null;
      createdAt: string;
    }>;
    total: number;
    unreadCount: number;
    limit: number;
    offset: number;
  };
};
