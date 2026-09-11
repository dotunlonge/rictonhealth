/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AdminProviderPendingListResponse = {
  providers: Array<{
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    specialty: string;
    licenseNumber: string;
    submittedAt: string;
    documents: Array<{
      type: string;
      url: string;
      status: 'PENDING' | 'APPROVED' | 'REJECTED';
    }>;
  }>;
  meta: {
    total: number;
    page: number;
    limit: number;
  };
};
