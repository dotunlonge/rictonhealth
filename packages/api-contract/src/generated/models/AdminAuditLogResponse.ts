/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AdminAuditLogResponse = {
  logs: Array<{
    id: string;
    actorId: string | null;
    action: string;
    resourceType: string;
    resourceId: string | null;
    metadata: Record<string, any>;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
  }>;
  meta: {
    total: number;
    page: number;
    limit: number;
  };
};
