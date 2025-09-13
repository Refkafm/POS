export interface SalesReport {
  id: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  startDate: string;
  endDate: string;
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  totalProfit: number;
  profitMargin: number;
  topProducts: ProductSalesData[];
  salesByCategory: CategorySalesData[];
  salesByHour: HourlySalesData[];
  salesByDay: DailySalesData[];
  paymentMethods: PaymentMethodData[];
  customerMetrics: CustomerMetrics;
  createdAt: string;
}

export interface ProductSalesData {
  productId: string;
  name: string;
  category: string;
  quantitySold: number;
  revenue: number;
  profit: number;
  profitMargin: number;
  averagePrice: number;
}

export interface CategorySalesData {
  category: string;
  quantitySold: number;
  revenue: number;
  profit: number;
  profitMargin: number;
  orderCount: number;
}

export interface HourlySalesData {
  hour: number;
  sales: number;
  orders: number;
  averageOrderValue: number;
}

export interface DailySalesData {
  date: string;
  sales: number;
  orders: number;
  profit: number;
  averageOrderValue: number;
}

export interface PaymentMethodData {
  method: string;
  count: number;
  totalAmount: number;
  percentage: number;
}

export interface CustomerMetrics {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  averageOrdersPerCustomer: number;
  customerRetentionRate: number;
  topCustomers: TopCustomerData[];
}

export interface TopCustomerData {
  customerId: string;
  name: string;
  email: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate: string;
}

export interface InventoryReport {
  id: string;
  reportDate: string;
  totalProducts: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  overstockItems: number;
  turnoverRate: number;
  topMovingProducts: ProductMovementData[];
  slowMovingProducts: ProductMovementData[];
  categoryBreakdown: CategoryInventoryData[];
  supplierPerformance: SupplierPerformanceData[];
  createdAt: string;
}

export interface ProductMovementData {
  productId: string;
  name: string;
  category: string;
  currentStock: number;
  soldQuantity: number;
  turnoverRate: number;
  daysOfStock: number;
  reorderPoint: number;
}

export interface CategoryInventoryData {
  category: string;
  totalProducts: number;
  totalValue: number;
  averageTurnover: number;
  lowStockCount: number;
}

export interface SupplierPerformanceData {
  supplierId: string;
  name: string;
  totalOrders: number;
  onTimeDeliveries: number;
  onTimeRate: number;
  averageLeadTime: number;
  totalValue: number;
  qualityRating: number;
}

export interface ProfitAnalysis {
  period: string;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  grossProfitMargin: number;
  operatingExpenses: number;
  netProfit: number;
  netProfitMargin: number;
  profitByCategory: CategoryProfitData[];
  profitByProduct: ProductProfitData[];
  profitTrends: ProfitTrendData[];
}

export interface CategoryProfitData {
  category: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  contribution: number;
}

export interface ProductProfitData {
  productId: string;
  name: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  quantity: number;
  profitPerUnit: number;
}

export interface ProfitTrendData {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  productId?: string;
  customerId?: string;
  supplierId?: string;
  paymentMethod?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  includeCharts: boolean;
  includeDetails: boolean;
  sections: string[];
}