import { 
  SalesReport, 
  InventoryReport, 
  ProfitAnalysis, 
  ReportFilters,
  ProductSalesData,
  CategorySalesData,
  HourlySalesData,
  DailySalesData,
  PaymentMethodData,
  CustomerMetrics,
  TopCustomerData,
  ProductMovementData,
  CategoryInventoryData,
  SupplierPerformanceData,
  CategoryProfitData,
  ProductProfitData,
  ProfitTrendData
} from '../types/reports';
import { sales, Sale } from './sale';
import { products } from './product';
import { suppliers } from './supplier';
import { Product } from '../types';
import { Customer } from '../types/customer';

// Mock customers data (since it's not exported from customer model)
const customers: Customer[] = [
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

// Generate comprehensive sales report
export function generateSalesReport(
  startDate: string,
  endDate: string,
  filters: ReportFilters = {}
): SalesReport {
  const filteredSales = sales.filter((sale: Sale) => {
    const saleDate = new Date(sale.createdAt);
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let matches = saleDate >= start && saleDate <= end;
    
    if (filters.category) {
      matches = matches && sale.items.some((item: any) => {
        const product = products.find((p: Product) => p.id === item.productId);
        return product?.category === filters.category;
      });
    }
    
    if (filters.customerId) {
      matches = matches && (sale as any).customerId === filters.customerId;
    }
    
    if (filters.paymentMethod) {
      matches = matches && sale.paymentMethods?.[0]?.type === filters.paymentMethod;
    }
    
    if (filters.minAmount) {
      matches = matches && sale.total >= filters.minAmount;
    }
    
    if (filters.maxAmount) {
      matches = matches && sale.total <= filters.maxAmount;
    }
    
    return matches;
  });

  const totalSales = filteredSales.reduce((sum: number, sale: Sale) => sum + sale.total, 0);
  const totalOrders = filteredSales.length;
  const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  // Calculate profit
  let totalProfit = 0;
  const productSalesMap = new Map<string, ProductSalesData>();
  const categorySalesMap = new Map<string, CategorySalesData>();

  filteredSales.forEach((sale: Sale) => {
    sale.items.forEach((item: any) => {
      const product = products.find((p: Product) => p.id === item.productId);
      if (!product) return;

      const revenue = item.price * item.quantity;
      const cost = (product.cost || 0) * item.quantity;
      const profit = revenue - cost;
      totalProfit += profit;

      // Product sales data
      if (!productSalesMap.has(item.productId)) {
        productSalesMap.set(item.productId, {
          productId: item.productId.toString(),
        name: product.name,
        category: product.category || 'Uncategorized',
          quantitySold: 0,
          revenue: 0,
          profit: 0,
          profitMargin: 0,
          averagePrice: 0
        });
      }

      const productData = productSalesMap.get(item.productId)!;
      productData.quantitySold += item.quantity;
      productData.revenue += revenue;
      productData.profit += profit;
      productData.averagePrice = productData.revenue / productData.quantitySold;
      productData.profitMargin = productData.revenue > 0 ? (productData.profit / productData.revenue) * 100 : 0;

      // Category sales data
      const category = product.category || 'Uncategorized';
      if (!categorySalesMap.has(category)) {
        categorySalesMap.set(category, {
          category: product.category || 'Uncategorized',
          quantitySold: 0,
          revenue: 0,
          profit: 0,
          profitMargin: 0,
          orderCount: 0
        });
      }

      const categoryData = categorySalesMap.get(category)!;
      categoryData.quantitySold += item.quantity;
      categoryData.revenue += revenue;
      categoryData.profit += profit;
      categoryData.profitMargin = categoryData.revenue > 0 ? (categoryData.profit / categoryData.revenue) * 100 : 0;
    });
  });

  // Count unique orders per category
  categorySalesMap.forEach((categoryData, category) => {
    categoryData.orderCount = filteredSales.filter((sale: Sale) => 
      sale.items.some((item: any) => {
        const product = products.find((p: Product) => p.id === item.productId);
        return product?.category === category;
      })
    ).length;
  });

  const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

  // Generate hourly sales data
  const hourlySales = Array.from({ length: 24 }, (_, hour) => {
    const hourSales = filteredSales.filter((sale: Sale) => {
      const saleHour = new Date(sale.createdAt).getHours();
      return saleHour === hour;
    });
    
    const hourRevenue = hourSales.reduce((sum: number, sale: Sale) => sum + sale.total, 0);
    const hourOrders = hourSales.length;
    
    return {
      hour,
      sales: hourRevenue,
      orders: hourOrders,
      averageOrderValue: hourOrders > 0 ? hourRevenue / hourOrders : 0
    };
  });

  // Generate daily sales data
  const dailySalesMap = new Map<string, DailySalesData>();
  filteredSales.forEach((sale: Sale) => {
    const date = new Date(sale.createdAt).toISOString().split('T')[0];
    
    if (!dailySalesMap.has(date)) {
      dailySalesMap.set(date, {
        date,
        sales: 0,
        orders: 0,
        profit: 0,
        averageOrderValue: 0
      });
    }
    
    const dayData = dailySalesMap.get(date)!;
    dayData.sales += sale.total;
    dayData.orders += 1;
    
    // Calculate profit for this sale
    const saleProfit = sale.items.reduce((sum: number, item: any) => {
      const product = products.find((p: Product) => p.id === item.productId);
      if (!product) return sum;
      return sum + ((item.price - (product.cost || 0)) * item.quantity);
    }, 0);
    
    dayData.profit += saleProfit;
    dayData.averageOrderValue = dayData.sales / dayData.orders;
  });

  // Payment method analysis
  const paymentMethodMap = new Map<string, PaymentMethodData>();
  filteredSales.forEach((sale: Sale) => {
    const paymentMethod = sale.paymentMethods?.[0]?.type || 'unknown';
    if (!paymentMethodMap.has(paymentMethod)) {
      paymentMethodMap.set(paymentMethod, {
        method: paymentMethod,
        count: 0,
        totalAmount: 0,
        percentage: 0
      });
    }
    
    const methodData = paymentMethodMap.get(paymentMethod)!;
    methodData.count += 1;
    methodData.totalAmount += sale.total;
  });

  // Calculate percentages for payment methods
  paymentMethodMap.forEach(methodData => {
    methodData.percentage = totalOrders > 0 ? (methodData.count / totalOrders) * 100 : 0;
  });

  // Customer metrics
  const customerIds = new Set(filteredSales.map((sale: Sale) => (sale as any).customerId).filter(Boolean));
  const customerMetrics = generateCustomerMetrics(filteredSales, startDate, endDate);

  const period = determinePeriod(startDate, endDate);

  return {
    id: `sales-${Date.now()}`,
    period,
    startDate,
    endDate,
    totalSales,
    totalOrders,
    averageOrderValue,
    totalProfit,
    profitMargin,
    topProducts: Array.from(productSalesMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10),
    salesByCategory: Array.from(categorySalesMap.values())
      .sort((a, b) => b.revenue - a.revenue),
    salesByHour: hourlySales,
    salesByDay: Array.from(dailySalesMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    paymentMethods: Array.from(paymentMethodMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount),
    customerMetrics,
    createdAt: new Date().toISOString()
  };
}

// Generate inventory report
export function generateInventoryReport(reportDate: string = new Date().toISOString()): InventoryReport {
  const totalProducts = products.length;
  const totalValue = products.reduce((sum, product) => sum + (product.price * (product.quantity || 0)), 0);
  
  const lowStockItems = products.filter((product: Product) => 
    (product.quantity || 0) <= ((product as any).reorderPoint || 10)
  ).length;
  
  const outOfStockItems = products.filter((product: Product) => (product.quantity || 0) === 0).length;
  
  // Calculate overstock (assuming 3x reorder point as overstock threshold)
  const overstockItems = products.filter((product: Product) => 
    (product.quantity || 0) > (((product as any).reorderPoint || 10) * 3)
  ).length;

  // Calculate turnover rate (simplified - would need historical data in real implementation)
  const averageTurnoverRate = calculateAverageTurnoverRate();

  // Product movement analysis
  const productMovement = products.map((product: Product) => {
    const soldQuantity = getSoldQuantityForProduct(product.id.toString(), 30); // Last 30 days
    const stock = product.quantity || 0;
    const turnoverRate = stock > 0 ? soldQuantity / stock : 0;
    const daysOfStock = soldQuantity > 0 ? (stock / soldQuantity) * 30 : 999;
    
    return {
      productId: product.id.toString(),
       name: product.name,
       category: product.category || 'Uncategorized',
      currentStock: stock,
      soldQuantity,
      turnoverRate,
      daysOfStock,
      reorderPoint: (product as any).reorderPoint || 10
    };
  });

  // Category breakdown
  const categoryMap = new Map<string, CategoryInventoryData>();
  products.forEach((product: Product) => {
    const category = product.category || 'Uncategorized';
    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        category: category,
        totalProducts: 0,
        totalValue: 0,
        averageTurnover: 0,
        lowStockCount: 0
      });
    }
    
    const categoryData = categoryMap.get(category)!;
    categoryData.totalProducts += 1;
    categoryData.totalValue += product.price * (product.quantity || 0);
    
    if ((product.quantity || 0) <= ((product as any).reorderPoint || 10)) {
      categoryData.lowStockCount += 1;
    }
  });

  // Calculate average turnover per category
  categoryMap.forEach((categoryData, category) => {
    const categoryProducts = productMovement.filter((p: any) => p.category === category);
    categoryData.averageTurnover = categoryProducts.length > 0 
      ? categoryProducts.reduce((sum: number, p: any) => sum + p.turnoverRate, 0) / categoryProducts.length
      : 0;
  });

  // Supplier performance (simplified)
  const supplierPerformance = suppliers.map((supplier: any) => ({
    supplierId: supplier.id,
    name: supplier.name,
    totalOrders: 0, // Would need purchase order history
    onTimeDeliveries: 0,
    onTimeRate: 0,
    averageLeadTime: (supplier as any).leadTime || 0,
    totalValue: 0,
    qualityRating: 4.5 // Mock data
  }));

  return {
    id: `inventory-${Date.now()}`,
    reportDate,
    totalProducts,
    totalValue,
    lowStockItems,
    outOfStockItems,
    overstockItems,
    turnoverRate: averageTurnoverRate,
    topMovingProducts: productMovement
      .sort((a, b) => b.turnoverRate - a.turnoverRate)
      .slice(0, 10),
    slowMovingProducts: productMovement
      .sort((a, b) => a.turnoverRate - b.turnoverRate)
      .slice(0, 10),
    categoryBreakdown: Array.from(categoryMap.values())
      .sort((a, b) => b.totalValue - a.totalValue),
    supplierPerformance,
    createdAt: new Date().toISOString()
  };
}

