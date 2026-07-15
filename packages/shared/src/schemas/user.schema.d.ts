import { z } from './zod';
export declare const UserProfileSchema: z.ZodObject<
  {
    id: z.ZodString;
    email: z.ZodNullable<z.ZodString>;
    phone: z.ZodNullable<z.ZodString>;
    role: z.ZodString;
    status: z.ZodString;
    patientProfile: z.ZodOptional<
      z.ZodNullable<
        z.ZodObject<
          {
            firstName: z.ZodNullable<z.ZodString>;
            lastName: z.ZodNullable<z.ZodString>;
            dateOfBirth: z.ZodNullable<z.ZodString>;
            gender: z.ZodNullable<z.ZodString>;
            bloodType: z.ZodNullable<z.ZodString>;
            allergies: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, 'many'>>>;
            medicalHistory: z.ZodOptional<
              z.ZodNullable<
                z.ZodArray<
                  z.ZodObject<
                    {
                      condition: z.ZodString;
                      diagnosedAt: z.ZodOptional<z.ZodString>;
                      notes: z.ZodOptional<z.ZodString>;
                    },
                    'strip',
                    z.ZodTypeAny,
                    {
                      condition: string;
                      diagnosedAt?: string | undefined;
                      notes?: string | undefined;
                    },
                    {
                      condition: string;
                      diagnosedAt?: string | undefined;
                      notes?: string | undefined;
                    }
                  >,
                  'many'
                >
              >
            >;
            emergencyContact: z.ZodOptional<
              z.ZodNullable<
                z.ZodObject<
                  {
                    name: z.ZodString;
                    relationship: z.ZodString;
                    phone: z.ZodString;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    name: string;
                    phone: string;
                    relationship: string;
                  },
                  {
                    name: string;
                    phone: string;
                    relationship: string;
                  }
                >
              >
            >;
          },
          'strip',
          z.ZodTypeAny,
          {
            firstName: string | null;
            lastName: string | null;
            dateOfBirth: string | null;
            gender: string | null;
            bloodType: string | null;
            allergies?: string[] | null | undefined;
            medicalHistory?:
              | {
                  condition: string;
                  diagnosedAt?: string | undefined;
                  notes?: string | undefined;
                }[]
              | null
              | undefined;
            emergencyContact?:
              | {
                  name: string;
                  phone: string;
                  relationship: string;
                }
              | null
              | undefined;
          },
          {
            firstName: string | null;
            lastName: string | null;
            dateOfBirth: string | null;
            gender: string | null;
            bloodType: string | null;
            allergies?: string[] | null | undefined;
            medicalHistory?:
              | {
                  condition: string;
                  diagnosedAt?: string | undefined;
                  notes?: string | undefined;
                }[]
              | null
              | undefined;
            emergencyContact?:
              | {
                  name: string;
                  phone: string;
                  relationship: string;
                }
              | null
              | undefined;
          }
        >
      >
    >;
    providerProfile: z.ZodOptional<
      z.ZodNullable<
        z.ZodObject<
          {
            firstName: z.ZodNullable<z.ZodString>;
            lastName: z.ZodNullable<z.ZodString>;
            specialty: z.ZodNullable<z.ZodString>;
            consultationFee: z.ZodNullable<z.ZodNumber>;
          },
          'strip',
          z.ZodTypeAny,
          {
            firstName: string | null;
            lastName: string | null;
            specialty: string | null;
            consultationFee: number | null;
          },
          {
            firstName: string | null;
            lastName: string | null;
            specialty: string | null;
            consultationFee: number | null;
          }
        >
      >
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    status: string;
    email: string | null;
    phone: string | null;
    role: string;
    id: string;
    patientProfile?:
      | {
          firstName: string | null;
          lastName: string | null;
          dateOfBirth: string | null;
          gender: string | null;
          bloodType: string | null;
          allergies?: string[] | null | undefined;
          medicalHistory?:
            | {
                condition: string;
                diagnosedAt?: string | undefined;
                notes?: string | undefined;
              }[]
            | null
            | undefined;
          emergencyContact?:
            | {
                name: string;
                phone: string;
                relationship: string;
              }
            | null
            | undefined;
        }
      | null
      | undefined;
    providerProfile?:
      | {
          firstName: string | null;
          lastName: string | null;
          specialty: string | null;
          consultationFee: number | null;
        }
      | null
      | undefined;
  },
  {
    status: string;
    email: string | null;
    phone: string | null;
    role: string;
    id: string;
    patientProfile?:
      | {
          firstName: string | null;
          lastName: string | null;
          dateOfBirth: string | null;
          gender: string | null;
          bloodType: string | null;
          allergies?: string[] | null | undefined;
          medicalHistory?:
            | {
                condition: string;
                diagnosedAt?: string | undefined;
                notes?: string | undefined;
              }[]
            | null
            | undefined;
          emergencyContact?:
            | {
                name: string;
                phone: string;
                relationship: string;
              }
            | null
            | undefined;
        }
      | null
      | undefined;
    providerProfile?:
      | {
          firstName: string | null;
          lastName: string | null;
          specialty: string | null;
          consultationFee: number | null;
        }
      | null
      | undefined;
  }
