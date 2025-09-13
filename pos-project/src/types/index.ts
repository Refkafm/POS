export interface ProductImage {
    id: string;
    url: string;
    altText: string;
    isPrimary: boolean;
    angle?: string; // 'front', 'back', 'side', 'detail', etc.
    size?: {
        width: number;
        height: number;
    };
}

export interface Product {
    id: number;
    name: string;
    price: number;
    quantity: number;
    category?: string;
    barcode?: string;
    description?: string;
    images: ProductImage[];
    createdAt?: string;
    updatedAt?: string;
    cost?: number;
    supplierId?: number;
    minStockLevel?: number;
    maxStockLevel?: number;
    reorderPoint?: number;
    reorderQuantity?: number;
    isActive?: boolean;
}

export interface Sale {
    id: number;
    productId: number;
    userId: number;
    quantity: number;
    totalAmount: number;
}

export interface User {
    id: number;
    name: string;
    email: string;
    role: string;
}