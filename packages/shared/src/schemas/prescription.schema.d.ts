import { z } from './zod';
export declare const PrescriptionItemSchema: z.ZodObject<{
    id: z.ZodString;
    prescriptionId: z.ZodString;
    drugName: z.ZodString;
    dosage: z.ZodString;
    quantity: z.ZodNumber;
    frequency: z.ZodString;
    duration: z.ZodString;
    instructions: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    prescriptionId: string;
    drugName: string;
    dosage: string;
    quantity: number;
    frequency: string;
    duration: string;
    instructions: string | null;
}, {
    id: string;
    createdAt: string;
    prescriptionId: string;
    drugName: string;
    dosage: string;
    quantity: number;
    frequency: string;
    duration: string;
    instructions: string | null;
}>;
export declare const PrescriptionSchema: z.ZodObject<{
    id: z.ZodString;
    appointmentId: z.ZodNullable<z.ZodString>;
    patientId: z.ZodString;
    providerId: z.ZodString;
    pharmacyId: z.ZodNullable<z.ZodString>;
    status: z.ZodString;
    signedAt: z.ZodNullable<z.ZodString>;
    notes: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    items: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        prescriptionId: z.ZodString;
        drugName: z.ZodString;
        dosage: z.ZodString;
        quantity: z.ZodNumber;
        frequency: z.ZodString;
        duration: z.ZodString;
        instructions: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: string;
        prescriptionId: string;
        drugName: string;
        dosage: string;
        quantity: number;
        frequency: string;
        duration: string;
        instructions: string | null;
    }, {
        id: string;
        createdAt: string;
        prescriptionId: string;
        drugName: string;
        dosage: string;
        quantity: number;
        frequency: string;
        duration: string;
        instructions: string | null;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    status: string;
    id: string;
    notes: string | null;
    createdAt: string;
    patientId: string;
    providerId: string;
    updatedAt: string;
    appointmentId: string | null;
    pharmacyId: string | null;
    signedAt: string | null;
    items?: {
        id: string;
        createdAt: string;
        prescriptionId: string;
        drugName: string;
        dosage: string;
        quantity: number;
        frequency: string;
        duration: string;
        instructions: string | null;
    }[] | undefined;
}, {
    status: string;
    id: string;
    notes: string | null;
    createdAt: string;
    patientId: string;
    providerId: string;
    updatedAt: string;
    appointmentId: string | null;
    pharmacyId: string | null;
    signedAt: string | null;
    items?: {
        id: string;
        createdAt: string;
        prescriptionId: string;
        drugName: string;
        dosage: string;
        quantity: number;
        frequency: string;
        duration: string;
        instructions: string | null;
    }[] | undefined;
}>;
export declare const CreatePrescriptionInputSchema: z.ZodObject<{
    patientId: z.ZodString;
    appointmentId: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    items: z.ZodArray<z.ZodObject<{
        drugName: z.ZodString;
        dosage: z.ZodString;
        quantity: z.ZodNumber;
        frequency: z.ZodString;
        duration: z.ZodString;
        instructions: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        drugName: string;
        dosage: string;
        quantity: number;
        frequency: string;
        duration: string;
        instructions?: string | undefined;
    }, {
        drugName: string;
        dosage: string;
        quantity: number;
        frequency: string;
        duration: string;
        instructions?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    items: {
        drugName: string;
        dosage: string;
        quantity: number;
        frequency: string;
        duration: string;
        instructions?: string | undefined;
    }[];
    patientId: string;
    notes?: string | undefined;
    appointmentId?: string | undefined;
}, {
    items: {
        drugName: string;
        dosage: string;
        quantity: number;
        frequency: string;
        duration: string;
        instructions?: string | undefined;
    }[];
    patientId: string;
    notes?: string | undefined;
    appointmentId?: string | undefined;
}>;
export declare const SignPrescriptionInputSchema: z.ZodObject<{
    otpCode: z.ZodString;
}, "strip", z.ZodTypeAny, {
    otpCode: string;
}, {
    otpCode: string;
}>;
export declare const GetPrescriptionResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        id: z.ZodString;
        appointmentId: z.ZodNullable<z.ZodString>;
        patientId: z.ZodString;
        providerId: z.ZodString;
        pharmacyId: z.ZodNullable<z.ZodString>;
        status: z.ZodString;
        signedAt: z.ZodNullable<z.ZodString>;
        notes: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        items: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            prescriptionId: z.ZodString;
            drugName: z.ZodString;
            dosage: z.ZodString;
            quantity: z.ZodNumber;
            frequency: z.ZodString;
            duration: z.ZodString;
            instructions: z.ZodNullable<z.ZodString>;
            createdAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            createdAt: string;
            prescriptionId: string;
            drugName: string;
            dosage: string;
            quantity: number;
            frequency: string;
            duration: string;
            instructions: string | null;
        }, {
            id: string;
            createdAt: string;
            prescriptionId: string;
            drugName: string;
            dosage: string;
            quantity: number;
            frequency: string;
            duration: string;
            instructions: string | null;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        status: string;
        id: string;
        notes: string | null;
        createdAt: string;
        patientId: string;
        providerId: string;
        updatedAt: string;
        appointmentId: string | null;
        pharmacyId: string | null;
        signedAt: string | null;
        items?: {
            id: string;
            createdAt: string;
            prescriptionId: string;
            drugName: string;
            dosage: string;
            quantity: number;
            frequency: string;
            duration: string;
            instructions: string | null;
        }[] | undefined;
    }, {
        status: string;
        id: string;
        notes: string | null;
        createdAt: string;
        patientId: string;
        providerId: string;
        updatedAt: string;
        appointmentId: string | null;
        pharmacyId: string | null;
        signedAt: string | null;
        items?: {
            id: string;
            createdAt: string;
            prescriptionId: string;
            drugName: string;
            dosage: string;
            quantity: number;
            frequency: string;
            duration: string;
            instructions: string | null;
        }[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: {
        status: string;
        id: string;
        notes: string | null;
        createdAt: string;
        patientId: string;
        providerId: string;
        updatedAt: string;
        appointmentId: string | null;
        pharmacyId: string | null;
        signedAt: string | null;
        items?: {
            id: string;
            createdAt: string;
            prescriptionId: string;
            drugName: string;
            dosage: string;
            quantity: number;
            frequency: string;
            duration: string;
            instructions: string | null;
        }[] | undefined;
    };
}, {
    success: boolean;
    data: {
        status: string;
        id: string;
        notes: string | null;
        createdAt: string;
        patientId: string;
        providerId: string;
        updatedAt: string;
        appointmentId: string | null;
        pharmacyId: string | null;
        signedAt: string | null;
        items?: {
            id: string;
            createdAt: string;
            prescriptionId: string;
            drugName: string;
            dosage: string;
            quantity: number;
            frequency: string;
            duration: string;
            instructions: string | null;
        }[] | undefined;
    };
}>;
export declare const ListPrescriptionsResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        appointmentId: z.ZodNullable<z.ZodString>;
        patientId: z.ZodString;
        providerId: z.ZodString;
        pharmacyId: z.ZodNullable<z.ZodString>;
        status: z.ZodString;
        signedAt: z.ZodNullable<z.ZodString>;
        notes: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        items: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            prescriptionId: z.ZodString;
            drugName: z.ZodString;
            dosage: z.ZodString;
            quantity: z.ZodNumber;
            frequency: z.ZodString;
            duration: z.ZodString;
            instructions: z.ZodNullable<z.ZodString>;
            createdAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            createdAt: string;
            prescriptionId: string;
            drugName: string;
            dosage: string;
            quantity: number;
            frequency: string;
            duration: string;
            instructions: string | null;
        }, {
            id: string;
            createdAt: string;
            prescriptionId: string;
            drugName: string;
            dosage: string;
            quantity: number;
            frequency: string;
            duration: string;
            instructions: string | null;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        status: string;
        id: string;
        notes: string | null;
        createdAt: string;
        patientId: string;
        providerId: string;
        updatedAt: string;
        appointmentId: string | null;
        pharmacyId: string | null;
        signedAt: string | null;
        items?: {
            id: string;
            createdAt: string;
            prescriptionId: string;
            drugName: string;
            dosage: string;
            quantity: number;
            frequency: string;
            duration: string;
            instructions: string | null;
        }[] | undefined;
    }, {
        status: string;
        id: string;
        notes: string | null;
        createdAt: string;
        patientId: string;
        providerId: string;
        updatedAt: string;
        appointmentId: string | null;
        pharmacyId: string | null;
        signedAt: string | null;
        items?: {
            id: string;
            createdAt: string;
            prescriptionId: string;
            drugName: string;
            dosage: string;
            quantity: number;
            frequency: string;
            duration: string;
            instructions: string | null;
        }[] | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: {
        status: string;
        id: string;
        notes: string | null;
        createdAt: string;
        patientId: string;
        providerId: string;
        updatedAt: string;
        appointmentId: string | null;
        pharmacyId: string | null;
        signedAt: string | null;
        items?: {
            id: string;
            createdAt: string;
            prescriptionId: string;
            drugName: string;
            dosage: string;
            quantity: number;
            frequency: string;
            duration: string;
            instructions: string | null;
        }[] | undefined;
    }[];
}, {
    success: boolean;
    data: {
        status: string;
        id: string;
        notes: string | null;
        createdAt: string;
        patientId: string;
        providerId: string;
        updatedAt: string;
        appointmentId: string | null;
        pharmacyId: string | null;
        signedAt: string | null;
        items?: {
            id: string;
            createdAt: string;
            prescriptionId: string;
            drugName: string;
            dosage: string;
            quantity: number;
            frequency: string;
            duration: string;
            instructions: string | null;
        }[] | undefined;
    }[];
}>;
export type PrescriptionItemSchema = z.infer<typeof PrescriptionItemSchema>;
export type PrescriptionSchema = z.infer<typeof PrescriptionSchema>;
export type CreatePrescriptionInputSchema = z.infer<typeof CreatePrescriptionInputSchema>;
export type SignPrescriptionInputSchema = z.infer<typeof SignPrescriptionInputSchema>;
export type GetPrescriptionResponseSchema = z.infer<typeof GetPrescriptionResponseSchema>;
export type ListPrescriptionsResponseSchema = z.infer<typeof ListPrescriptionsResponseSchema>;
