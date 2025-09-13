import { mockDatabase } from './mockDatabase';
import bcrypt from 'bcrypt';

/**
 * Seeds the mock database with initial data
 */
export async function seedMockData() {
  console.log('Seeding mock database with initial data...');
  
  // Seed users
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
  const cashierPassword = process.env.DEFAULT_CASHIER_PASSWORD || 'cashier123';
  const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
  const hashedCashierPassword = await bcrypt.hash(cashierPassword, 10);
  
  // Add admin user if it doesn't exist
  if (mockDatabase.find('users', { email: 'admin@pos.com' }).length === 0) {
    mockDatabase.insertOne('users', {
      _id: 'admin-user-id',
      name: 'Admin User',
      email: 'admin@pos.com',
      password: hashedAdminPassword,
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      lastLogin: null
    });
    console.log('Added admin user');
  }
  
  // Add cashier user if it doesn't exist
  if (mockDatabase.find('users', { email: 'cashier@example.com' }).length === 0) {
    mockDatabase.insertOne('users', {
      _id: 'cashier-user-id',
      name: 'Cashier User',
      email: 'cashier@example.com',
      password: hashedCashierPassword,
      role: 'cashier',
      isActive: true,
      createdAt: new Date(),
      lastLogin: null
    });
    console.log('Added cashier user');
  }
  
  // Seed products
  const sampleProducts = [
    {
      _id: 'product-1',
      name: 'Coffee',
      price: 2.50,
      stock: 100,
      category: 'Beverages',
      description: 'Fresh brewed coffee',
      barcode: '123456789',
      createdAt: new Date()
    },
    {
      _id: 'product-2',
      name: 'Tea',
      price: 2.00,
      stock: 100,
      category: 'Beverages',
      description: 'Herbal tea',
      barcode: '987654321',
      createdAt: new Date()
    },
    {
      _id: 'product-3',
      name: 'Sandwich',
      price: 5.00,
      stock: 50,
      category: 'Food',
      description: 'Fresh sandwich',
      barcode: '456789123',
      createdAt: new Date()
    }
  ];
  
  // Add products if they don't exist
  for (const product of sampleProducts) {
    if (mockDatabase.find('products', { name: product.name }).length === 0) {
      mockDatabase.insertOne('products', product);
      console.log(`Added product: ${product.name}`);
    }
  }
  
  console.log('Mock database seeded successfully');
}