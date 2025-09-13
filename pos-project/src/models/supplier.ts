import { Supplier } from '../types/inventory';

// In-memory supplier storage (will be replaced with database implementation)
export const suppliers: Supplier[] = [
  {
    id: 1,
    name: 'Tech Supplies Co.',
    contactPerson: 'John Smith',
    email: 'john@techsupplies.com',
    phone: '+1-555-0123',
    address: '123 Business Ave, Tech City, TC 12345',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Office Equipment Ltd.',
    contactPerson: 'Sarah Johnson',
    email: 'sarah@officeequip.com',
    phone: '+1-555-0456',
    address: '456 Commerce St, Business Town, BT 67890',
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

// Supplier management functions
export const getAllSuppliers = (): Supplier[] => {
  return suppliers.filter(supplier => supplier.isActive);
};

export const getSupplierById = (id: number): Supplier | undefined => {
  return suppliers.find(supplier => supplier.id === id);
};

export const createSupplier = (supplierData: Omit<Supplier, 'id' | 'createdAt'>): Supplier => {
  const newSupplier: Supplier = {
    ...supplierData,
    id: suppliers.length > 0 ? Math.max(...suppliers.map(s => s.id)) + 1 : 1,
    createdAt: new Date().toISOString()
  };
  suppliers.push(newSupplier);
  return newSupplier;
};

export const updateSupplier = (id: number, updates: Partial<Omit<Supplier, 'id' | 'createdAt'>>): Supplier | null => {
  const index = suppliers.findIndex(supplier => supplier.id === id);
  if (index === -1) return null;
  
  suppliers[index] = {
    ...suppliers[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  return suppliers[index];
};

export const deactivateSupplier = (id: number): boolean => {
  const supplier = getSupplierById(id);
  if (!supplier) return false;
  
  supplier.isActive = false;
  supplier.updatedAt = new Date().toISOString();
  return true;
};

export const activateSupplier = (id: number): boolean => {
  const supplier = getSupplierById(id);
  if (!supplier) return false;
  
  supplier.isActive = true;
  supplier.updatedAt = new Date().toISOString();
  return true;
};