import express from 'express';
import { 
  getAllSuppliers, 
  getSupplierById, 
  createSupplier, 
  updateSupplier, 
  deactivateSupplier, 
  activateSupplier 
} from '../models/supplier';
import {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  getPurchaseOrdersBySupplier,
  getPurchaseOrdersByStatus,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  receivePurchaseOrder,
  cancelPurchaseOrder,
  updatePurchaseOrder
} from '../models/purchaseOrder';
import {
  getInventorySettings,
  getAllInventorySettings,
  createOrUpdateInventorySettings,
  recordStockMovement,
  getStockMovements,
  getInventoryAlerts,
  resolveInventoryAlert,
  getLowStockProducts,
  getOutOfStockProducts
} from '../models/inventory';

export function setInventoryRoutes(app: express.Application) {
  // Supplier Routes
  app.get('/api/suppliers', (req, res) => {
    try {
      const suppliers = getAllSuppliers();
      res.json(suppliers);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
  });

  app.get('/api/suppliers/:id', (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const supplier = getSupplierById(id);
      
      if (!supplier) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
      
      res.json(supplier);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch supplier' });
    }
  });

  app.post('/api/suppliers', express.json(), (req, res) => {
    try {
      const { name, contactPerson, email, phone, address } = req.body;
      
      if (!name || !contactPerson || !email || !phone || !address) {
        return res.status(400).json({ error: 'All supplier fields are required' });
      }
      
      const newSupplier = createSupplier({
        name,
        contactPerson,
        email,
        phone,
        address,
        isActive: true
      });
      
      res.status(201).json(newSupplier);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create supplier' });
    }
  });

  app.put('/api/suppliers/:id', express.json(), (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const updatedSupplier = updateSupplier(id, updates);
      
      if (!updatedSupplier) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
      
      res.json(updatedSupplier);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update supplier' });
    }
  });

  app.patch('/api/suppliers/:id/deactivate', (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = deactivateSupplier(id);
      
      if (!success) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
      
      res.json({ message: 'Supplier deactivated successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to deactivate supplier' });
    }
  });

  app.patch('/api/suppliers/:id/activate', (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = activateSupplier(id);
      
      if (!success) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
      
      res.json({ message: 'Supplier activated successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to activate supplier' });
    }
  });

  // Purchase Order Routes
  app.get('/api/purchase-orders', (req, res) => {
    try {
      const { supplierId, status } = req.query;
      let purchaseOrders;
      
      if (supplierId) {
        purchaseOrders = getPurchaseOrdersBySupplier(parseInt(supplierId as string));
      } else if (status) {
        purchaseOrders = getPurchaseOrdersByStatus(status as any);
      } else {
        purchaseOrders = getAllPurchaseOrders();
      }
      
      res.json(purchaseOrders);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch purchase orders' });
    }
  });

  app.get('/api/purchase-orders/:id', (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const purchaseOrder = getPurchaseOrderById(id);
      
      if (!purchaseOrder) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }
      
      res.json(purchaseOrder);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch purchase order' });
    }
  });

  app.post('/api/purchase-orders', express.json(), (req, res) => {
    try {
      const { supplierId, items, createdBy, expectedDeliveryDate, notes } = req.body;
      
      if (!supplierId || !items || !Array.isArray(items) || items.length === 0 || !createdBy) {
        return res.status(400).json({ error: 'Supplier ID, items, and created by are required' });
      }
      
      const newPurchaseOrder = createPurchaseOrder(
        supplierId,
        items,
        createdBy,
        expectedDeliveryDate,
        notes
      );
      
      if (!newPurchaseOrder) {
        return res.status(400).json({ error: 'Failed to create purchase order' });
      }
      
      res.status(201).json(newPurchaseOrder);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create purchase order' });
    }
  });

  app.patch('/api/purchase-orders/:id/status', express.json(), (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, receivedDate } = req.body;
      
      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }
      
      const updatedPO = updatePurchaseOrderStatus(id, status, receivedDate);
      
      if (!updatedPO) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }
      
      res.json(updatedPO);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update purchase order status' });
    }
  });

  app.post('/api/purchase-orders/:id/receive', express.json(), (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { receivedItems } = req.body;
      
      if (!receivedItems || !Array.isArray(receivedItems)) {
        return res.status(400).json({ error: 'Received items are required' });
      }
      
      const success = receivePurchaseOrder(id, receivedItems);
      
      if (!success) {
        return res.status(400).json({ error: 'Failed to receive purchase order' });
      }
      
      res.json({ message: 'Purchase order received successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to receive purchase order' });
    }
  });

  app.patch('/purchase-orders/:id/cancel', (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = cancelPurchaseOrder(id);
      
      if (!success) {
        return res.status(400).json({ error: 'Failed to cancel purchase order' });
      }
      
      res.json({ message: 'Purchase order cancelled successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to cancel purchase order' });
    }
  });

  // Inventory Settings Routes
  app.get('/api/inventory/settings', (req, res) => {
    try {
      const { productId } = req.query;
      
      if (productId) {
        const settings = getInventorySettings(parseInt(productId as string));
        if (!settings) {
          return res.status(404).json({ error: 'Inventory settings not found' });
        }
        res.json(settings);
      } else {
        const allSettings = getAllInventorySettings();
        res.json(allSettings);
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch inventory settings' });
    }
  });

  app.post('/api/inventory/settings', express.json(), (req, res) => {
    try {
      const { productId, reorderPoint, reorderQuantity, maxStockLevel, supplierId, leadTimeDays } = req.body;
      
      if (!productId || reorderPoint === undefined || reorderQuantity === undefined || leadTimeDays === undefined) {
        return res.status(400).json({ error: 'Product ID, reorder point, reorder quantity, and lead time are required' });
      }
      
      const settings = createOrUpdateInventorySettings(productId, {
        reorderPoint,
        reorderQuantity,
        maxStockLevel,
        supplierId,
        leadTimeDays
      });
      
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update inventory settings' });
    }
  });

  // Stock Movement Routes
  app.get('/api/inventory/movements', (req, res) => {
    try {
      const { productId, limit } = req.query;
      const movements = getStockMovements(
        productId ? parseInt(productId as string) : undefined,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(movements);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch stock movements' });
    }
  });

  app.post('/api/inventory/movements', express.json(), (req, res) => {
    try {
      const { productId, movementType, quantity, reason, userId, reference } = req.body;
      
      if (!productId || !movementType || quantity === undefined || !reason || !userId) {
        return res.status(400).json({ error: 'Product ID, movement type, quantity, reason, and user ID are required' });
      }
      
      const movement = recordStockMovement(productId, movementType, quantity, reason, userId, reference);
      
      if (!movement) {
        return res.status(400).json({ error: 'Failed to record stock movement' });
      }
      
      res.status(201).json(movement);
    } catch (error) {
      res.status(500).json({ error: 'Failed to record stock movement' });
    }
  });

  // Inventory Alert Routes
  app.get('/api/inventory/alerts', (req, res) => {
    try {
      const { resolved } = req.query;
      const alerts = getInventoryAlerts(
        resolved !== undefined ? resolved === 'true' : undefined
      );
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch inventory alerts' });
    }
  });

  app.patch('/api/inventory/alerts/:id/resolve', (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = resolveInventoryAlert(id);
      
      if (!success) {
        return res.status(404).json({ error: 'Alert not found' });
      }
      
      res.json({ message: 'Alert resolved successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to resolve alert' });
    }
  });

  // Inventory Summary Routes
  app.get('/api/inventory/low-stock', (req, res) => {
    try {
      const lowStockProducts = getLowStockProducts();
      res.json(lowStockProducts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch low stock products' });
    }
  });

  app.get('/api/inventory/out-of-stock', (req, res) => {
    try {
      const outOfStockProducts = getOutOfStockProducts();
      res.json(outOfStockProducts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch out of stock products' });
    }
  });
}