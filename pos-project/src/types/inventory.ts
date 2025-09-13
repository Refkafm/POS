export interface Supplier {
  id: number;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface PurchaseOrderItem {
  productId: number;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseOrder {
  id: number;
  supplierId: number;
  supplierName: string;
  orderNumber: string;
  status: 'pending' | 'ordered' | 'received' | 'cancelled';
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  orderDate: string;
  expectedDeliveryDate?: string;
  receivedDate?: string;
  notes?: string;
  createdBy: number;
  createdAt: string;
  updatedAt?: string;
}

export interface InventoryAlert {
  id: number;
  productId: number;
  productName: string;
  currentStock: number;
  reorderPoint: number;
  alertType: 'low_stock' | 'out_of_stock' | 'overstock';
  isResolved: boolean;
  createdAt: string;
  resolvedAt?: string;
}

export interface StockMovement {
  id: number;
  productId: number;
  productName: string;
  movementType: 'in' | 'out' | 'adjustment';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  reference?: string; // PO number, sale ID, etc.
  userId: number;
  userName: string;
  createdAt: string;
}

export interface InventorySettings {
  id: number;
  productId: number;
  reorderPoint: number;
  reorderQuantity: number;
  maxStockLevel?: number;
  supplierId?: number;
  leadTimeDays: number;
  updatedAt: string;
}