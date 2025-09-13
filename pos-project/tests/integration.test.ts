import request from 'supertest';
import express from 'express';
import { setProductRoutes } from '../src/routes/productRoutes';
import { setAuthRoutes } from '../src/routes/auth';
import { globalErrorHandler, requestIdMiddleware, handleUnhandledRoutes } from '../src/middleware/errorHandler';
import cacheService from '../src/services/cacheService';

// Mock database and services
jest.mock('../src/config/database', () => ({
  connectToDatabase: jest.fn().mockResolvedValue(true),
  usingMockDatabase: true
}));

// Import mock database functions
import { connectToMockDatabase } from '../src/config/mockDatabase';

jest.mock('../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Create test app
const createTestApp = () => {
  const app = express();
  
  // Middleware
  app.use(requestIdMiddleware);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  
  // Routes
  setAuthRoutes(app);
  setProductRoutes(app);
  
  // Handle 404 errors
  app.use(handleUnhandledRoutes);
  
  // Error handler
  app.use(globalErrorHandler);
  
  return app;
};

describe('Integration Tests', () => {
  let app: express.Application;
  let authToken: string;
  
  beforeAll(async () => {
    // Connect to mock database and seed it
    await connectToMockDatabase();
    app = createTestApp();
  });
  
  beforeEach(() => {
    cacheService.flushAll();
    jest.clearAllMocks();
  });
  
  describe('Authentication Flow', () => {
    it('should handle complete authentication workflow', async () => {
      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@pos.com',
          password: 'admin123'
        });
      
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('success', true);
      expect(loginResponse.body).toHaveProperty('data');
      expect(loginResponse.body.data).toHaveProperty('token');
      expect(loginResponse.body.data).toHaveProperty('user');
      
      authToken = loginResponse.body.data.token;
      
      // Verify token works for protected routes
      const protectedResponse = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(protectedResponse.status).toBe(200);
    });
    
    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@pos.com',
          password: 'wrongpassword'
        });
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error.message).toContain('Invalid');
    });
    
    it('should handle missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBeDefined();
    });
  });
  
  describe('Product Management Flow', () => {
    beforeEach(async () => {
      // Get auth token for protected routes
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@pos.com',
          password: 'admin123'
        });
      authToken = loginResponse.body.data.token;
    });
    
    it('should handle complete product CRUD operations', async () => {
      // Create product
      const createResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Integration Test Product',
          price: 29.99,
          quantity: 100,
          category: 'Test Category',
          barcode: '1234567890123',
          description: 'A product for integration testing'
        });
      
      expect(createResponse.status).toBe(201);
      expect(createResponse.body).toHaveProperty('_id');
      
      const productId = createResponse.body._id;
      
      // Read product
      const readResponse = await request(app)
        .get(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(readResponse.status).toBe(200);
      expect(readResponse.body.name).toBe('Integration Test Product');
      
      // Update product
      const updateResponse = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Integration Test Product',
          price: 39.99
        });
      
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.name).toBe('Updated Integration Test Product');
        expect(updateResponse.body.price).toBe(39.99);
      
      // Delete product
      const deleteResponse = await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(deleteResponse.status).toBe(200);
      
      // Verify deletion
      const verifyResponse = await request(app)
        .get(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(verifyResponse.status).toBe(404);
    });
    
    it('should handle product validation errors', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          description: 'Invalid product'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PRODUCT_DATA');
    });
    
    it('should handle unauthorized access', async () => {
      const response = await request(app)
        .get('/api/products')
        // No authorization header
        ;
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });
  });
  
  describe('Error Handling Integration', () => {
    it('should handle 404 errors with proper format', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error.message).toContain('not found');
    });
    
    it('should include request ID in error responses', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint');
      
      expect(response.body).toHaveProperty('requestId');
      expect(typeof response.body.requestId).toBe('string');
    });
    
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');
      
      expect(response.status).toBe(400);
    });
  });
  
  describe('Cache Integration', () => {
    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@pos.com',
          password: 'admin123'
        });
      authToken = loginResponse.body.data.token;
    });
    
    it('should cache product listings', async () => {
      // First request should populate cache
      const response1 = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response1.status).toBe(200);
      
      // Check if products are cached
      const cachedProducts = cacheService.get('products');
      expect(cachedProducts).toBeDefined();
      
      // Second request should use cache
      const response2 = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response2.status).toBe(200);
      expect(response2.body).toEqual(response1.body);
    });
    
    it('should invalidate cache on product updates', async () => {
      // Create a product
      const createResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Cache Test Product',
          price: 19.99,
          quantity: 50,
          category: 'Test',
          barcode: '9876543210'
        });
      
      console.log('Create response status:', createResponse.status);
      console.log('Create response body:', createResponse.body);
      const productId = createResponse.body._id || createResponse.body.id;
      console.log('Product ID:', productId);
      
      // Get products to populate cache
      await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(cacheService.has('products')).toBe(true);
      
      // Update product should invalidate cache
      const updateResponse = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Cache Test Product' });
      
      console.log('Update response status:', updateResponse.status);
      console.log('Update response body:', updateResponse.body);
      expect(updateResponse.status).toBe(200);
      
      // Cache should be invalidated
      expect(cacheService.has('products')).toBe(false);
    });
  });
  
  describe('Performance Integration', () => {
    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@pos.com',
          password: 'admin123'
        });
      console.log('Performance test login response:', loginResponse.status, loginResponse.body);
      authToken = loginResponse.body.data?.token || loginResponse.body.token;
    });
    
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const promises: Promise<any>[] = [];
      
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get('/api/products')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }
      
      const responses = await Promise.all(promises);
      
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
    
    it('should maintain response times under load', async () => {
      const iterations = 20;
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        
        const response = await request(app)
          .get('/api/products')
          .set('Authorization', `Bearer ${authToken}`);
        
        times.push(Date.now() - start);
        expect(response.status).toBe(200);
      }
      
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      
      expect(avgTime).toBeLessThan(100); // Average under 100ms
      expect(maxTime).toBeLessThan(500); // No request over 500ms
    });
  });
  
  describe('Data Consistency', () => {
    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@pos.com',
          password: 'admin123'
        });
      authToken = loginResponse.body.data.token;
    });
    
    it('should maintain data consistency across operations', async () => {
      // Create multiple products
      const products: any[] = [];
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/products')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: `Consistency Test Product ${i}`,
            price: 10 + i,
            quantity: 100 + i,
            category: 'Test',
            barcode: `123456789${i}`
          });
        
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('_id');
        products.push(response.body);
      }
      
      // Verify all products exist
      const listResponse = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(listResponse.body.length).toBeGreaterThanOrEqual(5);
      
      // Update one product
      const updateResponse = await request(app)
        .put(`/api/products/${products[0]._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Consistency Test Product' });
      
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.name).toBe('Updated Consistency Test Product');
      
      // Verify update is reflected in list
      const updatedListResponse = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`);
      
      const updatedProduct = updatedListResponse.body.find(
        (p: any) => p._id === products[0]._id
      );
      
      expect(updatedProduct.name).toBe('Updated Consistency Test Product');
    });
  });
});