// Generate profit analysis
export function generateProfitAnalysis(
  startDate: string,
  endDate: string
): ProfitAnalysis {
  const filteredSales = sales.filter((sale: Sale) => {
    const saleDate = new Date(sale.createdAt);
    return saleDate >= new Date(startDate) && saleDate <= new Date(endDate);
  });

  const totalRevenue = filteredSales.reduce((sum: number, sale: Sale) => sum + sale.total, 0);
  
  let totalCost = 0;
  const categoryProfitMap = new Map<string, CategoryProfitData>();
  const productProfitMap = new Map<string, ProductProfitData>();

  filteredSales.forEach((sale: Sale) => {
    sale.items.forEach((item: any) => {
      const product = products.find((p: Product) => p.id === item.productId);
      if (!product) return;

      const revenue = item.price * item.quantity;
      const cost = (product.cost || 0) * item.quantity;
      const profit = revenue - cost;
      
      totalCost += cost;

      // Category profit
      const category = product.category || 'Uncategorized';
      if (!categoryProfitMap.has(category)) {
        categoryProfitMap.set(category, {
          category: category,
          revenue: 0,
          cost: 0,
          profit: 0,
          margin: 0,
          contribution: 0
        });
      }

      const categoryData = categoryProfitMap.get(category)!;
      categoryData.revenue += revenue;
      categoryData.cost += cost;
      categoryData.profit += profit;

      // Product profit
      if (!productProfitMap.has(item.productId)) {
        productProfitMap.set(item.productId, {
          productId: item.productId,
          name: product.name,
          revenue: 0,
          cost: 0,
          profit: 0,
          margin: 0,
          quantity: 0,
          profitPerUnit: 0
        });
      }

      const productData = productProfitMap.get(item.productId)!;
      productData.revenue += revenue;
      productData.cost += cost;
      productData.profit += profit;
      productData.quantity += item.quantity;
    });
  });

  // Calculate margins and contributions
  categoryProfitMap.forEach(categoryData => {
    categoryData.margin = categoryData.revenue > 0 ? (categoryData.profit / categoryData.revenue) * 100 : 0;
    categoryData.contribution = totalRevenue > 0 ? (categoryData.revenue / totalRevenue) * 100 : 0;
  });

  productProfitMap.forEach(productData => {
    productData.margin = productData.revenue > 0 ? (productData.profit / productData.revenue) * 100 : 0;
    productData.profitPerUnit = productData.quantity > 0 ? productData.profit / productData.quantity : 0;
  });

  const grossProfit = totalRevenue - totalCost;
  const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  
  // Simplified operating expenses (would be configurable in real app)
  const operatingExpenses = totalRevenue * 0.15; // 15% of revenue
  const netProfit = grossProfit - operatingExpenses;
  const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Generate profit trends (daily)
  const profitTrends = generateProfitTrends(startDate, endDate);

  return {
    period: `${startDate} to ${endDate}`,
    totalRevenue,
    totalCost,
    grossProfit,
    grossProfitMargin,
    operatingExpenses,
    netProfit,
    netProfitMargin,
    profitByCategory: Array.from(categoryProfitMap.values())
      .sort((a, b) => b.profit - a.profit),
    profitByProduct: Array.from(productProfitMap.values())
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 20),
    profitTrends
  };
}

