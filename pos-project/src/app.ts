import express from 'express';
import { setSaleRoutes } from './routes/saleRoutes';
import { setProductRoutes } from './routes/productRoutes';
import { setUserRoutes } from './routes/userRoutes';
import { setAuthRoutes } from './routes/auth';
import { setUploadRoutes } from './routes/uploadRoutes';
import { setInventoryRoutes } from './routes/inventoryRoutes';
import { setCustomerRoutes } from './routes/customerRoutes';
import { setReportRoutes } from './routes/reportRoutes';
import backupRoutes from './routes/backupRoutes';
import path from 'path';
import { connectToDatabase } from './config/database';
import { config } from './config/environment';
import { applySecurity } from './middleware/security';
import { requestIdMiddleware, globalErrorHandler, handleUnhandledRoutes } from './middleware/errorHandler';


const app = express();

// Apply security middleware first
applySecurity(app);

// Add request ID middleware
app.use(requestIdMiddleware);

// Parse JSON bodies with size limits and error handling
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    try {
      JSON.parse(buf.toString());
    } catch (err) {
      const error = new Error('Invalid JSON format');
      (error as any).statusCode = 400;
      (error as any).type = 'entity.parse.failed';
      throw error;
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Serve static files from images directory (for sample products)
app.use('/images', express.static(path.join(__dirname, '../public/images')));

// Set up routes
setAuthRoutes(app);
setSaleRoutes(app);
setProductRoutes(app);
setUserRoutes(app);
setUploadRoutes(app);
setInventoryRoutes(app);
setCustomerRoutes(app);
setReportRoutes(app);

// Backup routes
app.use('/api/backup', backupRoutes);

app.get('/', (req, res) => {
  res.send('POS API is running!');
});

// Handle 404 errors
app.use(handleUnhandledRoutes);

// Global error handler (must be last)
app.use(globalErrorHandler);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    version: config.apiVersion
  });
});

// Start server
app.listen(config.port, async () => {
  console.log(`🚀 Server listening on port ${config.port}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
  console.log(`🔒 Security middleware enabled`);
  console.log('🔌 Connecting to MongoDB...');
  
  try {
    // Connect to database (will fall back to mock if MongoDB is unavailable)
    await connectToDatabase();
    console.log('Database connection established (real or mock)');
  } catch (err) {
    console.error('Failed to connect to database:', err);
  }
});