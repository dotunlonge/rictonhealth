import { z } from 'zod';
export declare const ProductSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    price: z.ZodNumber;
    category: z.ZodString;
    imageUrl: z.ZodNullable<z.ZodString>;
    stock: z.ZodNumber;
    isActive: z.ZodBoolean;
    pharmacyId: z.ZodString;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    description: string | null;
    name: string;
    id: string;
    isActive: boolean;
    createdAt: string;
    pharmacyId: string;
    price: number;
    category: string;
    imageUrl: string | null;
    stock: number;
}, {
    description: string | null;
    name: string;
    id: string;
    isActive: boolean;
    createdAt: string;
    pharmacyId: string;
    price: number;
    category: string;
    imageUrl: string | null;
    stock: number;
}>;
export declare const PharmacyOrderSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    pharmacyId: z.ZodString;
    status: z.ZodEnum<["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]>;
    totalAmount: z.ZodNumber;
    deliveryType: z.ZodEnum<["HOME_DELIVERY", "PICKUP"]>;
    deliveryAddress: z.ZodNullable<z.ZodString>;
    items: z.ZodArray<z.ZodObject<{
        productId: z.ZodString;
        quantity: z.ZodNumber;
        unitPrice: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        quantity: number;
        productId: string;
        unitPrice: number;
    }, {
        quantity: number;
        productId: string;
        unitPrice: number;
    }>, "many">;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "PENDING" | "CONFIRMED" | "CANCELLED" | "PROCESSING" | "SHIPPED" | "DELIVERED";
    items: {
        quantity: number;
        productId: string;
        unitPrice: number;
    }[];
    id: string;
    createdAt: string;
    pharmacyId: string;
    userId: string;
    totalAmount: number;
    deliveryType: "HOME_DELIVERY" | "PICKUP";
    deliveryAddress: string | null;
}, {
    status: "PENDING" | "CONFIRMED" | "CANCELLED" | "PROCESSING" | "SHIPPED" | "DELIVERED";
    items: {
        quantity: number;
        productId: string;
        unitPrice: number;
    }[];
    id: string;
    createdAt: string;
    pharmacyId: string;
    userId: string;
    totalAmount: number;
    deliveryType: "HOME_DELIVERY" | "PICKUP";
    deliveryAddress: string | null;
}>;
export declare const CartItemSchema: z.ZodObject<{
    productId: z.ZodString;
    quantity: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    quantity: number;
    productId: string;
}, {
    quantity: number;
    productId: string;
}>;
export declare const CreateOrderSchema: z.ZodObject<{
    pharmacyId: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        productId: z.ZodString;
        quantity: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        quantity: number;
        productId: string;
    }, {
        quantity: number;
        productId: string;
    }>, "many">;
    deliveryType: z.ZodEnum<["HOME_DELIVERY", "PICKUP"]>;
    deliveryAddress: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    items: {
        quantity: number;
        productId: string;
    }[];
    pharmacyId: string;
    deliveryType: "HOME_DELIVERY" | "PICKUP";
    deliveryAddress?: string | undefined;
}, {
    items: {
        quantity: number;
        productId: string;
    }[];
    pharmacyId: string;
    deliveryType: "HOME_DELIVERY" | "PICKUP";
    deliveryAddress?: string | undefined;
}>;
export type ProductSchema = z.infer<typeof ProductSchema>;
export type PharmacyOrderSchema = z.infer<typeof PharmacyOrderSchema>;
export type CartItemSchema = z.infer<typeof CartItemSchema>;
export type CreateOrderSchema = z.infer<typeof CreateOrderSchema>;
export declare const ProductsListResponse: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        products: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodNullable<z.ZodString>;
            price: z.ZodNumber;
            category: z.ZodString;
            imageUrl: z.ZodNullable<z.ZodString>;
            stock: z.ZodNumber;
            isActive: z.ZodBoolean;
            pharmacyId: z.ZodString;
            createdAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            description: string | null;
            name: string;
            id: string;
            isActive: boolean;
            createdAt: string;
            pharmacyId: string;
            price: number;
            category: string;
            imageUrl: string | null;
            stock: number;
        }, {
            description: string | null;
            name: string;
            id: string;
            isActive: boolean;
            createdAt: string;
            pharmacyId: string;
            price: number;
            category: string;
            imageUrl: string | null;
            stock: number;
        }>, "many">;
        total: z.ZodNumber;
        limit: z.ZodNumber;
        offset: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        offset: number;
        total: number;
        products: {
            description: string | null;
            name: string;
            id: string;
            isActive: boolean;
            createdAt: string;
            pharmacyId: string;
            price: number;
            category: string;
            imageUrl: string | null;
            stock: number;
        }[];
    }, {
        limit: number;
        offset: number;
        total: number;
        products: {
            description: string | null;
            name: string;
            id: string;
            isActive: boolean;
            createdAt: string;
            pharmacyId: string;
            price: number;
            category: string;
            imageUrl: string | null;
            stock: number;
        }[];
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: {
        limit: number;
        offset: number;
        total: number;
        products: {
            description: string | null;
            name: string;
            id: string;
            isActive: boolean;
            createdAt: string;
            pharmacyId: string;
            price: number;
            category: string;
            imageUrl: string | null;
            stock: number;
        }[];
    };
}, {
    success: boolean;
    data: {
        limit: number;
        offset: number;
        total: number;
        products: {
            description: string | null;
            name: string;
            id: string;
            isActive: boolean;
            createdAt: string;
            pharmacyId: string;
            price: number;
            category: string;
            imageUrl: string | null;
            stock: number;
        }[];
    };
}>;
export declare const ProductDetailResponse: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodNullable<z.ZodString>;
        price: z.ZodNumber;
        category: z.ZodString;
        imageUrl: z.ZodNullable<z.ZodString>;
        stock: z.ZodNumber;
        isActive: z.ZodBoolean;
        pharmacyId: z.ZodString;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        description: string | null;
        name: string;
        id: string;
        isActive: boolean;
        createdAt: string;
        pharmacyId: string;
        price: number;
        category: string;
        imageUrl: string | null;
        stock: number;
    }, {
        description: string | null;
        name: string;
        id: string;
        isActive: boolean;
        createdAt: string;
        pharmacyId: string;
        price: number;
        category: string;
        imageUrl: string | null;
        stock: number;
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: {
        description: string | null;
        name: string;
        id: string;
        isActive: boolean;
        createdAt: string;
        pharmacyId: string;
        price: number;
        category: string;
        imageUrl: string | null;
        stock: number;
    };
}, {
    success: boolean;
    data: {
        description: string | null;
        name: string;
        id: string;
        isActive: boolean;
        createdAt: string;
        pharmacyId: string;
        price: number;
        category: string;
        imageUrl: string | null;
        stock: number;
    };
}>;
export declare const CategoriesResponse: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: string[];
}, {
    success: boolean;
    data: string[];
}>;
export declare const OrdersListResponse: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        orders: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            userId: z.ZodString;
            pharmacyId: z.ZodString;
            status: z.ZodEnum<["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]>;
            totalAmount: z.ZodNumber;
            deliveryType: z.ZodEnum<["HOME_DELIVERY", "PICKUP"]>;
            deliveryAddress: z.ZodNullable<z.ZodString>;
            items: z.ZodArray<z.ZodObject<{
                productId: z.ZodString;
                quantity: z.ZodNumber;
                unitPrice: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                quantity: number;
                productId: string;
                unitPrice: number;
            }, {
                quantity: number;
                productId: string;
                unitPrice: number;
            }>, "many">;
            createdAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            status: "PENDING" | "CONFIRMED" | "CANCELLED" | "PROCESSING" | "SHIPPED" | "DELIVERED";
            items: {
                quantity: number;
                productId: string;
                unitPrice: number;
            }[];
            id: string;
            createdAt: string;
            pharmacyId: string;
            userId: string;
            totalAmount: number;
            deliveryType: "HOME_DELIVERY" | "PICKUP";
            deliveryAddress: string | null;
        }, {
            status: "PENDING" | "CONFIRMED" | "CANCELLED" | "PROCESSING" | "SHIPPED" | "DELIVERED";
            items: {
                quantity: number;
                productId: string;
                unitPrice: number;
            }[];
            id: string;
            createdAt: string;
            pharmacyId: string;
            userId: string;
            totalAmount: number;
            deliveryType: "HOME_DELIVERY" | "PICKUP";
            deliveryAddress: string | null;
        }>, "many">;
        total: z.ZodNumber;
        limit: z.ZodNumber;
        offset: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        offset: number;
        total: number;
        orders: {
            status: "PENDING" | "CONFIRMED" | "CANCELLED" | "PROCESSING" | "SHIPPED" | "DELIVERED";
            items: {
                quantity: number;
                productId: string;
                unitPrice: number;
            }[];
            id: string;
            createdAt: string;
            pharmacyId: string;
            userId: string;
            totalAmount: number;
            deliveryType: "HOME_DELIVERY" | "PICKUP";
            deliveryAddress: string | null;
        }[];
    }, {
        limit: number;
        offset: number;
        total: number;
        orders: {
            status: "PENDING" | "CONFIRMED" | "CANCELLED" | "PROCESSING" | "SHIPPED" | "DELIVERED";
            items: {
                quantity: number;
                productId: string;
                unitPrice: number;
            }[];
            id: string;
            createdAt: string;
            pharmacyId: string;
            userId: string;
            totalAmount: number;
            deliveryType: "HOME_DELIVERY" | "PICKUP";
            deliveryAddress: string | null;
        }[];
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: {
        limit: number;
        offset: number;
        total: number;
        orders: {
            status: "PENDING" | "CONFIRMED" | "CANCELLED" | "PROCESSING" | "SHIPPED" | "DELIVERED";
            items: {
                quantity: number;
                productId: string;
                unitPrice: number;
            }[];
            id: string;
            createdAt: string;
            pharmacyId: string;
            userId: string;
            totalAmount: number;
            deliveryType: "HOME_DELIVERY" | "PICKUP";
            deliveryAddress: string | null;
        }[];
    };
}, {
    success: boolean;
    data: {
        limit: number;
        offset: number;
        total: number;
        orders: {
            status: "PENDING" | "CONFIRMED" | "CANCELLED" | "PROCESSING" | "SHIPPED" | "DELIVERED";
            items: {
                quantity: number;
                productId: string;
                unitPrice: number;
            }[];
            id: string;
            createdAt: string;
            pharmacyId: string;
            userId: string;
            totalAmount: number;
            deliveryType: "HOME_DELIVERY" | "PICKUP";
            deliveryAddress: string | null;
        }[];
    };
}>;
export declare const OrderDetailResponse: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        pharmacyId: z.ZodString;
        status: z.ZodEnum<["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]>;
        totalAmount: z.ZodNumber;
        deliveryType: z.ZodEnum<["HOME_DELIVERY", "PICKUP"]>;
        deliveryAddress: z.ZodNullable<z.ZodString>;
        items: z.ZodArray<z.ZodObject<{
            productId: z.ZodString;
            quantity: z.ZodNumber;
            unitPrice: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            quantity: number;
            productId: string;
            unitPrice: number;
        }, {
            quantity: number;
            productId: string;
            unitPrice: number;
        }>, "many">;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status: "PENDING" | "CONFIRMED" | "CANCELLED" | "PROCESSING" | "SHIPPED" | "DELIVERED";
        items: {
            quantity: number;
            productId: string;
            unitPrice: number;
        }[];
        id: string;
        createdAt: string;
        pharmacyId: string;
        userId: string;
        totalAmount: number;
        deliveryType: "HOME_DELIVERY" | "PICKUP";
        deliveryAddress: string | null;
    }, {
        status: "PENDING" | "CONFIRMED" | "CANCELLED" | "PROCESSING" | "SHIPPED" | "DELIVERED";
        items: {
            quantity: number;
            productId: string;
            unitPrice: number;
        }[];
        id: string;
        createdAt: string;
        pharmacyId: string;
        userId: string;
        totalAmount: number;
        deliveryType: "HOME_DELIVERY" | "PICKUP";
        deliveryAddress: string | null;
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: {
        status: "PENDING" | "CONFIRMED" | "CANCELLED" | "PROCESSING" | "SHIPPED" | "DELIVERED";
        items: {
            quantity: number;
            productId: string;
            unitPrice: number;
        }[];
        id: string;
        createdAt: string;
        pharmacyId: string;
        userId: string;
        totalAmount: number;
        deliveryType: "HOME_DELIVERY" | "PICKUP";
        deliveryAddress: string | null;
    };
}, {
    success: boolean;
    data: {
        status: "PENDING" | "CONFIRMED" | "CANCELLED" | "PROCESSING" | "SHIPPED" | "DELIVERED";
        items: {
            quantity: number;
            productId: string;
            unitPrice: number;
        }[];
        id: string;
        createdAt: string;
        pharmacyId: string;
        userId: string;
        totalAmount: number;
        deliveryType: "HOME_DELIVERY" | "PICKUP";
        deliveryAddress: string | null;
    };
}>;
export declare const CreateOrderResponse: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        pharmacyId: z.ZodString;
        status: z.ZodEnum<["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]>;
        totalAmount: z.ZodNumber;
        deliveryType: z.ZodEnum<["HOME_DELIVERY", "PICKUP"]>;
        deliveryAddress: z.ZodNullable<z.ZodString>;
        items: z.ZodArray<z.ZodObject<{
            productId: z.ZodString;
            quantity: z.ZodNumber;
            unitPrice: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            quantity: number;
            productId: string;
            unitPrice: number;
        }, {
            quantity: number;
            productId: string;
            unitPrice: number;
        }>, "many">;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status: "PENDING" | "CONFIRMED" | "CANCELLED" | "PROCESSING" | "SHIPPED" | "DELIVERED";
        items: {
            quantity: number;
            productId: string;
            unitPrice: number;
        }[];
        id: string;
        createdAt: string;
        pharmacyId: string;
        userId: string;
        totalAmount: number;
        deliveryType: "HOME_DELIVERY" | "PICKUP";
        deliveryAddress: string | null;
    }, {
        status: "PENDING" | "CONFIRMED" | "CANCELLED" | "PROCESSING" | "SHIPPED" | "DELIVERED";
        items: {
            quantity: number;
            productId: string;
            unitPrice: number;
        }[];
        id: string;
        createdAt: string;
        pharmacyId: string;
        userId: string;
        totalAmount: number;
        deliveryType: "HOME_DELIVERY" | "PICKUP";
        deliveryAddress: string | null;
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: {
        status: "PENDING" | "CONFIRMED" | "CANCELLED" | "PROCESSING" | "SHIPPED" | "DELIVERED";
        items: {
            quantity: number;
            productId: string;
            unitPrice: number;
        }[];
        id: string;
        createdAt: string;
        pharmacyId: string;
        userId: string;
        totalAmount: number;
        deliveryType: "HOME_DELIVERY" | "PICKUP";
        deliveryAddress: string | null;
    };
}, {
    success: boolean;
    data: {
        status: "PENDING" | "CONFIRMED" | "CANCELLED" | "PROCESSING" | "SHIPPED" | "DELIVERED";
        items: {
            quantity: number;
            productId: string;
            unitPrice: number;
        }[];
        id: string;
        createdAt: string;
        pharmacyId: string;
        userId: string;
        totalAmount: number;
        deliveryType: "HOME_DELIVERY" | "PICKUP";
        deliveryAddress: string | null;
    };
}>;
