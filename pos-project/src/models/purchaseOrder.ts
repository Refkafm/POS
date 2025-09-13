import { PurchaseOrder, PurchaseOrderItem } from '../types/inventory';
import { getSupplierById } from './supplier';
import { products } from './product';

// In-memory purchase order storage
export const purchaseOrders: PurchaseOrder[] = [];

// Generate unique order number
const generateOrderNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const sequence = (purchaseOrders.length + 1).toString().padStart(4, '0');
  return `PO${year}${month}${day}${sequence}`;
};

// Purchase Order management functions
export const getAllPurchaseOrders = (): PurchaseOrder[] => {
  return purchaseOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getPurchaseOrderById = (id: number): PurchaseOrder | undefined => {
  return purchaseOrders.find(po => po.id === id);
};

export const getPurchaseOrdersBySupplier = (supplierId: number): PurchaseOrder[] => {
  return purchaseOrders.filter(po => po.supplierId === supplierId);
};

export const getPurchaseOrdersByStatus = (status: PurchaseOrder['status']): PurchaseOrder[] => {
  return purchaseOrders.filter(po => po.status === status);
};

export const createPurchaseOrder = (
  supplierId: number,
  items: Omit<PurchaseOrderItem, 'productName' | 'totalCost'>[],
  createdBy: number,
  expectedDeliveryDate?: string,
  notes?: string
): PurchaseOrder | null => {
  const supplier = getSupplierById(supplierId);
  if (!supplier) return null;

  // Validate and enrich items
  const enrichedItems: PurchaseOrderItem[] = [];
  let subtotal = 0;

  for (const item of items) {
    const product = products.find(p => p.id === item.productId);
    if (!product) continue;

    const totalCost = item.quantity * item.unitCost;
    enrichedItems.push({
      ...item,
      productName: product.name,
      totalCost
    });
    subtotal += totalCost;
  }

  if (enrichedItems.length === 0) return null;

  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + tax;

  const newPurchaseOrder: PurchaseOrder = {
    id: purchaseOrders.length > 0 ? Math.max(...purchaseOrders.map(po => po.id)) + 1 : 1,
    supplierId,
    supplierName: supplier.name,
    orderNumber: generateOrderNumber(),
    status: 'pending',
    items: enrichedItems,
    subtotal,
    tax,
    total,
    orderDate: new Date().toISOString(),
    expectedDeliveryDate,
    notes,
    createdBy,
    createdAt: new Date().toISOString()
  };

  purchaseOrders.push(newPurchaseOrder);
  return newPurchaseOrder;
};

export const updatePurchaseOrderStatus = (
  id: number,
  status: PurchaseOrder['status'],
  receivedDate?: string
): PurchaseOrder | null => {
  const po = getPurchaseOrderById(id);
  if (!po) return null;

  po.status = status;
  po.updatedAt = new Date().toISOString();
  
  if (status === 'received' && receivedDate) {
    po.receivedDate = receivedDate;
  }

  return po;
};

export const receivePurchaseOrder = (id: number, receivedItems: { productId: number; receivedQuantity: number }[]): boolean => {
  const po = getPurchaseOrderById(id);
  if (!po || po.status !== 'ordered') return false;

  // Update product stock levels
  receivedItems.forEach(receivedItem => {
    const product = products.find(p => p.id === receivedItem.productId);
    if (product) {
      product.quantity += receivedItem.receivedQuantity;
    }
  });

  // Update purchase order status
  po.status = 'received';
  po.receivedDate = new Date().toISOString();
  po.updatedAt = new Date().toISOString();

  return true;
};

export const cancelPurchaseOrder = (id: number): boolean => {
  const po = getPurchaseOrderById(id);
  if (!po || po.status === 'received') return false;

  po.status = 'cancelled';
  po.updatedAt = new Date().toISOString();
  return true;
};

export const updatePurchaseOrder = (
  id: number,
  updates: Partial<Pick<PurchaseOrder, 'expectedDeliveryDate' | 'notes'>>
): PurchaseOrder | null => {
  const po = getPurchaseOrderById(id);
  if (!po || po.status === 'received' || po.status === 'cancelled') return null;

  Object.assign(po, updates);
  po.updatedAt = new Date().toISOString();
  return po;
};