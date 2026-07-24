import { z } from './zod';
export declare const AddressSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    addressLine1: z.ZodString;
    addressLine2: z.ZodNullable<z.ZodString>;
    city: z.ZodString;
    state: z.ZodString;
    country: z.ZodString;
    postalCode: z.ZodNullable<z.ZodString>;
    latitude: z.ZodNullable<z.ZodNumber>;
    longitude: z.ZodNullable<z.ZodNumber>;
    isDefault: z.ZodBoolean;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    userId: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    country: string;
    postalCode: string | null;
    latitude: number | null;
    longitude: number | null;
    isDefault: boolean;
}, {
    id: string;
    createdAt: string;
    userId: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    country: string;
    postalCode: string | null;
    latitude: number | null;
    longitude: number | null;
    isDefault: boolean;
}>;
export declare const CreateAddressInputSchema: z.ZodObject<{
    addressLine1: z.ZodString;
    addressLine2: z.ZodOptional<z.ZodString>;
    city: z.ZodString;
    state: z.ZodString;
    country: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    postalCode: z.ZodOptional<z.ZodString>;
    latitude: z.ZodOptional<z.ZodNumber>;
    longitude: z.ZodOptional<z.ZodNumber>;
    isDefault: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    addressLine1: string;
    city: string;
    state: string;
    country: string;
    isDefault: boolean;
    addressLine2?: string | undefined;
    postalCode?: string | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
}, {
    addressLine1: string;
    city: string;
    state: string;
    addressLine2?: string | undefined;
    country?: string | undefined;
    postalCode?: string | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    isDefault?: boolean | undefined;
}>;
export declare const UpdateAddressInputSchema: z.ZodObject<{
    addressLine1: z.ZodOptional<z.ZodString>;
    addressLine2: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    country: z.ZodOptional<z.ZodString>;
    postalCode: z.ZodOptional<z.ZodString>;
    latitude: z.ZodOptional<z.ZodNumber>;
    longitude: z.ZodOptional<z.ZodNumber>;
    isDefault: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    addressLine1?: string | undefined;
    addressLine2?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    country?: string | undefined;
    postalCode?: string | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    isDefault?: boolean | undefined;
}, {
    addressLine1?: string | undefined;
    addressLine2?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    country?: string | undefined;
    postalCode?: string | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    isDefault?: boolean | undefined;
}>;
export declare const ValidateAddressInputSchema: z.ZodObject<{
    addressLine1: z.ZodString;
    city: z.ZodString;
    state: z.ZodString;
    country: z.ZodOptional<z.ZodString>;
    postalCode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    addressLine1: string;
    city: string;
    state: string;
    country?: string | undefined;
    postalCode?: string | undefined;
}, {
    addressLine1: string;
    city: string;
    state: string;
    country?: string | undefined;
    postalCode?: string | undefined;
}>;
export declare const AddressListResponseSchema: z.ZodObject<{
    addresses: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        addressLine1: z.ZodString;
        addressLine2: z.ZodNullable<z.ZodString>;
        city: z.ZodString;
        state: z.ZodString;
        country: z.ZodString;
        postalCode: z.ZodNullable<z.ZodString>;
        latitude: z.ZodNullable<z.ZodNumber>;
        longitude: z.ZodNullable<z.ZodNumber>;
        isDefault: z.ZodBoolean;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: string;
        userId: string;
        addressLine1: string;
        addressLine2: string | null;
        city: string;
        state: string;
        country: string;
        postalCode: string | null;
        latitude: number | null;
        longitude: number | null;
        isDefault: boolean;
    }, {
        id: string;
        createdAt: string;
        userId: string;
        addressLine1: string;
        addressLine2: string | null;
        city: string;
        state: string;
        country: string;
        postalCode: string | null;
        latitude: number | null;
        longitude: number | null;
        isDefault: boolean;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    addresses: {
        id: string;
        createdAt: string;
        userId: string;
        addressLine1: string;
        addressLine2: string | null;
        city: string;
        state: string;
        country: string;
        postalCode: string | null;
        latitude: number | null;
        longitude: number | null;
        isDefault: boolean;
    }[];
}, {
    addresses: {
        id: string;
        createdAt: string;
        userId: string;
        addressLine1: string;
        addressLine2: string | null;
        city: string;
        state: string;
        country: string;
        postalCode: string | null;
        latitude: number | null;
        longitude: number | null;
        isDefault: boolean;
    }[];
}>;
export type AddressSchema = z.infer<typeof AddressSchema>;
export type CreateAddressInputSchema = z.infer<typeof CreateAddressInputSchema>;
export type UpdateAddressInputSchema = z.infer<typeof UpdateAddressInputSchema>;
export type ValidateAddressInputSchema = z.infer<typeof ValidateAddressInputSchema>;
export type AddressListResponseSchema = z.infer<typeof AddressListResponseSchema>;