>;
export declare const GetUserResponseSchema: z.ZodObject<
  {
    success: z.ZodBoolean;
    data: z.ZodObject<
      {
        id: z.ZodString;
        email: z.ZodNullable<z.ZodString>;
        phone: z.ZodNullable<z.ZodString>;
        role: z.ZodString;
        status: z.ZodString;
        patientProfile: z.ZodOptional<
          z.ZodNullable<
            z.ZodObject<
              {
                firstName: z.ZodNullable<z.ZodString>;
                lastName: z.ZodNullable<z.ZodString>;
                dateOfBirth: z.ZodNullable<z.ZodString>;
                gender: z.ZodNullable<z.ZodString>;
                bloodType: z.ZodNullable<z.ZodString>;
                allergies: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, 'many'>>>;
                medicalHistory: z.ZodOptional<
                  z.ZodNullable<
                    z.ZodArray<
                      z.ZodObject<
                        {
                          condition: z.ZodString;
                          diagnosedAt: z.ZodOptional<z.ZodString>;
                          notes: z.ZodOptional<z.ZodString>;
                        },
                        'strip',
                        z.ZodTypeAny,
                        {
                          condition: string;
                          diagnosedAt?: string | undefined;
                          notes?: string | undefined;
                        },
                        {
                          condition: string;
                          diagnosedAt?: string | undefined;
                          notes?: string | undefined;
                        }
                      >,
                      'many'
                    >
                  >
                >;
                emergencyContact: z.ZodOptional<
                  z.ZodNullable<
                    z.ZodObject<
                      {
                        name: z.ZodString;
                        relationship: z.ZodString;
                        phone: z.ZodString;
                      },
                      'strip',
                      z.ZodTypeAny,
                      {
                        name: string;
                        phone: string;
                        relationship: string;
                      },
                      {
                        name: string;
                        phone: string;
                        relationship: string;
                      }
                    >
                  >
                >;
              },
              'strip',
              z.ZodTypeAny,
              {
                firstName: string | null;
                lastName: string | null;
                dateOfBirth: string | null;
                gender: string | null;
                bloodType: string | null;
                allergies?: string[] | null | undefined;
                medicalHistory?:
                  | {
                      condition: string;
                      diagnosedAt?: string | undefined;
                      notes?: string | undefined;
                    }[]
                  | null
                  | undefined;
                emergencyContact?:
                  | {
                      name: string;
                      phone: string;
                      relationship: string;
                    }
                  | null
                  | undefined;
              },
              {
                firstName: string | null;
                lastName: string | null;
                dateOfBirth: string | null;
                gender: string | null;
                bloodType: string | null;
                allergies?: string[] | null | undefined;
                medicalHistory?:
                  | {
                      condition: string;
                      diagnosedAt?: string | undefined;
                      notes?: string | undefined;
                    }[]
                  | null
                  | undefined;
                emergencyContact?:
                  | {
                      name: string;
                      phone: string;
                      relationship: string;
                    }
                  | null
                  | undefined;
              }
            >
          >
        >;
        providerProfile: z.ZodOptional<
          z.ZodNullable<
            z.ZodObject<
              {
                firstName: z.ZodNullable<z.ZodString>;
                lastName: z.ZodNullable<z.ZodString>;
                specialty: z.ZodNullable<z.ZodString>;
                consultationFee: z.ZodNullable<z.ZodNumber>;
              },
              'strip',
              z.ZodTypeAny,
              {
                firstName: string | null;
                lastName: string | null;
                specialty: string | null;
                consultationFee: number | null;
              },
              {
                firstName: string | null;
                lastName: string | null;
                specialty: string | null;
                consultationFee: number | null;
              }
            >
          >
        >;
      },
      'strip',
      z.ZodTypeAny,
      {
        status: string;
        email: string | null;
        phone: string | null;
        role: string;
        id: string;
        patientProfile?:
          | {
              firstName: string | null;
              lastName: string | null;
              dateOfBirth: string | null;
              gender: string | null;
              bloodType: string | null;
              allergies?: string[] | null | undefined;
              medicalHistory?:
                | {
                    condition: string;
                    diagnosedAt?: string | undefined;
                    notes?: string | undefined;
                  }[]
                | null
                | undefined;
              emergencyContact?:
                | {
                    name: string;
                    phone: string;
                    relationship: string;
                  }
                | null
                | undefined;
            }
          | null
          | undefined;
        providerProfile?:
          | {
              firstName: string | null;
              lastName: string | null;
              specialty: string | null;
              consultationFee: number | null;
            }
          | null
          | undefined;
      },
      {
        status: string;
        email: string | null;
        phone: string | null;
        role: string;
        id: string;
        patientProfile?:
          | {
              firstName: string | null;
              lastName: string | null;
              dateOfBirth: string | null;
              gender: string | null;
              bloodType: string | null;
              allergies?: string[] | null | undefined;
              medicalHistory?:
                | {
                    condition: string;
                    diagnosedAt?: string | undefined;
                    notes?: string | undefined;
                  }[]
                | null
                | undefined;
              emergencyContact?:
                | {
                    name: string;
                    phone: string;
                    relationship: string;
                  }
                | null
                | undefined;
            }
          | null
          | undefined;
        providerProfile?:
          | {
              firstName: string | null;
              lastName: string | null;
              specialty: string | null;
              consultationFee: number | null;
            }
          | null
          | undefined;
      }
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    success: boolean;
    data: {
      status: string;
      email: string | null;
      phone: string | null;
      role: string;
      id: string;
      patientProfile?:
        | {
            firstName: string | null;
            lastName: string | null;
            dateOfBirth: string | null;
            gender: string | null;
            bloodType: string | null;
            allergies?: string[] | null | undefined;
            medicalHistory?:
              | {
                  condition: string;
                  diagnosedAt?: string | undefined;
                  notes?: string | undefined;
                }[]
              | null
              | undefined;
            emergencyContact?:
              | {
                  name: string;
                  phone: string;
                  relationship: string;
                }
              | null
              | undefined;
          }
        | null
        | undefined;
      providerProfile?:
        | {
            firstName: string | null;
            lastName: string | null;
            specialty: string | null;
            consultationFee: number | null;
          }
        | null
        | undefined;
    };
  },
  {
    success: boolean;
    data: {
      status: string;
      email: string | null;
      phone: string | null;
      role: string;
      id: string;
      patientProfile?:
        | {
            firstName: string | null;
            lastName: string | null;
            dateOfBirth: string | null;
            gender: string | null;
            bloodType: string | null;
            allergies?: string[] | null | undefined;
            medicalHistory?:
              | {
                  condition: string;
                  diagnosedAt?: string | undefined;
                  notes?: string | undefined;
                }[]
              | null
              | undefined;
            emergencyContact?:
              | {
                  name: string;
                  phone: string;
                  relationship: string;
                }
              | null
              | undefined;
          }
        | null
        | undefined;
      providerProfile?:
        | {
            firstName: string | null;
            lastName: string | null;
            specialty: string | null;
            consultationFee: number | null;
          }
        | null
        | undefined;
    };
  }
