import { Customer, CustomerPurchaseHistory, LoyaltyProgram, LoyaltyTransaction, CustomerStats } from '../types/customer';

// In-memory storage
let customers: Customer[] = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@email.com',
    phone: '+62812345678',
    address: 'Jl. Sudirman No. 123, Jakarta',
    dateOfBirth: '1990-05-15',
    loyaltyPoints: 250,
    totalSpent: 2500000,
    visitCount: 15,
    lastVisit: '2024-01-15T10:30:00Z',
    isActive: true,
    createdAt: '2023-12-01T08:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z'
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane.smith@email.com',
    phone: '+62812345679',
    address: 'Jl. Thamrin No. 456, Jakarta',
    loyaltyPoints: 180,
    totalSpent: 1800000,
    visitCount: 12,
    lastVisit: '2024-01-14T14:20:00Z',
    isActive: true,
    createdAt: '2023-11-15T09:00:00Z',
    updatedAt: '2024-01-14T14:20:00Z'
  }
];

let customerPurchaseHistory: CustomerPurchaseHistory[] = [];

let loyaltyPrograms: LoyaltyProgram[] = [
  {
    id: 1,
    name: 'Standard Loyalty Program',
    description: 'Earn 1 point for every Rp 1,000 spent. Redeem 100 points for Rp 10,000 discount.',
    pointsPerRupiah: 0.001, // 1 point per 1000 rupiah
    rupiahPerPoint: 100, // 1 point = 100 rupiah
    minPointsToRedeem: 10,
    maxRedemptionPercentage: 50,
    isActive: true,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  }
];

let loyaltyTransactions: LoyaltyTransaction[] = [];

let nextCustomerId = 3;
let nextPurchaseHistoryId = 1;
let nextLoyaltyProgramId = 2;
let nextLoyaltyTransactionId = 1;

// Customer CRUD operations
export const getAllCustomers = (): Customer[] => {
  return customers.filter(customer => customer.isActive);
};

export const getCustomerById = (id: number): Customer | undefined => {
  return customers.find(customer => customer.id === id && customer.isActive);
};

export const getCustomerByEmail = (email: string): Customer | undefined => {
  return customers.find(customer => customer.email === email && customer.isActive);
};

export const getCustomerByPhone = (phone: string): Customer | undefined => {
  return customers.find(customer => customer.phone === phone && customer.isActive);
};

