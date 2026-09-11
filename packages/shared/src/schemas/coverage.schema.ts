import { z } from './zod';
import { registry } from './openapi.registry';

// Request bodies for routes whose controllers consume them, registered here so
// the OpenAPI contract carries real schemas instead of generated stubs.
// Every shape below mirrors its controller's req.body destructuring.

// Messaging
export const CreateConversationInput = registry.register(
  'CreateConversationInput',
  z.object({
    participantIds: z.array(z.string().uuid()).min(1).max(10),
    threadType: z.enum(['DIRECT', 'GROUP', 'APPOINTMENT', 'MDT']).optional(),
    title: z.string().max(200).optional(),
  })
);

export const SendMessageInput = registry.register(
  'SendMessageInput',
  z.object({
    body: z.string().max(5000).optional(),
    fileUrl: z.string().url().optional(),
    fileName: z.string().max(255).optional(),
    fileSize: z.number().int().positive().optional(),
  })
);

export const MarkConversationReadInput = registry.register(
  'MarkConversationReadInput',
  z.object({
    messageIds: z.array(z.string().uuid()).optional(),
    markAll: z.boolean().optional(),
  })
);

// Telemedicine
export const CreateTelemedicineRoomInput = registry.register(
  'CreateTelemedicineRoomInput',
  z.object({
    appointmentId: z.string().uuid().optional(),
    roomType: z.enum(['ONE_ON_ONE', 'MDT']).optional(),
  })
);

// Notifications
export const PushTokenInput = registry.register(
  'PushTokenInput',
  z.object({
    token: z.string().min(1),
    platform: z.string().optional(),
  })
);

export const NotificationPreferencesInput = registry.register(
  'NotificationPreferencesInput',
  z.object({
    emailEnabled: z.boolean().optional(),
    smsEnabled: z.boolean().optional(),
    pushEnabled: z.boolean().optional(),
    quietHoursStart: z.string().optional(),
    quietHoursEnd: z.string().optional(),
  })
);

export const TestNotificationInput = registry.register(
  'TestNotificationInput',
  z.object({
    userId: z.string().uuid(),
    type: z.string().min(1),
    title: z.string().min(1),
    body: z.string().min(1),
    channel: z.string().min(1),
  })
);

// Admin
export const AdminVerifyProviderInput = registry.register(
  'AdminVerifyProviderInput',
  z.object({
    verified: z.boolean(),
    notes: z.string().optional(),
  })
);

export const AdminHospitalInput = registry.register(
  'AdminHospitalInput',
  z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    address: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    country: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(10),
    website: z.string().url().optional(),
  })
);

export const AdminUserStatusInput = registry.register(
  'AdminUserStatusInput',
  z.object({
    status: z.string().min(1),
    reason: z.string().optional(),
  })
);

export const AdminProvisionUserInput = registry.register(
  'AdminProvisionUserInput',
  z
    .object({
      email: z.string().email().optional(),
      phone: z.string().min(7).optional(),
      password: z.string().min(8),
      role: z.enum(['HOSPITAL_ADMIN']),
      hospitalId: z.string().uuid().optional(),
    })
    .refine((data) => data.email || data.phone, {
      message: 'Either email or phone is required',
      path: ['email'],
    })
);

// Pharmacy
export const PharmacyProductInput = registry.register(
  'PharmacyProductInput',
  z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    category: z.string().optional(),
    price: z.number().nonnegative(),
    stock: z.number().int().nonnegative(),
    imageUrl: z.string().url().optional(),
    requiresPrescription: z.boolean().optional(),
  })
);

export const PharmacyOrderStatusInput = registry.register(
  'PharmacyOrderStatusInput',
  z.object({
    status: z.string().min(1),
  })
);

export const FulfillPrescriptionInput = registry.register(
  'FulfillPrescriptionInput',
  z.object({
    prescriptionId: z.string().uuid(),
    deliveryType: z.string().optional(),
    deliveryAddress: z.string().optional(),
    notes: z.string().optional(),
  })
);

// Subscriptions & payments
export const SubscriptionUpgradeInput = registry.register(
  'SubscriptionUpgradeInput',
  z.object({
    plan: z.string().optional(),
  })
);

export const PaymentInitializeInput = registry.register(
  'PaymentInitializeInput',
  z.object({
    amount: z.number().optional(),
    email: z.string().email(),
    type: z.string().min(1),
    referenceId: z.string().optional(),
  })
);

// Auth 2FA
export const TwoFactorVerifyInput = registry.register(
  'TwoFactorVerifyInput',
  z.object({
    code: z.string().min(6).max(8),
  })
);

export type CreateConversationInput = z.infer<typeof CreateConversationInput>;
export type SendMessageInput = z.infer<typeof SendMessageInput>;
export type MarkConversationReadInput = z.infer<typeof MarkConversationReadInput>;
export type CreateTelemedicineRoomInput = z.infer<typeof CreateTelemedicineRoomInput>;
export type PushTokenInput = z.infer<typeof PushTokenInput>;
export type NotificationPreferencesInput = z.infer<typeof NotificationPreferencesInput>;
export type TestNotificationInput = z.infer<typeof TestNotificationInput>;
export type AdminVerifyProviderInput = z.infer<typeof AdminVerifyProviderInput>;
export type AdminHospitalInput = z.infer<typeof AdminHospitalInput>;
export type AdminUserStatusInput = z.infer<typeof AdminUserStatusInput>;
export type AdminProvisionUserInput = z.infer<typeof AdminProvisionUserInput>;
export type PharmacyProductInput = z.infer<typeof PharmacyProductInput>;
export type PharmacyOrderStatusInput = z.infer<typeof PharmacyOrderStatusInput>;
export type FulfillPrescriptionInput = z.infer<typeof FulfillPrescriptionInput>;
export type SubscriptionUpgradeInput = z.infer<typeof SubscriptionUpgradeInput>;
export type PaymentInitializeInput = z.infer<typeof PaymentInitializeInput>;
export type TwoFactorVerifyInput = z.infer<typeof TwoFactorVerifyInput>;