>;
export declare const UpdateProfileInputSchema: z.ZodObject<
  {
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    dateOfBirth: z.ZodOptional<z.ZodString>;
    gender: z.ZodOptional<z.ZodString>;
    bloodType: z.ZodOptional<z.ZodString>;
    allergies: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
    specialty: z.ZodOptional<z.ZodString>;
    consultationFee: z.ZodOptional<z.ZodNumber>;
    title: z.ZodOptional<z.ZodString>;
    pharmacyName: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
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
  },
  {
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
  }
>;
export declare const AvatarUploadInputSchema: z.ZodObject<
  {
    fileType: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    fileType: string;
  },
  {
    fileType: string;
  }
>;
export declare const MedicalHistoryInputSchema: z.ZodObject<
  {
    medicalHistory: z.ZodArray<
      z.ZodObject<
        {
          condition: z.ZodString;
          diagnosedAt: z.ZodOptional<z.ZodString>;
          notes: z.ZodOptional<z.ZodString>;
        },
        'strip',
        z.ZodTypeAny,
        {
          condition: string;
          diagnosedAt?: string | undefined;
          notes?: string | undefined;
        },
        {
          condition: string;
          diagnosedAt?: string | undefined;
          notes?: string | undefined;
        }
      >,
      'many'
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    medicalHistory: {
      condition: string;
      diagnosedAt?: string | undefined;
      notes?: string | undefined;
    }[];
  },
  {
    medicalHistory: {
      condition: string;
      diagnosedAt?: string | undefined;
      notes?: string | undefined;
    }[];
  }
>;
