import { z } from './zod';
export declare const RegisterInputSchema: z.ZodObject<
  {
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    password: z.ZodString;
    role: z.ZodEnum<['PATIENT', 'CONSULTANT', 'PHARMACIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']>;
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    password: string;
    role: 'PATIENT' | 'CONSULTANT' | 'PHARMACIST' | 'HOSPITAL_ADMIN' | 'SUPER_ADMIN';
    email?: string | undefined;
    phone?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
  },
  {
    password: string;
    role: 'PATIENT' | 'CONSULTANT' | 'PHARMACIST' | 'HOSPITAL_ADMIN' | 'SUPER_ADMIN';
    email?: string | undefined;
    phone?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
  }
>;
export declare const LoginInputSchema: z.ZodObject<
  {
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    password: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    password: string;
    email?: string | undefined;
    phone?: string | undefined;
  },
  {
    password: string;
    email?: string | undefined;
    phone?: string | undefined;
  }
>;
export declare const SendOtpInputSchema: z.ZodObject<
  {
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    email?: string | undefined;
    phone?: string | undefined;
  },
  {
    email?: string | undefined;
    phone?: string | undefined;
  }
>;
export declare const VerifyOtpInputSchema: z.ZodObject<
  {
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    otp: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    otp: string;
    email?: string | undefined;
    phone?: string | undefined;
  },
  {
    otp: string;
    email?: string | undefined;
    phone?: string | undefined;
  }
>;
export declare const OAuthInputSchema: z.ZodObject<
  {
    token: z.ZodString;
    role: z.ZodOptional<z.ZodEnum<['PATIENT', 'CONSULTANT']>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    token: string;
    role?: 'PATIENT' | 'CONSULTANT' | undefined;
  },
  {
    token: string;
    role?: 'PATIENT' | 'CONSULTANT' | undefined;
  }
>;
export declare const RefreshTokenInputSchema: z.ZodObject<
  {
    refreshToken: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    refreshToken: string;
  },
  {
    refreshToken: string;
  }
>;
export declare const PasswordResetInputSchema: z.ZodObject<
  {
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    otp: z.ZodString;
    newPassword: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    otp: string;
    newPassword: string;
    email?: string | undefined;
    phone?: string | undefined;
  },
  {
    otp: string;
    newPassword: string;
    email?: string | undefined;
    phone?: string | undefined;
  }
>;
export declare const AuthResponseSchema: z.ZodObject<
  {
    success: z.ZodBoolean;
    data: z.ZodObject<
      {
        token: z.ZodString;
        refreshToken: z.ZodOptional<z.ZodString>;
        user: z.ZodObject<
          {
            id: z.ZodString;
            email: z.ZodNullable<z.ZodString>;
            phone: z.ZodNullable<z.ZodString>;
            role: z.ZodString;
            status: z.ZodString;
          },
          'strip',
          z.ZodTypeAny,
          {
            status: string;
            email: string | null;
            phone: string | null;
            role: string;
            id: string;
          },
          {
            status: string;
            email: string | null;
            phone: string | null;
            role: string;
            id: string;
          }
        >;
      },
      'strip',
      z.ZodTypeAny,
      {
        user: {
          status: string;
          email: string | null;
          phone: string | null;
          role: string;
          id: string;
        };
        token: string;
        refreshToken?: string | undefined;
      },
      {
        user: {
          status: string;
          email: string | null;
          phone: string | null;
          role: string;
          id: string;
        };
        token: string;
        refreshToken?: string | undefined;
      }
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    success: boolean;
    data: {
      user: {
        status: string;
        email: string | null;
        phone: string | null;
        role: string;
        id: string;
      };
      token: string;
      refreshToken?: string | undefined;
    };
  },
  {
    success: boolean;
    data: {
      user: {
        status: string;
        email: string | null;
        phone: string | null;
        role: string;
        id: string;
      };
      token: string;
      refreshToken?: string | undefined;
    };
  }
>;