// Helper functions
function determinePeriod(startDate: string, endDate: string): 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return 'daily';
  if (diffDays === 7) return 'weekly';
  if (diffDays >= 28 && diffDays <= 31) return 'monthly';
  if (diffDays >= 365 && diffDays <= 366) return 'yearly';
  return 'custom';
}

function generateCustomerMetrics(filteredSales: Sale[], startDate: string, endDate: string): CustomerMetrics {
  const customerIds = new Set(filteredSales.map((sale: Sale) => (sale as any).customerId).filter(Boolean));
  const totalCustomers = customerIds.size;
  
  // Calculate new vs returning customers (simplified)
  const newCustomers = Math.floor(totalCustomers * 0.3); // Mock: 30% new
  const returningCustomers = totalCustomers - newCustomers;
  
  const averageOrdersPerCustomer = totalCustomers > 0 ? filteredSales.length / totalCustomers : 0;
  const customerRetentionRate = 85; // Mock data

  // Top customers
  const customerSalesMap = new Map<string, TopCustomerData>();
  filteredSales.forEach((sale: Sale) => {
    const saleWithCustomer = sale as any;
    if (!saleWithCustomer.customerId) return;
    
    const customer = customers.find((c: Customer) => c.id === saleWithCustomer.customerId);
    if (!customer) return;

    if (!customerSalesMap.has(saleWithCustomer.customerId)) {
      customerSalesMap.set(saleWithCustomer.customerId, {
        customerId: saleWithCustomer.customerId,
        name: customer.name,
        email: customer.email,
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0,
        lastOrderDate: sale.createdAt
      });
    }

    const customerData = customerSalesMap.get(saleWithCustomer.customerId)!;
    customerData.totalOrders += 1;
    customerData.totalSpent += sale.total;
    customerData.averageOrderValue = customerData.totalSpent / customerData.totalOrders;
    
    if (new Date(sale.createdAt) > new Date(customerData.lastOrderDate)) {
      customerData.lastOrderDate = sale.createdAt;
    }
  });

  return {
    totalCustomers,
    newCustomers,
    returningCustomers,
    averageOrdersPerCustomer,
    customerRetentionRate,
    topCustomers: Array.from(customerSalesMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
  };
}

function calculateAverageTurnoverRate(): number {
  // Simplified calculation - would need historical sales data
  return 2.5; // Mock average turnover rate
}

function getSoldQuantityForProduct(productId: string, days: number): number {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return sales
    .filter((sale: Sale) => new Date(sale.createdAt) >= cutoffDate)
    .reduce((total: number, sale: Sale) => {
      const item = sale.items.find((item: any) => item.productId.toString() === productId);
      return total + (item?.quantity || 0);
    }, 0);
}

function generateProfitTrends(startDate: string, endDate: string): ProfitTrendData[] {
  const trends: ProfitTrendData[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dateStr = date.toISOString().split('T')[0];
    const daySales = sales.filter((sale: Sale) => 
      sale.createdAt.startsWith(dateStr)
    );
    
    const revenue = daySales.reduce((sum: number, sale: Sale) => sum + sale.total, 0);
    let cost = 0;
    
    daySales.forEach((sale: Sale) => {
      sale.items.forEach((item: any) => {
        const product = products.find((p: Product) => p.id === item.productId);
        if (product) {
          cost += (product.cost || 0) * item.quantity;
        }
      });
    });
    
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    
    trends.push({
      date: dateStr,
      revenue,
      cost,
      profit,
      margin
    });
  }
  
  return trends;
}

// Export functions for API routes
export const reportsModel = {
  generateSalesReport,
  generateInventoryReport,
  generateProfitAnalysis
};