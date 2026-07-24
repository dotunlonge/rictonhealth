import { z } from './zod';
export declare const UserProfileSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodNullable<z.ZodString>;
    phone: z.ZodNullable<z.ZodString>;
    role: z.ZodString;
    status: z.ZodString;
    patientProfile: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        firstName: z.ZodNullable<z.ZodString>;
        lastName: z.ZodNullable<z.ZodString>;
        dateOfBirth: z.ZodNullable<z.ZodString>;
        gender: z.ZodNullable<z.ZodString>;
        bloodType: z.ZodNullable<z.ZodString>;
        allergies: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
        medicalHistory: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
            condition: z.ZodString;
            diagnosedAt: z.ZodOptional<z.ZodString>;
            notes: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            condition: string;
            diagnosedAt?: string | undefined;
            notes?: string | undefined;
        }, {
            condition: string;
            diagnosedAt?: string | undefined;
            notes?: string | undefined;
        }>, "many">>>;
        emergencyContact: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            name: z.ZodString;
            relationship: z.ZodString;
            phone: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            phone: string;
            relationship: string;
        }, {
            name: string;
            phone: string;
            relationship: string;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        firstName: string | null;
        lastName: string | null;
        dateOfBirth: string | null;
        gender: string | null;
        bloodType: string | null;
        allergies?: string[] | null | undefined;
        medicalHistory?: {
            condition: string;
            diagnosedAt?: string | undefined;
            notes?: string | undefined;
        }[] | null | undefined;
        emergencyContact?: {
            name: string;
            phone: string;
            relationship: string;
        } | null | undefined;
    }, {
        firstName: string | null;
        lastName: string | null;
        dateOfBirth: string | null;
        gender: string | null;
        bloodType: string | null;
        allergies?: string[] | null | undefined;
        medicalHistory?: {
            condition: string;
            diagnosedAt?: string | undefined;
            notes?: string | undefined;
        }[] | null | undefined;
        emergencyContact?: {
            name: string;
            phone: string;
            relationship: string;
        } | null | undefined;
    }>>>;
    providerProfile: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        firstName: z.ZodNullable<z.ZodString>;
        lastName: z.ZodNullable<z.ZodString>;
        specialty: z.ZodNullable<z.ZodString>;
        consultationFee: z.ZodNullable<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        firstName: string | null;
        lastName: string | null;
        specialty: string | null;
        consultationFee: number | null;
    }, {
        firstName: string | null;
        lastName: string | null;
        specialty: string | null;
        consultationFee: number | null;
    }>>>;
    pharmacyProfile: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        pharmacyName: z.ZodString;
        licenseNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        isVerified: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        pharmacyName: string;
        licenseNumber?: string | null | undefined;
        isVerified?: boolean | undefined;
    }, {
        pharmacyName: string;
        licenseNumber?: string | null | undefined;
        isVerified?: boolean | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    email: string | null;
    phone: string | null;
    role: string;
    status: string;
    id: string;
    patientProfile?: {
        firstName: string | null;
        lastName: string | null;
        dateOfBirth: string | null;
        gender: string | null;
        bloodType: string | null;
        allergies?: string[] | null | undefined;
        medicalHistory?: {
            condition: string;
            diagnosedAt?: string | undefined;
            notes?: string | undefined;
        }[] | null | undefined;
        emergencyContact?: {
            name: string;
            phone: string;
            relationship: string;
        } | null | undefined;
    } | null | undefined;
    providerProfile?: {
        firstName: string | null;
        lastName: string | null;
        specialty: string | null;
        consultationFee: number | null;
    } | null | undefined;
    pharmacyProfile?: {
        pharmacyName: string;
        licenseNumber?: string | null | undefined;
        isVerified?: boolean | undefined;
    } | null | undefined;
}, {
    email: string | null;
    phone: string | null;
    role: string;
    status: string;
    id: string;
    patientProfile?: {
        firstName: string | null;
        lastName: string | null;
        dateOfBirth: string | null;
        gender: string | null;
        bloodType: string | null;
        allergies?: string[] | null | undefined;
        medicalHistory?: {
            condition: string;
            diagnosedAt?: string | undefined;
            notes?: string | undefined;
        }[] | null | undefined;
        emergencyContact?: {
            name: string;
            phone: string;
            relationship: string;
        } | null | undefined;
    } | null | undefined;
    providerProfile?: {
        firstName: string | null;
        lastName: string | null;
        specialty: string | null;
        consultationFee: number | null;
    } | null | undefined;
    pharmacyProfile?: {
        pharmacyName: string;
        licenseNumber?: string | null | undefined;
        isVerified?: boolean | undefined;
    } | null | undefined;
}>;
export declare const GetUserResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        id: z.ZodString;
        email: z.ZodNullable<z.ZodString>;
        phone: z.ZodNullable<z.ZodString>;
        role: z.ZodString;
        status: z.ZodString;
        patientProfile: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            firstName: z.ZodNullable<z.ZodString>;
            lastName: z.ZodNullable<z.ZodString>;
            dateOfBirth: z.ZodNullable<z.ZodString>;
            gender: z.ZodNullable<z.ZodString>;
            bloodType: z.ZodNullable<z.ZodString>;
            allergies: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
            medicalHistory: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
                condition: z.ZodString;
                diagnosedAt: z.ZodOptional<z.ZodString>;
                notes: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                condition: string;
                diagnosedAt?: string | undefined;
                notes?: string | undefined;
            }, {
                condition: string;
                diagnosedAt?: string | undefined;
                notes?: string | undefined;
            }>, "many">>>;
            emergencyContact: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                name: z.ZodString;
                relationship: z.ZodString;
                phone: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
                phone: string;
                relationship: string;
            }, {
                name: string;
                phone: string;
                relationship: string;
            }>>>;
        }, "strip", z.ZodTypeAny, {
            firstName: string | null;
            lastName: string | null;
            dateOfBirth: string | null;
            gender: string | null;
            bloodType: string | null;
            allergies?: string[] | null | undefined;
            medicalHistory?: {
                condition: string;
                diagnosedAt?: string | undefined;
                notes?: string | undefined;
            }[] | null | undefined;
            emergencyContact?: {
                name: string;
                phone: string;
                relationship: string;
            } | null | undefined;
        }, {
            firstName: string | null;
            lastName: string | null;
            dateOfBirth: string | null;
            gender: string | null;
            bloodType: string | null;
            allergies?: string[] | null | undefined;
            medicalHistory?: {
                condition: string;
                diagnosedAt?: string | undefined;
                notes?: string | undefined;
            }[] | null | undefined;
            emergencyContact?: {
                name: string;
                phone: string;
                relationship: string;
            } | null | undefined;
        }>>>;
        providerProfile: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            firstName: z.ZodNullable<z.ZodString>;
            lastName: z.ZodNullable<z.ZodString>;
            specialty: z.ZodNullable<z.ZodString>;
            consultationFee: z.ZodNullable<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            firstName: string | null;
            lastName: string | null;
            specialty: string | null;
            consultationFee: number | null;
        }, {
            firstName: string | null;
            lastName: string | null;
            specialty: string | null;
            consultationFee: number | null;
        }>>>;
        pharmacyProfile: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            pharmacyName: z.ZodString;
            licenseNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            isVerified: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            pharmacyName: string;
            licenseNumber?: string | null | undefined;
            isVerified?: boolean | undefined;
        }, {
            pharmacyName: string;
            licenseNumber?: string | null | undefined;
            isVerified?: boolean | undefined;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        email: string | null;
        phone: string | null;
        role: string;
        status: string;
        id: string;
        patientProfile?: {
            firstName: string | null;
            lastName: string | null;
            dateOfBirth: string | null;
            gender: string | null;
            bloodType: string | null;
            allergies?: string[] | null | undefined;
            medicalHistory?: {
                condition: string;
                diagnosedAt?: string | undefined;
                notes?: string | undefined;
            }[] | null | undefined;
            emergencyContact?: {
                name: string;
                phone: string;
                relationship: string;
            } | null | undefined;
        } | null | undefined;
        providerProfile?: {
            firstName: string | null;
            lastName: string | null;
            specialty: string | null;
            consultationFee: number | null;
        } | null | undefined;
        pharmacyProfile?: {
            pharmacyName: string;
            licenseNumber?: string | null | undefined;
            isVerified?: boolean | undefined;
        } | null | undefined;
    }, {
        email: string | null;
        phone: string | null;
        role: string;
        status: string;
        id: string;
        patientProfile?: {
            firstName: string | null;
            lastName: string | null;
            dateOfBirth: string | null;
            gender: string | null;
            bloodType: string | null;
            allergies?: string[] | null | undefined;
            medicalHistory?: {
                condition: string;
                diagnosedAt?: string | undefined;
                notes?: string | undefined;
            }[] | null | undefined;
            emergencyContact?: {
                name: string;
                phone: string;
                relationship: string;
            } | null | undefined;
        } | null | undefined;
        providerProfile?: {
            firstName: string | null;
            lastName: string | null;
            specialty: string | null;
            consultationFee: number | null;
        } | null | undefined;
        pharmacyProfile?: {
            pharmacyName: string;
            licenseNumber?: string | null | undefined;
            isVerified?: boolean | undefined;
        } | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: {
        email: string | null;
        phone: string | null;
        role: string;
        status: string;
        id: string;
        patientProfile?: {
            firstName: string | null;
            lastName: string | null;
            dateOfBirth: string | null;
            gender: string | null;
            bloodType: string | null;
            allergies?: string[] | null | undefined;
            medicalHistory?: {
                condition: string;
                diagnosedAt?: string | undefined;
                notes?: string | undefined;
            }[] | null | undefined;
            emergencyContact?: {
                name: string;
                phone: string;
                relationship: string;
            } | null | undefined;
        } | null | undefined;
        providerProfile?: {
            firstName: string | null;
            lastName: string | null;
            specialty: string | null;
            consultationFee: number | null;
        } | null | undefined;
        pharmacyProfile?: {
            pharmacyName: string;
            licenseNumber?: string | null | undefined;
            isVerified?: boolean | undefined;
        } | null | undefined;
    };
}, {
    success: boolean;
    data: {
        email: string | null;
        phone: string | null;
        role: string;
        status: string;
        id: string;
        patientProfile?: {
            firstName: string | null;
            lastName: string | null;
            dateOfBirth: string | null;
            gender: string | null;
            bloodType: string | null;
            allergies?: string[] | null | undefined;
            medicalHistory?: {
                condition: string;
                diagnosedAt?: string | undefined;
                notes?: string | undefined;
            }[] | null | undefined;
            emergencyContact?: {
                name: string;
                phone: string;
                relationship: string;
            } | null | undefined;
        } | null | undefined;
        providerProfile?: {
            firstName: string | null;
            lastName: string | null;
            specialty: string | null;
            consultationFee: number | null;
        } | null | undefined;
        pharmacyProfile?: {
            pharmacyName: string;
            licenseNumber?: string | null | undefined;
            isVerified?: boolean | undefined;
        } | null | undefined;
    };
}>;
export declare const UpdateProfileInputSchema: z.ZodObject<{
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    dateOfBirth: z.ZodOptional<z.ZodString>;
    gender: z.ZodOptional<z.ZodString>;
    bloodType: z.ZodOptional<z.ZodString>;
    allergies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    specialty: z.ZodOptional<z.ZodString>;
    consultationFee: z.ZodOptional<z.ZodNumber>;
    title: z.ZodOptional<z.ZodString>;
    pharmacyName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    dateOfBirth?: string | undefined;
    gender?: string | undefined;
    bloodType?: string | undefined;
    allergies?: string[] | undefined;
    specialty?: string | undefined;
    consultationFee?: number | undefined;
    pharmacyName?: string | undefined;
}, {
    title?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    dateOfBirth?: string | undefined;
    gender?: string | undefined;
    bloodType?: string | undefined;
    allergies?: string[] | undefined;
    specialty?: string | undefined;
    consultationFee?: number | undefined;
    pharmacyName?: string | undefined;
}>;
export declare const AvatarUploadInputSchema: z.ZodObject<{
    fileType: z.ZodString;
}, "strip", z.ZodTypeAny, {
    fileType: string;
}, {
    fileType: string;
}>;
export declare const MedicalHistoryInputSchema: z.ZodObject<{
    medicalHistory: z.ZodArray<z.ZodObject<{
        condition: z.ZodString;
        diagnosedAt: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        condition: string;
        diagnosedAt?: string | undefined;
        notes?: string | undefined;
    }, {
        condition: string;
        diagnosedAt?: string | undefined;
        notes?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    medicalHistory: {
        condition: string;
        diagnosedAt?: string | undefined;
        notes?: string | undefined;
    }[];
}, {
    medicalHistory: {
        condition: string;
        diagnosedAt?: string | undefined;
        notes?: string | undefined;
    }[];
}>;
export declare const GetProvidersQuerySchema: z.ZodObject<{
    specialty: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodString>;
    offset: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    specialty?: string | undefined;
    limit?: string | undefined;
    offset?: string | undefined;
}, {
    name?: string | undefined;
    specialty?: string | undefined;
    limit?: string | undefined;
    offset?: string | undefined;
}>;
export declare const HospitalDashboardResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        hospital: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            phone: z.ZodNullable<z.ZodString>;
            email: z.ZodNullable<z.ZodString>;
            logoUrl: z.ZodNullable<z.ZodString>;
            isActive: z.ZodBoolean;
            createdAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            email: string | null;
            name: string;
            phone: string | null;
            id: string;
            logoUrl: string | null;
            isActive: boolean;
            createdAt: string;
        }, {
            email: string | null;
            name: string;
            phone: string | null;
            id: string;
            logoUrl: string | null;
            isActive: boolean;
            createdAt: string;
        }>;
        stats: z.ZodObject<{
            totalDoctors: z.ZodNumber;
            totalAppointments: z.ZodNumber;
            activePatients: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            totalDoctors: number;
            totalAppointments: number;
            activePatients: number;
        }, {
            totalDoctors: number;
            totalAppointments: number;
            activePatients: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        hospital: {
            email: string | null;
            name: string;
            phone: string | null;
            id: string;
            logoUrl: string | null;
            isActive: boolean;
            createdAt: string;
        };
        stats: {
            totalDoctors: number;
            totalAppointments: number;
            activePatients: number;
        };
    }, {
        hospital: {
            email: string | null;
            name: string;
            phone: string | null;
            id: string;
            logoUrl: string | null;
            isActive: boolean;
            createdAt: string;
        };
        stats: {
            totalDoctors: number;
            totalAppointments: number;
            activePatients: number;
        };
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: {
        hospital: {
            email: string | null;
            name: string;
            phone: string | null;
            id: string;
            logoUrl: string | null;
            isActive: boolean;
            createdAt: string;
        };
        stats: {
            totalDoctors: number;
            totalAppointments: number;
            activePatients: number;
        };
    };
}, {
    success: boolean;
    data: {
        hospital: {
            email: string | null;
            name: string;
            phone: string | null;
            id: string;
            logoUrl: string | null;
            isActive: boolean;
            createdAt: string;
        };
        stats: {
            totalDoctors: number;
            totalAppointments: number;
            activePatients: number;
        };
    };
}>;
export declare const ProviderDashboardResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        stats: z.ZodObject<{
            totalAppointments: z.ZodNumber;
            pendingAppointments: z.ZodNumber;
            completedAppointments: z.ZodNumber;
            totalEarnings: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
        }, "strip", z.ZodTypeAny, {
            totalAppointments: number;
            pendingAppointments: number;
            completedAppointments: number;
            totalEarnings: string | number;
        }, {
            totalAppointments: number;
            pendingAppointments: number;
            completedAppointments: number;
            totalEarnings: string | number;
        }>;
        upcomingAppointments: z.ZodArray<z.ZodAny, "many">;
    }, "strip", z.ZodTypeAny, {
        stats: {
            totalAppointments: number;
            pendingAppointments: number;
            completedAppointments: number;
            totalEarnings: string | number;
        };
        upcomingAppointments: any[];
    }, {
        stats: {
            totalAppointments: number;
            pendingAppointments: number;
            completedAppointments: number;
            totalEarnings: string | number;
        };
        upcomingAppointments: any[];
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: {
        stats: {
            totalAppointments: number;
            pendingAppointments: number;
            completedAppointments: number;
            totalEarnings: string | number;
        };
        upcomingAppointments: any[];
    };
}, {
    success: boolean;
    data: {
        stats: {
            totalAppointments: number;
            pendingAppointments: number;
            completedAppointments: number;
            totalEarnings: string | number;
        };
        upcomingAppointments: any[];
    };
}>;
export type UserProfileSchema = z.infer<typeof UserProfileSchema>;
export type GetUserResponseSchema = z.infer<typeof GetUserResponseSchema>;
export type UpdateProfileInputSchema = z.infer<typeof UpdateProfileInputSchema>;
export type AvatarUploadInputSchema = z.infer<typeof AvatarUploadInputSchema>;
export type MedicalHistoryInputSchema = z.infer<typeof MedicalHistoryInputSchema>;
export type GetProvidersQuerySchema = z.infer<typeof GetProvidersQuerySchema>;
export type HospitalDashboardResponseSchema = z.infer<typeof HospitalDashboardResponseSchema>;
export type ProviderDashboardResponseSchema = z.infer<typeof ProviderDashboardResponseSchema>;
