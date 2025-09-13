import { Router, Request, Response } from 'express';
import {
  generateSalesReport,
  generateInventoryReport,
  generateProfitAnalysis
} from '../models/reports';

const router = Router();

// Generate sales report
router.get('/sales', (req: Request, res: Response) => {
  try {
    const { startDate, endDate, customerId, paymentMethod } = req.query;
    
    const filters: any = {};
    if (startDate) filters.startDate = startDate as string;
    if (endDate) filters.endDate = endDate as string;
    if (customerId) filters.customerId = customerId as string;
    if (paymentMethod) filters.paymentMethod = paymentMethod as string;
    
    const report = generateSalesReport(
      filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      filters.endDate || new Date().toISOString(),
      filters
    );
    res.json(report);
  } catch (error) {
    console.error('Error generating sales report:', error);
    res.status(500).json({ error: 'Failed to generate sales report' });
  }
});

// Generate inventory report
router.get('/inventory', (req: Request, res: Response) => {
  try {
    const { reportDate } = req.query;
    const report = generateInventoryReport(reportDate as string || new Date().toISOString());
    res.json(report);
  } catch (error) {
    console.error('Error generating inventory report:', error);
    res.status(500).json({ error: 'Failed to generate inventory report' });
  }
});

// Generate profit analysis
router.get('/profit', (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filters: any = {};
    if (startDate) filters.startDate = startDate as string;
    if (endDate) filters.endDate = endDate as string;
    
    const analysis = generateProfitAnalysis(
      filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      filters.endDate || new Date().toISOString()
    );
    res.json(analysis);
  } catch (error) {
    console.error('Error generating profit analysis:', error);
    res.status(500).json({ error: 'Failed to generate profit analysis' });
  }
});

// Get sales summary for dashboard
router.get('/sales/summary', (req: Request, res: Response) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const todayReport = generateSalesReport(
      startOfDay.toISOString(),
      endOfDay.toISOString()
    );
    
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthReport = generateSalesReport(
      thisMonth.toISOString(),
      today.toISOString()
    );
    
    res.json({
      today: {
        totalSales: todayReport.totalSales,
        totalOrders: todayReport.totalOrders,
        averageOrderValue: todayReport.averageOrderValue
      },
      thisMonth: {
        totalSales: monthReport.totalSales,
        totalOrders: monthReport.totalOrders,
        averageOrderValue: monthReport.averageOrderValue
      }
    });
  } catch (error) {
    console.error('Error generating sales summary:', error);
    res.status(500).json({ error: 'Failed to generate sales summary' });
  }
});

export function setReportRoutes(app: any) {
  app.use('/api/reports', router);
}