import { Product } from '../src/types';

describe('Product Service Tests', () => {
  describe('Product validation', () => {
    it('should validate product data structure', () => {
      const validProduct: Product = {
        id: 1,
        name: 'Test Product',
        price: 29.99,
        quantity: 100,
        category: 'Electronics',
        barcode: '1234567890',
        description: 'A test product',
        images: [{
          id: 'img1',
          url: 'https://example.com/image.jpg',
          altText: 'Product image',
          isPrimary: true
        }],
        cost: 15.00,
        supplierId: 1,
        minStockLevel: 10,
        maxStockLevel: 500,
        reorderPoint: 20,
        reorderQuantity: 100,
        isActive: true
      };

      expect(validProduct.id).toBe(1);
      expect(validProduct.name).toBe('Test Product');
      expect(validProduct.price).toBe(29.99);
      expect(validProduct.quantity).toBe(100);
      expect(validProduct.images).toHaveLength(1);
      expect(validProduct.images[0].isPrimary).toBe(true);
    });

    it('should calculate profit margin', () => {
      const calculateProfitMargin = (price: number, cost: number): number => {
        return ((price - cost) / price) * 100;
      };

      expect(calculateProfitMargin(100, 60)).toBeCloseTo(40, 1);
      expect(calculateProfitMargin(50, 30)).toBeCloseTo(40, 1);
      expect(calculateProfitMargin(25, 20)).toBeCloseTo(20, 1);
    });

    it('should check stock levels', () => {
      const isLowStock = (quantity: number, reorderPoint: number): boolean => {
        return quantity <= reorderPoint;
      };

      const isOutOfStock = (quantity: number): boolean => {
        return quantity <= 0;
      };

      expect(isLowStock(5, 10)).toBe(true);
      expect(isLowStock(15, 10)).toBe(false);
      expect(isOutOfStock(0)).toBe(true);
      expect(isOutOfStock(5)).toBe(false);
    });
  });

  describe('Product search and filtering', () => {
    const products: Product[] = [
      {
        id: 1,
        name: 'Laptop',
        price: 999.99,
        quantity: 50,
        category: 'Electronics',
        images: [],
        isActive: true
      },
      {
        id: 2,
        name: 'Mouse',
        price: 29.99,
        quantity: 200,
        category: 'Electronics',
        images: [],
        isActive: true
      },
      {
        id: 3,
        name: 'Desk Chair',
        price: 199.99,
        quantity: 25,
        category: 'Furniture',
        images: [],
        isActive: false
      }
    ];

    it('should filter products by category', () => {
      const filterByCategory = (products: Product[], category: string): Product[] => {
        return products.filter(p => p.category === category);
      };

      const electronics = filterByCategory(products, 'Electronics');
      expect(electronics).toHaveLength(2);
      expect(electronics.every(p => p.category === 'Electronics')).toBe(true);
    });

    it('should filter active products', () => {
      const filterActiveProducts = (products: Product[]): Product[] => {
        return products.filter(p => p.isActive === true);
      };

      const activeProducts = filterActiveProducts(products);
      expect(activeProducts).toHaveLength(2);
      expect(activeProducts.every(p => p.isActive === true)).toBe(true);
    });

    it('should search products by name', () => {
      const searchByName = (products: Product[], searchTerm: string): Product[] => {
        return products.filter(p => 
          p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      };

      const laptopResults = searchByName(products, 'laptop');
      expect(laptopResults).toHaveLength(1);
      expect(laptopResults[0].name).toBe('Laptop');

      const chairResults = searchByName(products, 'chair');
      expect(chairResults).toHaveLength(1);
      expect(chairResults[0].name).toBe('Desk Chair');
    });
  });
});