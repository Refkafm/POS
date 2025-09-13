import express from 'express';
import { sales, Sale, SaleItem, PaymentMethod } from '../models/sale';
import { products } from '../models/product';
import { authenticateToken } from '../middleware/auth';

export function setSaleRoutes(app: express.Application) {
  // List all sales (protected route)
  app.get('/api/sales', authenticateToken, (req, res) => {
    // Return sales with user information
    const salesWithDetails = sales.map(sale => ({
      ...sale,
      items: sale.items.map(item => {
        const product = products.find(p => p.id === item.productId);
        return {
          ...item,
          productName: product?.name || 'Unknown Product'
        };
      })
    }));
    res.json(salesWithDetails);
  });

  // Create a new sale with validation (protected route)
  app.post('/api/sales', authenticateToken, express.json(), (req, res) => {
    const { items, subtotal, discount, tax, total, paymentMethods, change } = req.body;
    const user = (req as any).user;

    // Validate request body
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items must be a non-empty array.' });
    }

    if (!Array.isArray(paymentMethods) || paymentMethods.length === 0) {
      return res.status(400).json({ error: 'Payment methods must be a non-empty array.' });
    }

    // Validate and process items
    const processedItems: SaleItem[] = [];
    let calculatedSubtotal = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Validate item structure
      if (
        typeof item.productId !== 'number' ||
        typeof item.quantity !== 'number' ||
        item.quantity <= 0
      ) {
        return res.status(400).json({ error: 'Each item must have a valid productId and a quantity > 0.' });
      }

      const product = products.find(p => p.id === item.productId);
      if (!product) {
        return res.status(400).json({ error: `Product ID ${item.productId} not found.` });
      }
      if (product.quantity < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for product ID ${item.productId}.` });
      }

      const itemTotal = product.price * item.quantity;
      calculatedSubtotal += itemTotal;

      processedItems.push({
        id: i + 1,
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        price: product.price,
        total: itemTotal
      });
    }

    // Update stock after all validations pass
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        product.quantity -= item.quantity;
      }
    }

    // Create and save the sale
    const newSale: Sale = {
      id: sales.length + 1,
      items: processedItems,
      subtotal: subtotal || calculatedSubtotal,
      discount: discount || 0,
      tax: tax || 0,
      total: total || calculatedSubtotal,
      paymentMethods: paymentMethods || [],
      change: change || 0,
      createdAt: new Date().toISOString(),
      userId: user.id,
      userName: user.username
    };
    sales.push(newSale);
     res.status(201).json(newSale);
   });

  // Sales summary
  app.get('/api/sales/summary', (req, res) => {
    const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
    res.json({ totalSales, count: sales.length });
  });
}

// Sample request body for creating a new sale
/*
{
  "items": [
    { "productId": 1, "quantity": 2 }
  ]
}
*/