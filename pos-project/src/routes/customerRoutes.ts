import { Express, Request, Response } from 'express';
import {
  getAllCustomers,
  getCustomerById,
  getCustomerByEmail,
  getCustomerByPhone,
  createCustomer,
  updateCustomer,
  deactivateCustomer,
  activateCustomer,
  getCustomerPurchaseHistory,
  addPurchaseToHistory,
  getAllLoyaltyPrograms,
  getActiveLoyaltyProgram,
  createLoyaltyProgram,
  updateLoyaltyProgram,
  getCustomerLoyaltyTransactions,
  recordLoyaltyTransaction,
  calculateLoyaltyDiscount,
  getCustomerStats,
  searchCustomers,
  getCustomersByDateRange
} from '../models/customer';

export const setCustomerRoutes = (app: Express) => {
  // Customer CRUD routes
  app.get('/api/customers', (req: Request, res: Response) => {
    try {
      const { search, startDate, endDate } = req.query;
      
      let customers;
      if (search) {
        customers = searchCustomers(search as string);
      } else if (startDate && endDate) {
        customers = getCustomersByDateRange(startDate as string, endDate as string);
      } else {
        customers = getAllCustomers();
      }
      
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/customers/stats', (req: Request, res: Response) => {
    try {
      const stats = getCustomerStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/customers/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const customer = getCustomerById(id);
      
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/customers/email/:email', (req: Request, res: Response) => {
    try {
      const email = req.params.email;
      const customer = getCustomerByEmail(email);
      
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/customers/phone/:phone', (req: Request, res: Response) => {
    try {
      const phone = req.params.phone;
      const customer = getCustomerByPhone(phone);
      
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/customers', (req: Request, res: Response) => {
    try {
      const { name, email, phone, address, dateOfBirth, isActive = true } = req.body;
      
      if (!name || !email || !phone) {
        return res.status(400).json({ error: 'Name, email, and phone are required' });
      }
      
      const customer = createCustomer({
        name,
        email,
        phone,
        address,
        dateOfBirth,
        isActive
      });
      
      res.status(201).json(customer);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/customers/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const customer = updateCustomer(id, updates);
      res.json(customer);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/customers/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      deactivateCustomer(id);
      res.json({ message: 'Customer deactivated successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/customers/:id/activate', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      activateCustomer(id);
      res.json({ message: 'Customer activated successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Purchase history routes
  app.get('/api/customers/:id/purchase-history', (req: Request, res: Response) => {
    try {
      const customerId = parseInt(req.params.id);
      const history = getCustomerPurchaseHistory(customerId);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/customers/:id/purchase-history', (req: Request, res: Response) => {
    try {
      const customerId = parseInt(req.params.id);
      const { saleId, items, total, loyaltyPointsUsed } = req.body;
      
      if (!saleId || !items || !total) {
        return res.status(400).json({ error: 'Sale ID, items, and total are required' });
      }
      
      addPurchaseToHistory(customerId, {
        saleId,
        items,
        total,
        loyaltyPointsUsed
      });
      
      res.json({ message: 'Purchase added to history successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Loyalty program routes
  app.get('/api/loyalty-programs', (req: Request, res: Response) => {
    try {
      const programs = getAllLoyaltyPrograms();
      res.json(programs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/loyalty-programs/active', (req: Request, res: Response) => {
    try {
      const program = getActiveLoyaltyProgram();
      if (!program) {
        return res.status(404).json({ error: 'No active loyalty program found' });
      }
      res.json(program);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/loyalty-programs', (req: Request, res: Response) => {
    try {
      const {
        name,
        description,
        pointsPerRupiah,
        rupiahPerPoint,
        minPointsToRedeem,
        maxRedemptionPercentage,
        isActive = false
      } = req.body;
      
      if (!name || !description || pointsPerRupiah === undefined || rupiahPerPoint === undefined) {
        return res.status(400).json({ error: 'Name, description, pointsPerRupiah, and rupiahPerPoint are required' });
      }
      
      const program = createLoyaltyProgram({
        name,
        description,
        pointsPerRupiah,
        rupiahPerPoint,
        minPointsToRedeem: minPointsToRedeem || 10,
        maxRedemptionPercentage: maxRedemptionPercentage || 50,
        isActive
      });
      
      res.status(201).json(program);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/loyalty-programs/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const program = updateLoyaltyProgram(id, updates);
      res.json(program);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Loyalty transaction routes
  app.get('/api/customers/:id/loyalty-transactions', (req: Request, res: Response) => {
    try {
      const customerId = parseInt(req.params.id);
      const transactions = getCustomerLoyaltyTransactions(customerId);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/customers/:id/loyalty-transactions', (req: Request, res: Response) => {
    try {
      const customerId = parseInt(req.params.id);
      const { type, points, description, saleId } = req.body;
      
      if (!type || points === undefined || !description) {
        return res.status(400).json({ error: 'Type, points, and description are required' });
      }
      
      recordLoyaltyTransaction(customerId, type, points, description, saleId);
      res.json({ message: 'Loyalty transaction recorded successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Loyalty discount calculation
  app.post('/api/customers/:id/calculate-discount', (req: Request, res: Response) => {
    try {
      const customerId = parseInt(req.params.id);
      const { saleTotal, pointsToUse } = req.body;
      
      if (saleTotal === undefined || pointsToUse === undefined) {
        return res.status(400).json({ error: 'Sale total and points to use are required' });
      }
      
      const result = calculateLoyaltyDiscount(customerId, saleTotal, pointsToUse);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
};