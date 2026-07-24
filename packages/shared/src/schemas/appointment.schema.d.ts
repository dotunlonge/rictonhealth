import { z } from './zod';
export declare const AppointmentSchema: z.ZodObject<{
    id: z.ZodString;
    patientId: z.ZodString;
    providerId: z.ZodString;
    hospitalId: z.ZodNullable<z.ZodString>;
    scheduledAt: z.ZodString;
    durationMinutes: z.ZodNumber;
    type: z.ZodEnum<["IN_PERSON", "VIDEO"]>;
    status: z.ZodString;
    notes: z.ZodNullable<z.ZodString>;
    cancellationReason: z.ZodNullable<z.ZodString>;
    reason: z.ZodNullable<z.ZodString>;
    reminderSentAt: z.ZodNullable<z.ZodString>;
    cancelledBy: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "IN_PERSON" | "VIDEO";
    status: string;
    id: string;
    notes: string | null;
    createdAt: string;
    patientId: string;
    providerId: string;
    hospitalId: string | null;
    scheduledAt: string;
    durationMinutes: number;
    cancellationReason: string | null;
    reason: string | null;
    reminderSentAt: string | null;
    cancelledBy: string | null;
    updatedAt: string;
}, {
    type: "IN_PERSON" | "VIDEO";
    status: string;
    id: string;
    notes: string | null;
    createdAt: string;
    patientId: string;
    providerId: string;
    hospitalId: string | null;
    scheduledAt: string;
    durationMinutes: number;
    cancellationReason: string | null;
    reason: string | null;
    reminderSentAt: string | null;
    cancelledBy: string | null;
    updatedAt: string;
}>;
export declare const GetSlotsResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: string[];
}, {
    success: boolean;
    data: string[];
}>;
export declare const BookAppointmentInputSchema: z.ZodObject<{
    providerId: z.ZodString;
    hospitalId: z.ZodOptional<z.ZodString>;
    scheduledAt: z.ZodString;
    type: z.ZodEnum<["IN_PERSON", "VIDEO"]>;
    notes: z.ZodOptional<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
    durationMinutes: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "IN_PERSON" | "VIDEO";
    providerId: string;
    scheduledAt: string;
    notes?: string | undefined;
    hospitalId?: string | undefined;
    durationMinutes?: number | undefined;
    reason?: string | undefined;
}, {
    type: "IN_PERSON" | "VIDEO";
    providerId: string;
    scheduledAt: string;
    notes?: string | undefined;
    hospitalId?: string | undefined;
    durationMinutes?: number | undefined;
    reason?: string | undefined;
}>;
export declare const GetAppointmentResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        id: z.ZodString;
        patientId: z.ZodString;
        providerId: z.ZodString;
        hospitalId: z.ZodNullable<z.ZodString>;
        scheduledAt: z.ZodString;
        durationMinutes: z.ZodNumber;
        type: z.ZodEnum<["IN_PERSON", "VIDEO"]>;
        status: z.ZodString;
        notes: z.ZodNullable<z.ZodString>;
        cancellationReason: z.ZodNullable<z.ZodString>;
        reason: z.ZodNullable<z.ZodString>;
        reminderSentAt: z.ZodNullable<z.ZodString>;
        cancelledBy: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "IN_PERSON" | "VIDEO";
        status: string;
        id: string;
        notes: string | null;
        createdAt: string;
        patientId: string;
        providerId: string;
        hospitalId: string | null;
        scheduledAt: string;
        durationMinutes: number;
        cancellationReason: string | null;
        reason: string | null;
        reminderSentAt: string | null;
        cancelledBy: string | null;
        updatedAt: string;
    }, {
        type: "IN_PERSON" | "VIDEO";
        status: string;
        id: string;
        notes: string | null;
        createdAt: string;
        patientId: string;
        providerId: string;
        hospitalId: string | null;
        scheduledAt: string;
        durationMinutes: number;
        cancellationReason: string | null;
        reason: string | null;
        reminderSentAt: string | null;
        cancelledBy: string | null;
        updatedAt: string;
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: {
        type: "IN_PERSON" | "VIDEO";
        status: string;
        id: string;
        notes: string | null;
        createdAt: string;
        patientId: string;
        providerId: string;
        hospitalId: string | null;
        scheduledAt: string;
        durationMinutes: number;
        cancellationReason: string | null;
        reason: string | null;
        reminderSentAt: string | null;
        cancelledBy: string | null;
        updatedAt: string;
    };
}, {
    success: boolean;
    data: {
        type: "IN_PERSON" | "VIDEO";
        status: string;
        id: string;
        notes: string | null;
        createdAt: string;
        patientId: string;
        providerId: string;
        hospitalId: string | null;
        scheduledAt: string;
        durationMinutes: number;
        cancellationReason: string | null;
        reason: string | null;
        reminderSentAt: string | null;
        cancelledBy: string | null;
        updatedAt: string;
    };
}>;
export declare const ListAppointmentsResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        appointments: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            patientId: z.ZodString;
            providerId: z.ZodString;
            hospitalId: z.ZodNullable<z.ZodString>;
            scheduledAt: z.ZodString;
            durationMinutes: z.ZodNumber;
            type: z.ZodEnum<["IN_PERSON", "VIDEO"]>;
            status: z.ZodString;
            notes: z.ZodNullable<z.ZodString>;
            cancellationReason: z.ZodNullable<z.ZodString>;
            reason: z.ZodNullable<z.ZodString>;
            reminderSentAt: z.ZodNullable<z.ZodString>;
            cancelledBy: z.ZodNullable<z.ZodString>;
            createdAt: z.ZodString;
            updatedAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "IN_PERSON" | "VIDEO";
            status: string;
            id: string;
            notes: string | null;
            createdAt: string;
            patientId: string;
            providerId: string;
            hospitalId: string | null;
            scheduledAt: string;
            durationMinutes: number;
            cancellationReason: string | null;
            reason: string | null;
            reminderSentAt: string | null;
            cancelledBy: string | null;
            updatedAt: string;
        }, {
            type: "IN_PERSON" | "VIDEO";
            status: string;
            id: string;
            notes: string | null;
            createdAt: string;
            patientId: string;
            providerId: string;
            hospitalId: string | null;
            scheduledAt: string;
            durationMinutes: number;
            cancellationReason: string | null;
            reason: string | null;
            reminderSentAt: string | null;
            cancelledBy: string | null;
            updatedAt: string;
        }>, "many">;
        meta: z.ZodObject<{
            total: z.ZodNumber;
            limit: z.ZodNumber;
            offset: z.ZodNumber;
            hasMore: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            limit: number;
            offset: number;
            total: number;
            hasMore: boolean;
        }, {
            limit: number;
            offset: number;
            total: number;
            hasMore: boolean;
        }>;
    }, "strip", z.ZodTypeAny, {
        meta: {
            limit: number;
            offset: number;
            total: number;
            hasMore: boolean;
        };
        appointments: {
            type: "IN_PERSON" | "VIDEO";
            status: string;
            id: string;
            notes: string | null;
            createdAt: string;
            patientId: string;
            providerId: string;
            hospitalId: string | null;
            scheduledAt: string;
            durationMinutes: number;
            cancellationReason: string | null;
            reason: string | null;
            reminderSentAt: string | null;
            cancelledBy: string | null;
            updatedAt: string;
        }[];
    }, {
        meta: {
            limit: number;
            offset: number;
            total: number;
            hasMore: boolean;
        };
        appointments: {
            type: "IN_PERSON" | "VIDEO";
            status: string;
            id: string;
            notes: string | null;
            createdAt: string;
            patientId: string;
            providerId: string;
            hospitalId: string | null;
            scheduledAt: string;
            durationMinutes: number;
            cancellationReason: string | null;
            reason: string | null;
            reminderSentAt: string | null;
            cancelledBy: string | null;
            updatedAt: string;
        }[];
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: {
        meta: {
            limit: number;
            offset: number;
            total: number;
            hasMore: boolean;
        };
        appointments: {
            type: "IN_PERSON" | "VIDEO";
            status: string;
            id: string;
            notes: string | null;
            createdAt: string;
            patientId: string;
            providerId: string;
            hospitalId: string | null;
            scheduledAt: string;
            durationMinutes: number;
            cancellationReason: string | null;
            reason: string | null;
            reminderSentAt: string | null;
            cancelledBy: string | null;
            updatedAt: string;
        }[];
    };
}, {
    success: boolean;
    data: {
        meta: {
            limit: number;
            offset: number;
            total: number;
            hasMore: boolean;
        };
        appointments: {
            type: "IN_PERSON" | "VIDEO";
            status: string;
            id: string;
            notes: string | null;
            createdAt: string;
            patientId: string;
            providerId: string;
            hospitalId: string | null;
            scheduledAt: string;
            durationMinutes: number;
            cancellationReason: string | null;
            reason: string | null;
            reminderSentAt: string | null;
            cancelledBy: string | null;
            updatedAt: string;
        }[];
    };
}>;
export declare const CreateAppointmentSchema: z.ZodObject<{
    providerId: z.ZodString;
    scheduledAt: z.ZodString;
    type: z.ZodEnum<["IN_PERSON", "VIDEO"]>;
    reason: z.ZodOptional<z.ZodString>;
    durationMinutes: z.ZodOptional<z.ZodNumber>;
    hospitalId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "IN_PERSON" | "VIDEO";
    providerId: string;
    scheduledAt: string;
    hospitalId?: string | undefined;
    durationMinutes?: number | undefined;
    reason?: string | undefined;
}, {
    type: "IN_PERSON" | "VIDEO";
    providerId: string;
    scheduledAt: string;
    hospitalId?: string | undefined;
    durationMinutes?: number | undefined;
    reason?: string | undefined;
}>;
export declare const UpdateAppointmentStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"]>;
    cancellationReason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
    cancellationReason?: string | undefined;
}, {
    status: "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
    cancellationReason?: string | undefined;
}>;
export declare const GetAvailabilityQuerySchema: z.ZodObject<{
    providerId: z.ZodString;
    date: z.ZodString;
}, "strip", z.ZodTypeAny, {
    date: string;
    providerId: string;
}, {
    date: string;
    providerId: string;
}>;
export declare const GetAppointmentsQuerySchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodString>;
    offset: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type?: string | undefined;
    status?: string | undefined;
    limit?: string | undefined;
    offset?: string | undefined;
    from?: string | undefined;
    to?: string | undefined;
}, {
    type?: string | undefined;
    status?: string | undefined;
    limit?: string | undefined;
    offset?: string | undefined;
    from?: string | undefined;
    to?: string | undefined;
}>;
export type AppointmentSchema = z.infer<typeof AppointmentSchema>;
export type GetSlotsResponseSchema = z.infer<typeof GetSlotsResponseSchema>;
export type BookAppointmentInputSchema = z.infer<typeof BookAppointmentInputSchema>;
export type GetAppointmentResponseSchema = z.infer<typeof GetAppointmentResponseSchema>;
export type ListAppointmentsResponseSchema = z.infer<typeof ListAppointmentsResponseSchema>;
export type CreateAppointmentSchema = z.infer<typeof CreateAppointmentSchema>;
export type UpdateAppointmentStatusSchema = z.infer<typeof UpdateAppointmentStatusSchema>;
export type GetAvailabilityQuerySchema = z.infer<typeof GetAvailabilityQuerySchema>;
export type GetAppointmentsQuerySchema = z.infer<typeof GetAppointmentsQuerySchema>;
