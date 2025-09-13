// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

print('Starting MongoDB initialization...');

// Switch to the POS database
db = db.getSiblingDB('pos_system');

// Create application user with read/write permissions
db.createUser({
  user: 'pos_user',
  pwd: 'pos_password_change_me',
  roles: [
    {
      role: 'readWrite',
      db: 'pos_system'
    }
  ]
});

// Create test database and user
db = db.getSiblingDB('pos_system_test');

db.createUser({
  user: 'pos_test_user',
  pwd: 'pos_test_password_change_me',
  roles: [
    {
      role: 'readWrite',
      db: 'pos_system_test'
    }
  ]
});

// Switch back to main database
db = db.getSiblingDB('pos_system');

// Create initial collections with indexes
print('Creating collections and indexes...');

// Users collection
db.createCollection('users');
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ isActive: 1 });

// Products collection
db.createCollection('products');
db.products.createIndex({ name: 1 });
db.products.createIndex({ category: 1 });
db.products.createIndex({ barcode: 1 }, { unique: true, sparse: true });
db.products.createIndex({ stock: 1 });
db.products.createIndex({ isActive: 1 });

// Sales collection
db.createCollection('sales');
db.sales.createIndex({ createdAt: -1 });
db.sales.createIndex({ userId: 1 });
db.sales.createIndex({ customerId: 1 });
db.sales.createIndex({ status: 1 });
db.sales.createIndex({ total: 1 });

// Customers collection
db.createCollection('customers');
db.customers.createIndex({ email: 1 }, { unique: true, sparse: true });
db.customers.createIndex({ phone: 1 }, { unique: true, sparse: true });
db.customers.createIndex({ loyaltyPoints: 1 });

// Suppliers collection
db.createCollection('suppliers');
db.suppliers.createIndex({ name: 1 });
db.suppliers.createIndex({ email: 1 }, { unique: true, sparse: true });

// Purchase Orders collection
db.createCollection('purchaseorders');
db.purchaseorders.createIndex({ createdAt: -1 });
db.purchaseorders.createIndex({ supplierId: 1 });
db.purchaseorders.createIndex({ status: 1 });

// Inventory Movements collection
db.createCollection('inventorymovements');
db.inventorymovements.createIndex({ productId: 1 });
db.inventorymovements.createIndex({ createdAt: -1 });
db.inventorymovements.createIndex({ type: 1 });

// Sessions collection (for session storage)
db.createCollection('sessions');
db.sessions.createIndex({ expires: 1 }, { expireAfterSeconds: 0 });

print('MongoDB initialization completed successfully!');