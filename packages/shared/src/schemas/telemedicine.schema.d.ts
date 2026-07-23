import { z } from './zod';
export declare const TelemedicineRoomSchema: z.ZodObject<{
    id: z.ZodString;
    appointmentId: z.ZodNullable<z.ZodString>;
    providerId: z.ZodString;
    roomType: z.ZodEnum<["ONE_ON_ONE", "MDT"]>;
    externalRoomId: z.ZodString;
    externalRoomUrl: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["CREATED", "ACTIVE", "ENDED"]>;
    startedAt: z.ZodNullable<z.ZodString>;
    endedAt: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "CREATED" | "ACTIVE" | "ENDED";
    id: string;
    createdAt: string;
    providerId: string;
    updatedAt: string;
    appointmentId: string | null;
    roomType: "MDT" | "ONE_ON_ONE";
    externalRoomId: string;
    externalRoomUrl: string | null;
    startedAt: string | null;
    endedAt: string | null;
}, {
    status: "CREATED" | "ACTIVE" | "ENDED";
    id: string;
    createdAt: string;
    providerId: string;
    updatedAt: string;
    appointmentId: string | null;
    roomType: "MDT" | "ONE_ON_ONE";
    externalRoomId: string;
    externalRoomUrl: string | null;
    startedAt: string | null;
    endedAt: string | null;
}>;
export declare const GetTokenResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        token: z.ZodString;
        room: z.ZodObject<{
            id: z.ZodString;
            appointmentId: z.ZodNullable<z.ZodString>;
            providerId: z.ZodString;
            roomType: z.ZodEnum<["ONE_ON_ONE", "MDT"]>;
            externalRoomId: z.ZodString;
            externalRoomUrl: z.ZodNullable<z.ZodString>;
            status: z.ZodEnum<["CREATED", "ACTIVE", "ENDED"]>;
            startedAt: z.ZodNullable<z.ZodString>;
            endedAt: z.ZodNullable<z.ZodString>;
            createdAt: z.ZodString;
            updatedAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            status: "CREATED" | "ACTIVE" | "ENDED";
            id: string;
            createdAt: string;
            providerId: string;
            updatedAt: string;
            appointmentId: string | null;
            roomType: "MDT" | "ONE_ON_ONE";
            externalRoomId: string;
            externalRoomUrl: string | null;
            startedAt: string | null;
            endedAt: string | null;
        }, {
            status: "CREATED" | "ACTIVE" | "ENDED";
            id: string;
            createdAt: string;
            providerId: string;
            updatedAt: string;
            appointmentId: string | null;
            roomType: "MDT" | "ONE_ON_ONE";
            externalRoomId: string;
            externalRoomUrl: string | null;
            startedAt: string | null;
            endedAt: string | null;
        }>;
    }, "strip", z.ZodTypeAny, {
        token: string;
        room: {
            status: "CREATED" | "ACTIVE" | "ENDED";
            id: string;
            createdAt: string;
            providerId: string;
            updatedAt: string;
            appointmentId: string | null;
            roomType: "MDT" | "ONE_ON_ONE";
            externalRoomId: string;
            externalRoomUrl: string | null;
            startedAt: string | null;
            endedAt: string | null;
        };
    }, {
        token: string;
        room: {
            status: "CREATED" | "ACTIVE" | "ENDED";
            id: string;
            createdAt: string;
            providerId: string;
            updatedAt: string;
            appointmentId: string | null;
            roomType: "MDT" | "ONE_ON_ONE";
            externalRoomId: string;
            externalRoomUrl: string | null;
            startedAt: string | null;
            endedAt: string | null;
        };
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: {
        token: string;
        room: {
            status: "CREATED" | "ACTIVE" | "ENDED";
            id: string;
            createdAt: string;
            providerId: string;
            updatedAt: string;
            appointmentId: string | null;
            roomType: "MDT" | "ONE_ON_ONE";
            externalRoomId: string;
            externalRoomUrl: string | null;
            startedAt: string | null;
            endedAt: string | null;
        };
    };
}, {
    success: boolean;
    data: {
        token: string;
        room: {
            status: "CREATED" | "ACTIVE" | "ENDED";
            id: string;
            createdAt: string;
            providerId: string;
            updatedAt: string;
            appointmentId: string | null;
            roomType: "MDT" | "ONE_ON_ONE";
            externalRoomId: string;
            externalRoomUrl: string | null;
            startedAt: string | null;
            endedAt: string | null;
        };
    };
}>;
export type TelemedicineRoomSchema = z.infer<typeof TelemedicineRoomSchema>;
export type GetTokenResponseSchema = z.infer<typeof GetTokenResponseSchema>;
