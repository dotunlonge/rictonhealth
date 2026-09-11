/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AuthResponse = {
  success: boolean;
  data: {
    token: string;
    refreshToken?: string;
    user: {
      id: string;
      email: string | null;
      phone: string | null;
      role: string;
      status: string;
    };
  };
};
