import { InventorySettings, StockMovement, InventoryAlert } from '../types/inventory';
import { products } from './product';
import { users } from './user';

// In-memory storage
export const inventorySettings: InventorySettings[] = [];
export const stockMovements: StockMovement[] = [];
export const inventoryAlerts: InventoryAlert[] = [];

// Inventory Settings Functions
export const getInventorySettings = (productId: number): InventorySettings | undefined => {
  return inventorySettings.find(setting => setting.productId === productId);
};

export const getAllInventorySettings = (): InventorySettings[] => {
  return inventorySettings;
};

export const createOrUpdateInventorySettings = (
  productId: number,
  settings: Omit<InventorySettings, 'id' | 'productId' | 'updatedAt'>
): InventorySettings => {
  const existingIndex = inventorySettings.findIndex(s => s.productId === productId);
  
  const newSettings: InventorySettings = {
    id: existingIndex >= 0 ? inventorySettings[existingIndex].id : inventorySettings.length + 1,
    productId,
    ...settings,
    updatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    inventorySettings[existingIndex] = newSettings;
  } else {
    inventorySettings.push(newSettings);
  }

  return newSettings;
};

// Stock Movement Functions
export const recordStockMovement = (
  productId: number,
  movementType: StockMovement['movementType'],
  quantity: number,
  reason: string,
  userId: number,
  reference?: string
): StockMovement | null => {
  const product = products.find(p => p.id === productId);
  const user = users.find(u => u.id === userId);
  
  if (!product || !user) return null;

  const previousStock = product.quantity;
  let newStock = previousStock;

  switch (movementType) {
    case 'in':
      newStock = previousStock + quantity;
      break;
    case 'out':
      newStock = Math.max(0, previousStock - quantity);
      break;
    case 'adjustment':
      newStock = quantity; // For adjustments, quantity is the new total
      break;
  }

  // Update product stock
  product.quantity = newStock;

  const movement: StockMovement = {
    id: stockMovements.length + 1,
    productId,
    productName: product.name,
    movementType,
    quantity: movementType === 'adjustment' ? newStock - previousStock : quantity,
    previousStock,
    newStock,
    reason,
    reference,
    userId,
    userName: user.name,
    createdAt: new Date().toISOString()
  };

  stockMovements.push(movement);
  
  // Check for inventory alerts after stock change
  checkInventoryAlerts(productId);
  
  return movement;
};

export const getStockMovements = (productId?: number, limit?: number): StockMovement[] => {
  let movements = stockMovements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  if (productId) {
    movements = movements.filter(m => m.productId === productId);
  }
  
  if (limit) {
    movements = movements.slice(0, limit);
  }
  
  return movements;
};

// Inventory Alert Functions
export const checkInventoryAlerts = (productId: number): void => {
  const product = products.find(p => p.id === productId);
  const settings = getInventorySettings(productId);
  
  if (!product) return;

  const currentStock = product.quantity;
  let alertType: InventoryAlert['alertType'] | null = null;

  if (currentStock === 0) {
    alertType = 'out_of_stock';
  } else if (settings && currentStock <= settings.reorderPoint) {
    alertType = 'low_stock';
  } else if (settings && settings.maxStockLevel && currentStock > settings.maxStockLevel) {
    alertType = 'overstock';
  }

  if (alertType) {
    // Check if there's already an unresolved alert of this type
    const existingAlert = inventoryAlerts.find(
      alert => alert.productId === productId && 
               alert.alertType === alertType && 
               !alert.isResolved
    );

    if (!existingAlert) {
      const newAlert: InventoryAlert = {
        id: inventoryAlerts.length + 1,
        productId,
        productName: product.name,
        currentStock,
        reorderPoint: settings?.reorderPoint || 0,
        alertType,
        isResolved: false,
        createdAt: new Date().toISOString()
      };
      inventoryAlerts.push(newAlert);
    }
  }
};

export const getInventoryAlerts = (resolved?: boolean): InventoryAlert[] => {
  let alerts = inventoryAlerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  if (resolved !== undefined) {
    alerts = alerts.filter(alert => alert.isResolved === resolved);
  }
  
  return alerts;
};

export const resolveInventoryAlert = (alertId: number): boolean => {
  const alert = inventoryAlerts.find(a => a.id === alertId);
  if (!alert) return false;
  
  alert.isResolved = true;
  alert.resolvedAt = new Date().toISOString();
  return true;
};

// Utility Functions
export const getLowStockProducts = (): Array<{ product: any; settings: InventorySettings }> => {
  const lowStockProducts: Array<{ product: any; settings: InventorySettings }> = [];
  
  inventorySettings.forEach(settings => {
    const product = products.find(p => p.id === settings.productId);
    if (product && product.quantity <= settings.reorderPoint) {
      lowStockProducts.push({ product, settings });
    }
  });
  
  return lowStockProducts;
};

export const getOutOfStockProducts = (): any[] => {
  return products.filter(product => product.quantity === 0);
};

export const initializeInventorySettings = (): void => {
  // Initialize default settings for existing products
  products.forEach(product => {
    if (!getInventorySettings(product.id)) {
      createOrUpdateInventorySettings(product.id, {
        reorderPoint: 10,
        reorderQuantity: 50,
        leadTimeDays: 7
      });
    }
  });
};

// Initialize default settings on module load
initializeInventorySettings();