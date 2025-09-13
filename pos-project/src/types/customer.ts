export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address?: string;
  dateOfBirth?: string;
  loyaltyPoints: number;
  totalSpent: number;
  visitCount: number;
  lastVisit?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerPurchaseHistory {
  id: number;
  customerId: number;
  saleId: number;
  items: Array<{
    productId: number;
    productName: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  total: number;
  loyaltyPointsEarned: number;
  loyaltyPointsUsed: number;
  createdAt: string;
}

export interface LoyaltyProgram {
  id: number;
  name: string;
  description: string;
  pointsPerRupiah: number; // Points earned per rupiah spent
  rupiahPerPoint: number; // Rupiah value per point when redeeming
  minPointsToRedeem: number;
  maxRedemptionPercentage: number; // Max percentage of total that can be paid with points
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyTransaction {
  id: number;
  customerId: number;
  type: 'earned' | 'redeemed' | 'expired' | 'adjusted';
  points: number;
  description: string;
  saleId?: number;
  createdAt: string;
}

export interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  newCustomersThisMonth: number;
  averageSpentPerCustomer: number;
  topCustomers: Array<{
    id: number;
    name: string;
    totalSpent: number;
    loyaltyPoints: number;
  }>;
  loyaltyPointsIssued: number;
  loyaltyPointsRedeemed: number;
}