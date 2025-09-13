import { Product, ProductImage } from '../types';

// Sample product images for demonstration
const sampleImages1: ProductImage[] = [
  {
    id: '1-1',
    url: '/images/products/sample-product-1.svg',
    altText: 'Premium electronics device - front view',
    isPrimary: true,
    angle: 'front',
    size: { width: 400, height: 400 }
  }
];

const sampleImages2: ProductImage[] = [
  {
    id: '2-1',
    url: '/images/products/sample-product-2.svg',
    altText: 'Professional grade item - main view',
    isPrimary: true,
    angle: 'front',
    size: { width: 400, height: 400 }
  }
];

const sampleImages3: ProductImage[] = [
  {
    id: '3-1',
    url: '/images/products/sample-product-3.svg',
    altText: 'Eco-friendly sustainable product - front view',
    isPrimary: true,
    angle: 'front',
    size: { width: 400, height: 400 }
  }
];

// Sample products with image data
export const products: Product[] = [
  {
    id: 1,
    name: 'Premium Electronics',
    price: 25000,
    quantity: 50,
    category: 'Electronics',
    barcode: '1234567890',
    description: 'A high-quality premium electronics device with advanced features',
    images: sampleImages1,
    cost: 18000,
    supplierId: 1,
    minStockLevel: 10,
    maxStockLevel: 100,
    reorderPoint: 20,
    reorderQuantity: 25,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Professional Tool',
    price: 15000,
    quantity: 30,
    category: 'Tools',
    barcode: '2345678901',
    description: 'Professional grade tool for demanding applications',
    images: sampleImages2,
    cost: 10500,
    supplierId: 2,
    minStockLevel: 5,
    maxStockLevel: 50,
    reorderPoint: 10,
    reorderQuantity: 20,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    name: 'Eco Product',
    price: 12000,
    quantity: 75,
    category: 'Sustainable',
    barcode: '3456789012',
    description: 'Environmentally friendly product made from sustainable materials',
    images: sampleImages3,
    cost: 8500,
    supplierId: 3,
    minStockLevel: 15,
    maxStockLevel: 100,
    reorderPoint: 25,
    reorderQuantity: 40,
    isActive: true,
    createdAt: new Date().toISOString()
  }
];