export const createCustomer = (customerData: Omit<Customer, 'id' | 'loyaltyPoints' | 'totalSpent' | 'visitCount' | 'lastVisit' | 'createdAt' | 'updatedAt'>): Customer => {
  // Check for duplicate email or phone
  const existingEmail = customers.find(c => c.email === customerData.email && c.isActive);
  const existingPhone = customers.find(c => c.phone === customerData.phone && c.isActive);
  
  if (existingEmail) {
    throw new Error('Customer with this email already exists');
  }
  
  if (existingPhone) {
    throw new Error('Customer with this phone number already exists');
  }

  const newCustomer: Customer = {
    ...customerData,
    id: nextCustomerId++,
    loyaltyPoints: 0,
    totalSpent: 0,
    visitCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  customers.push(newCustomer);
  return newCustomer;
};

export const updateCustomer = (id: number, updates: Partial<Omit<Customer, 'id' | 'createdAt'>>): Customer => {
  const customerIndex = customers.findIndex(customer => customer.id === id && customer.isActive);
  if (customerIndex === -1) {
    throw new Error('Customer not found');
  }

  // Check for duplicate email or phone if being updated
  if (updates.email) {
    const existingEmail = customers.find(c => c.email === updates.email && c.id !== id && c.isActive);
    if (existingEmail) {
      throw new Error('Customer with this email already exists');
    }
  }
  
  if (updates.phone) {
    const existingPhone = customers.find(c => c.phone === updates.phone && c.id !== id && c.isActive);
    if (existingPhone) {
      throw new Error('Customer with this phone number already exists');
    }
  }

  customers[customerIndex] = {
    ...customers[customerIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  return customers[customerIndex];
};

export const deactivateCustomer = (id: number): void => {
  const customerIndex = customers.findIndex(customer => customer.id === id);
  if (customerIndex === -1) {
    throw new Error('Customer not found');
  }

  customers[customerIndex].isActive = false;
  customers[customerIndex].updatedAt = new Date().toISOString();
};

export const activateCustomer = (id: number): void => {
  const customerIndex = customers.findIndex(customer => customer.id === id);
  if (customerIndex === -1) {
    throw new Error('Customer not found');
  }

  customers[customerIndex].isActive = true;
  customers[customerIndex].updatedAt = new Date().toISOString();
};

// Purchase history operations
export const getCustomerPurchaseHistory = (customerId: number): CustomerPurchaseHistory[] => {
  return customerPurchaseHistory.filter(history => history.customerId === customerId);
};

export const addPurchaseToHistory = (customerId: number, saleData: {
  saleId: number;
  items: Array<{
    productId: number;
    productName: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  total: number;
  loyaltyPointsUsed?: number;
}): void => {
  const customer = getCustomerById(customerId);
  if (!customer) {
    throw new Error('Customer not found');
  }

  const activeProgram = loyaltyPrograms.find(program => program.isActive);
  const loyaltyPointsEarned = activeProgram ? Math.floor(saleData.total * activeProgram.pointsPerRupiah) : 0;
  const loyaltyPointsUsed = saleData.loyaltyPointsUsed || 0;

  // Add to purchase history
  const purchaseHistory: CustomerPurchaseHistory = {
    id: nextPurchaseHistoryId++,
    customerId,
    saleId: saleData.saleId,
    items: saleData.items,
    total: saleData.total,
    loyaltyPointsEarned,
    loyaltyPointsUsed,
    createdAt: new Date().toISOString()
  };

  customerPurchaseHistory.push(purchaseHistory);

  // Update customer stats
  updateCustomerStats(customerId, saleData.total, loyaltyPointsEarned, loyaltyPointsUsed);

  // Record loyalty transactions
  if (loyaltyPointsEarned > 0) {
    recordLoyaltyTransaction(customerId, 'earned', loyaltyPointsEarned, `Points earned from sale #${saleData.saleId}`, saleData.saleId);
  }

  if (loyaltyPointsUsed > 0) {
    recordLoyaltyTransaction(customerId, 'redeemed', -loyaltyPointsUsed, `Points redeemed for sale #${saleData.saleId}`, saleData.saleId);
  }
};

// Loyalty program operations
export const getAllLoyaltyPrograms = (): LoyaltyProgram[] => {
  return loyaltyPrograms;
};

export const getActiveLoyaltyProgram = (): LoyaltyProgram | undefined => {
  return loyaltyPrograms.find(program => program.isActive);
};

export const createLoyaltyProgram = (programData: Omit<LoyaltyProgram, 'id' | 'createdAt' | 'updatedAt'>): LoyaltyProgram => {
  const newProgram: LoyaltyProgram = {
    ...programData,
    id: nextLoyaltyProgramId++,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  loyaltyPrograms.push(newProgram);
  return newProgram;
};

export const updateLoyaltyProgram = (id: number, updates: Partial<Omit<LoyaltyProgram, 'id' | 'createdAt'>>): LoyaltyProgram => {
  const programIndex = loyaltyPrograms.findIndex(program => program.id === id);
  if (programIndex === -1) {
    throw new Error('Loyalty program not found');
  }

  loyaltyPrograms[programIndex] = {
    ...loyaltyPrograms[programIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  return loyaltyPrograms[programIndex];
};

// Loyalty transaction operations
export const getCustomerLoyaltyTransactions = (customerId: number): LoyaltyTransaction[] => {
  return loyaltyTransactions.filter(transaction => transaction.customerId === customerId);
};

export const recordLoyaltyTransaction = (customerId: number, type: 'earned' | 'redeemed' | 'expired' | 'adjusted', points: number, description: string, saleId?: number): void => {
  const transaction: LoyaltyTransaction = {
    id: nextLoyaltyTransactionId++,
    customerId,
    type,
    points,
    description,
    saleId,
    createdAt: new Date().toISOString()
  };

  loyaltyTransactions.push(transaction);
};

// Helper functions
const updateCustomerStats = (customerId: number, saleAmount: number, pointsEarned: number, pointsUsed: number): void => {
  const customerIndex = customers.findIndex(customer => customer.id === customerId);
  if (customerIndex === -1) return;

  customers[customerIndex].totalSpent += saleAmount;
  customers[customerIndex].loyaltyPoints += pointsEarned - pointsUsed;
  customers[customerIndex].visitCount += 1;
  customers[customerIndex].lastVisit = new Date().toISOString();
  customers[customerIndex].updatedAt = new Date().toISOString();
};

export const calculateLoyaltyDiscount = (customerId: number, saleTotal: number, pointsToUse: number): { discount: number; pointsUsed: number } => {
  const customer = getCustomerById(customerId);
  const activeProgram = getActiveLoyaltyProgram();
  
  if (!customer || !activeProgram) {
    return { discount: 0, pointsUsed: 0 };
  }

  // Check if customer has enough points
  if (customer.loyaltyPoints < pointsToUse || pointsToUse < activeProgram.minPointsToRedeem) {
    throw new Error('Insufficient loyalty points or below minimum redemption threshold');
  }

  const maxDiscount = saleTotal * (activeProgram.maxRedemptionPercentage / 100);
  const requestedDiscount = pointsToUse * activeProgram.rupiahPerPoint;
  
  const actualDiscount = Math.min(requestedDiscount, maxDiscount);
  const actualPointsUsed = Math.floor(actualDiscount / activeProgram.rupiahPerPoint);

  return { discount: actualDiscount, pointsUsed: actualPointsUsed };
};

export const getCustomerStats = (): CustomerStats => {
  const activeCustomers = customers.filter(c => c.isActive);
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const newCustomersThisMonth = activeCustomers.filter(c => {
    const createdDate = new Date(c.createdAt);
    return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
  }).length;

  const totalSpent = activeCustomers.reduce((sum, c) => sum + c.totalSpent, 0);
  const averageSpentPerCustomer = activeCustomers.length > 0 ? totalSpent / activeCustomers.length : 0;

  const topCustomers = activeCustomers
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10)
    .map(c => ({
      id: c.id,
      name: c.name,
      totalSpent: c.totalSpent,
      loyaltyPoints: c.loyaltyPoints
    }));

  const loyaltyPointsIssued = loyaltyTransactions
    .filter(t => t.type === 'earned')
    .reduce((sum, t) => sum + t.points, 0);

  const loyaltyPointsRedeemed = loyaltyTransactions
    .filter(t => t.type === 'redeemed')
    .reduce((sum, t) => sum + Math.abs(t.points), 0);

  return {
    totalCustomers: activeCustomers.length,
    activeCustomers: activeCustomers.filter(c => c.lastVisit && new Date(c.lastVisit) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)).length, // Active in last 90 days
    newCustomersThisMonth,
    averageSpentPerCustomer,
    topCustomers,
    loyaltyPointsIssued,
    loyaltyPointsRedeemed
  };
};

// Search and filter functions
export const searchCustomers = (query: string): Customer[] => {
  const lowercaseQuery = query.toLowerCase();
  return customers.filter(customer => 
    customer.isActive && (
      customer.name.toLowerCase().includes(lowercaseQuery) ||
      customer.email.toLowerCase().includes(lowercaseQuery) ||
      customer.phone.includes(query)
    )
  );
};

export const getCustomersByDateRange = (startDate: string, endDate: string): Customer[] => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return customers.filter(customer => {
    const createdDate = new Date(customer.createdAt);
    return customer.isActive && createdDate >= start && createdDate <= end;
  });
};