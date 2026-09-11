/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AdminUserListResponse = {
  users: Array<{
    id: string;
    email: string | null;
    phone: string | null;
    firstName: string;
    lastName: string;
    role: 'PATIENT' | 'CONSULTANT' | 'PHARMACIST' | 'HOSPITAL_ADMIN' | 'SUPER_ADMIN';
    status: 'ACTIVE' | 'SUSPENDED' | 'PENDING' | 'DEACTIVATED';
    isVerified: boolean;
    createdAt: string;
    lastLoginAt: string | null;
  }>;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};
