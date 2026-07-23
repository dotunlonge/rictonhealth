import { z } from 'zod';
export declare const RangeQuerySchema: z.ZodObject<{
    range: z.ZodDefault<z.ZodEnum<["7d", "30d", "90d", "12m", "all"]>>;
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    range: "7d" | "30d" | "90d" | "12m" | "all";
    from?: string | undefined;
    to?: string | undefined;
}, {
    from?: string | undefined;
    to?: string | undefined;
    range?: "7d" | "30d" | "90d" | "12m" | "all" | undefined;
}>;
export declare const OverviewResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        totalUsers: z.ZodNumber;
        totalPatients: z.ZodNumber;
        totalProviders: z.ZodNumber;
        totalPharmacists: z.ZodNumber;
        totalHospitals: z.ZodNumber;
        totalAppointments: z.ZodNumber;
        completedAppointments: z.ZodNumber;
        totalRevenue: z.ZodNumber;
        activeSubscriptions: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        totalAppointments: number;
        completedAppointments: number;
        totalUsers: number;
        totalPatients: number;
        totalProviders: number;
        totalPharmacists: number;
        totalHospitals: number;
        totalRevenue: number;
        activeSubscriptions: number;
    }, {
        totalAppointments: number;
        completedAppointments: number;
        totalUsers: number;
        totalPatients: number;
        totalProviders: number;
        totalPharmacists: number;
        totalHospitals: number;
        totalRevenue: number;
        activeSubscriptions: number;
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: {
        totalAppointments: number;
        completedAppointments: number;
        totalUsers: number;
        totalPatients: number;
        totalProviders: number;
        totalPharmacists: number;
        totalHospitals: number;
        totalRevenue: number;
        activeSubscriptions: number;
    };
}, {
    success: boolean;
    data: {
        totalAppointments: number;
        completedAppointments: number;
        totalUsers: number;
        totalPatients: number;
        totalProviders: number;
        totalPharmacists: number;
        totalHospitals: number;
        totalRevenue: number;
        activeSubscriptions: number;
    };
}>;
export declare const AppointmentsTrendResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        total: z.ZodNumber;
        byStatus: z.ZodRecord<z.ZodString, z.ZodNumber>;
        byType: z.ZodRecord<z.ZodString, z.ZodNumber>;
        trend: z.ZodArray<z.ZodObject<{
            period: z.ZodString;
            count: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            count: number;
            period: string;
        }, {
            count: number;
            period: string;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        total: number;
        byStatus: Record<string, number>;
        byType: Record<string, number>;
        trend: {
            count: number;
            period: string;
        }[];
    }, {
        total: number;
        byStatus: Record<string, number>;
        byType: Record<string, number>;
        trend: {
            count: number;
            period: string;
        }[];
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: {
        total: number;
        byStatus: Record<string, number>;
        byType: Record<string, number>;
        trend: {
            count: number;
            period: string;
        }[];
    };
}, {
    success: boolean;
    data: {
        total: number;
        byStatus: Record<string, number>;
        byType: Record<string, number>;
        trend: {
            count: number;
            period: string;
        }[];
    };
}>;
export declare const RevenueResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        totalRevenue: z.ZodNumber;
        byType: z.ZodRecord<z.ZodString, z.ZodNumber>;
        trend: z.ZodArray<z.ZodObject<{
            period: z.ZodString;
            amount: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            amount: number;
            period: string;
        }, {
            amount: number;
            period: string;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        totalRevenue: number;
        byType: Record<string, number>;
        trend: {
            amount: number;
            period: string;
        }[];
    }, {
        totalRevenue: number;
        byType: Record<string, number>;
        trend: {
            amount: number;
            period: string;
        }[];
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: {
        totalRevenue: number;
        byType: Record<string, number>;
        trend: {
            amount: number;
            period: string;
        }[];
    };
}, {
    success: boolean;
    data: {
        totalRevenue: number;
        byType: Record<string, number>;
        trend: {
            amount: number;
            period: string;
        }[];
    };
}>;
export declare const UserGrowthResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        totalUsers: z.ZodNumber;
        byRole: z.ZodRecord<z.ZodString, z.ZodNumber>;
        trend: z.ZodArray<z.ZodObject<{
            period: z.ZodString;
            count: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            count: number;
            period: string;
        }, {
            count: number;
            period: string;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        totalUsers: number;
        trend: {
            count: number;
            period: string;
        }[];
        byRole: Record<string, number>;
    }, {
        totalUsers: number;
        trend: {
            count: number;
            period: string;
        }[];
        byRole: Record<string, number>;
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: {
        totalUsers: number;
        trend: {
            count: number;
            period: string;
        }[];
        byRole: Record<string, number>;
    };
}, {
    success: boolean;
    data: {
        totalUsers: number;
        trend: {
            count: number;
            period: string;
        }[];
        byRole: Record<string, number>;
    };
}>;
export declare const ProviderPerformanceResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        providers: z.ZodArray<z.ZodObject<{
            providerId: z.ZodString;
            name: z.ZodString;
            specialty: z.ZodNullable<z.ZodString>;
            appointmentCount: z.ZodNumber;
            completedCount: z.ZodNumber;
            rating: z.ZodNullable<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            specialty: string | null;
            providerId: string;
            appointmentCount: number;
            completedCount: number;
            rating: number | null;
        }, {
            name: string;
            specialty: string | null;
            providerId: string;
            appointmentCount: number;
            completedCount: number;
            rating: number | null;
        }>, "many">;
        total: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        total: number;
        providers: {
            name: string;
            specialty: string | null;
            providerId: string;
            appointmentCount: number;
            completedCount: number;
            rating: number | null;
        }[];
    }, {
        total: number;
        providers: {
            name: string;
            specialty: string | null;
            providerId: string;
            appointmentCount: number;
            completedCount: number;
            rating: number | null;
        }[];
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: {
        total: number;
        providers: {
            name: string;
            specialty: string | null;
            providerId: string;
            appointmentCount: number;
            completedCount: number;
            rating: number | null;
        }[];
    };
}, {
    success: boolean;
    data: {
        total: number;
        providers: {
            name: string;
            specialty: string | null;
            providerId: string;
            appointmentCount: number;
            completedCount: number;
            rating: number | null;
        }[];
    };
}>;
export declare const PharmacyMetricsResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        totalPharmacies: z.ZodNumber;
        verifiedPharmacies: z.ZodNumber;
        totalOrders: z.ZodNumber;
        ordersByStatus: z.ZodRecord<z.ZodString, z.ZodNumber>;
        totalOrderValue: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        totalPharmacies: number;
        verifiedPharmacies: number;
        totalOrders: number;
        ordersByStatus: Record<string, number>;
        totalOrderValue: number;
    }, {
        totalPharmacies: number;
        verifiedPharmacies: number;
        totalOrders: number;
        ordersByStatus: Record<string, number>;
        totalOrderValue: number;
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: {
        totalPharmacies: number;
        verifiedPharmacies: number;
        totalOrders: number;
        ordersByStatus: Record<string, number>;
        totalOrderValue: number;
    };
}, {
    success: boolean;
    data: {
        totalPharmacies: number;
        verifiedPharmacies: number;
        totalOrders: number;
        ordersByStatus: Record<string, number>;
        totalOrderValue: number;
    };
}>;
export type RangeQuerySchema = z.infer<typeof RangeQuerySchema>;
export type OverviewResponseSchema = z.infer<typeof OverviewResponseSchema>;
export type AppointmentsTrendResponseSchema = z.infer<typeof AppointmentsTrendResponseSchema>;
export type RevenueResponseSchema = z.infer<typeof RevenueResponseSchema>;
export type UserGrowthResponseSchema = z.infer<typeof UserGrowthResponseSchema>;
export type ProviderPerformanceResponseSchema = z.infer<typeof ProviderPerformanceResponseSchema>;
export type PharmacyMetricsResponseSchema = z.infer<typeof PharmacyMetricsResponseSchema>;
