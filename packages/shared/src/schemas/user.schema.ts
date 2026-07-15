import { z } from './zod';
import { registry } from './openapi.registry';

export const UserProfileSchema = registry.register(
  'UserProfile',
  z.object({
    id: z.string().uuid(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    role: z.string(),
    status: z.string(),
    patientProfile: z
      .object({
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
        dateOfBirth: z.string().nullable(),
        gender: z.string().nullable(),
        bloodType: z.string().nullable(),
        allergies: z.array(z.string()).nullable().optional(),
        medicalHistory: z
          .array(
            z.object({
              condition: z.string().min(1, 'Condition must be a non-empty string'),
              diagnosedAt: z
                .string()
                .regex(/^\d{4}-\d{2}-\d{2}$/, 'Diagnosed date must be in YYYY-MM-DD format')
                .optional(),
              notes: z.string().optional(),
            })
          )
          .nullable()
          .optional(),
        emergencyContact: z
          .object({
            name: z.string(),
            relationship: z.string(),
            phone: z.string(),
          })
          .nullable()
          .optional(),
      })
      .nullable()
      .optional(),
    providerProfile: z
      .object({
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
        specialty: z.string().nullable(),
        consultationFee: z.number().nullable(),
      })
      .nullable()
      .optional(),
  })
);

export const GetUserResponseSchema = registry.register(
  'GetUserResponse',
  z.object({
    success: z.boolean(),
    data: UserProfileSchema,
  })
);

export const UpdateProfileInputSchema = registry.register(
  'UpdateProfileInput',
  z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    dateOfBirth: z.string().optional(),
    gender: z.string().optional(),
    bloodType: z.string().optional(),
    allergies: z.array(z.string()).optional(),
    specialty: z.string().optional(),
    consultationFee: z.number().optional(),
    title: z.string().optional(),
    pharmacyName: z.string().optional(),
  })
);

export const AvatarUploadInputSchema = registry.register(
  'AvatarUploadInput',
  z.object({
    fileType: z.string().min(1),
  })
);

export const MedicalHistoryInputSchema = registry.register(
  'MedicalHistoryInput',
  z.object({
    medicalHistory: z.array(
      z.object({
        condition: z.string().min(1, 'Condition must be a non-empty string'),
        diagnosedAt: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, 'Diagnosed date must be in YYYY-MM-DD format')
          .optional(),
        notes: z.string().optional(),
      })
    ),
  })
);

registry.registerPath({
  method: 'get',
  path: '/api/users/me',
  summary: 'Get current user profile',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'User profile retrieved successfully',
      content: {
        'application/json': {
          schema: GetUserResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
    },
  },
});
