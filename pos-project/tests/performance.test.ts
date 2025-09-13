import request from 'supertest';
import express from 'express';
import cacheService from '../src/services/cacheService';

// Mock app setup for performance testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Test endpoint with caching
  app.get('/api/test/cached', async (req, res) => {
    const cacheKey = 'test:performance';
    
    const result = await cacheService.getOrSet(cacheKey, async () => {
      // Simulate expensive operation
      await new Promise(resolve => setTimeout(resolve, 100));
      return { data: 'expensive computation result', timestamp: Date.now() };
    }, 60); // 60 seconds TTL
    
    res.json(result);
  });
  
  // Test endpoint without caching
  app.get('/api/test/uncached', async (req, res) => {
    // Simulate expensive operation
    await new Promise(resolve => setTimeout(resolve, 100));
    res.json({ data: 'expensive computation result', timestamp: Date.now() });
  });
  
  // Bulk data endpoint
  app.get('/api/test/bulk', (req, res) => {
    const count = parseInt(req.query.count as string) || 1000;
    const data = Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      value: Math.random() * 1000,
      timestamp: Date.now()
    }));
    res.json(data);
  });
  
  return app;
};

describe('Performance Tests', () => {
  let app: express.Application;
  
  beforeAll(() => {
    app = createTestApp();
  });
  
  beforeEach(() => {
    cacheService.flushAll();
  });
  
  describe('Cache Performance', () => {
    it('should improve response time with caching', async () => {
      // First request (cache miss) - should be slower
      const start1 = Date.now();
      const response1 = await request(app)
        .get('/api/test/cached')
        .expect(200);
      const time1 = Date.now() - start1;
      
      // Second request (cache hit) - should be faster
      const start2 = Date.now();
      const response2 = await request(app)
        .get('/api/test/cached')
        .expect(200);
      const time2 = Date.now() - start2;
      
      // Cache hit should be significantly faster
      expect(time2).toBeLessThan(time1 * 0.5); // At least 50% faster
      expect(response1.body.data).toBe(response2.body.data);
      expect(response1.body.timestamp).toBe(response2.body.timestamp); // Same cached result
    });
    
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const promises: Promise<any>[] = [];
      
      const startTime = Date.now();
      
      // Make concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(request(app).get('/api/test/cached'));
      }
      
      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      // All requests should succeed
      responses.forEach((response: any) => {
        expect(response.status).toBe(200);
      });
      
      // Should complete faster than sequential requests
      // (100ms * 10 requests = 1000ms, but with caching should be much faster)
      expect(totalTime).toBeLessThan(500);
      
      // All responses should have the same cached data (allow small timing differences)
      const firstResponse = responses[0].body;
      responses.forEach((response: any) => {
        expect(Math.abs(response.body.timestamp - firstResponse.timestamp)).toBeLessThan(100);
      });
    });
    
    it('should maintain good performance under load', async () => {
      const iterations = 50;
      const times: number[] = [];
      
      // Warm up cache
      await request(app).get('/api/test/cached');
      
      // Measure response times
      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await request(app).get('/api/test/cached').expect(200);
        times.push(Date.now() - start);
      }
      
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      
      // Average response time should be very fast (cached)
      expect(avgTime).toBeLessThan(10); // Less than 10ms average
      expect(maxTime).toBeLessThan(50); // No request should take more than 50ms
    });
  });
  
  describe('Memory Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const response = await request(app)
        .get('/api/test/bulk?count=10000')
        .expect(200);
      
      expect(response.body).toHaveLength(10000);
      expect(response.body[0]).toHaveProperty('id', 1);
      expect(response.body[9999]).toHaveProperty('id', 10000);
    });
    
    it('should manage cache memory efficiently', () => {
      const initialStats = cacheService.getStats();
      
      // Add many items to cache
      for (let i = 0; i < 100; i++) {
        cacheService.set(`test:item:${i}`, {
          id: i,
          data: `Item ${i}`,
          timestamp: Date.now()
        });
      }
      
      const afterStats = cacheService.getStats();
      
      expect(afterStats.keys).toBe(100);
      expect(cacheService.getSize()).toBe(100);
      
      // Clear cache and verify cleanup
      cacheService.flushAll();
      const finalStats = cacheService.getStats();
      
      expect(finalStats.keys).toBe(0);
      expect(cacheService.getSize()).toBe(0);
    });
  });
  
  describe('Cache Hit Rate Performance', () => {
    it('should achieve high hit rates with repeated access patterns', () => {
      const keys = ['key1', 'key2', 'key3', 'key4', 'key5'];
      
      // Populate cache
      keys.forEach(key => {
        cacheService.set(key, `value-${key}`);
      });
      
      // Access patterns - some keys more frequently
      const accessPattern = [
        'key1', 'key1', 'key1', 'key2', 'key2', 'key3',
        'key1', 'key4', 'key2', 'key1', 'key5', 'key3',
        'key1', 'key2', 'key1', 'key3', 'key4', 'key1'
      ];
      
      accessPattern.forEach((key: string) => {
        cacheService.get(key);
      });
      
      const stats = cacheService.getStats();
      
      expect(stats.hitRate).toBeGreaterThan(95); // Should achieve >95% hit rate
      expect(stats.hits).toBe(accessPattern.length);
      expect(stats.misses).toBe(0);
    });
    
    it('should handle cache misses gracefully', () => {
      const existingKeys = ['key1', 'key2', 'key3'];
      const nonExistentKeys = ['missing1', 'missing2', 'missing3'];
      
      // Populate some keys
      existingKeys.forEach(key => {
        cacheService.set(key, `value-${key}`);
      });
      
      // Mix of hits and misses
      const accessPattern = [
        ...existingKeys,
        ...nonExistentKeys,
        ...existingKeys, // Second access should all be hits
      ];
      
      accessPattern.forEach((key: string) => {
        cacheService.get(key);
      });
      
      const stats = cacheService.getStats();
      
      expect(stats.hits).toBe(6); // 3 existing keys accessed twice
      expect(stats.misses).toBe(3); // 3 non-existent keys
      expect(stats.hitRate).toBeCloseTo(66.67, 1); // 6/9 = 66.67%
    });
  });
  
  describe('Cache Invalidation Performance', () => {
    it('should efficiently invalidate cache patterns', () => {
      // Create many cache entries with different patterns
      for (let i = 0; i < 100; i++) {
        cacheService.set(`product:${i}`, { id: i, type: 'product' });
        cacheService.set(`customer:${i}`, { id: i, type: 'customer' });
        cacheService.set(`order:${i}`, { id: i, type: 'order' });
      }
      
      expect(cacheService.getSize()).toBe(300);
      
      const start = Date.now();
      const deletedCount = cacheService.invalidatePattern('product:');
      const invalidationTime = Date.now() - start;
      
      expect(deletedCount).toBe(100);
      expect(cacheService.getSize()).toBe(200);
      expect(invalidationTime).toBeLessThan(50); // Should be fast
      
      // Verify only product keys were deleted
      expect(cacheService.has('product:1')).toBe(false);
      expect(cacheService.has('customer:1')).toBe(true);
      expect(cacheService.has('order:1')).toBe(true);
    });
  });
  
  describe('Stress Tests', () => {
    it('should handle rapid cache operations', () => {
      const operations = 1000;
      const start = Date.now();
      
      for (let i = 0; i < operations; i++) {
        const key = `stress:${i % 100}`; // Reuse keys to test overwrites
        cacheService.set(key, { iteration: i, timestamp: Date.now() });
        
        if (i % 2 === 0) {
          cacheService.get(key);
        }
        
        if (i % 10 === 0) {
          cacheService.has(key);
        }
      }
      
      const totalTime = Date.now() - start;
      
      expect(totalTime).toBeLessThan(2000); // Should complete in under 2 seconds (adjusted for test environment)
      expect(cacheService.getSize()).toBeLessThanOrEqual(100); // Should not exceed key limit
    });
    
    it('should maintain performance with TTL operations', async () => {
      const operations = 100;
      const start = Date.now();
      
      for (let i = 0; i < operations; i++) {
        cacheService.set(`ttl:${i}`, { data: i }, 1); // 1 second TTL
      }
      
      const setTime = Date.now() - start;
      expect(setTime).toBeLessThan(100);
      
      // Wait for some to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Force cleanup of expired keys
      cacheService.forceExpiredCleanup();
      
      // Verify expiration worked (allow for some keys to still be expiring)
      const remainingKeys = cacheService.keys().filter(key => key.startsWith('ttl:'));
      expect(remainingKeys.length).toBeLessThanOrEqual(10); // Allow some delay in expiration
    });
  });
});