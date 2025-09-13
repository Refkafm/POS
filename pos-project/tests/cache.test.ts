import cacheService, { CacheKeys } from '../src/services/cacheService';

describe('Cache Service Tests', () => {
  // Use the singleton cache service instance

  beforeEach(() => {
    // Clear cache before each test
    cacheService.flushAll();
  });

  afterEach(() => {
    // Clean up cache after each test
    cacheService.flushAll();
  });

  describe('Basic Cache Operations', () => {
    it('should set and get values correctly', () => {
      const key = 'test-key';
      const value = { id: 1, name: 'Test Product' };

      const setResult = cacheService.set(key, value);
      expect(setResult).toBe(true);

      const retrievedValue = cacheService.get(key);
      expect(retrievedValue).toEqual(value);
    });

    it('should return undefined for non-existent keys', () => {
      const result = cacheService.get('non-existent-key');
      expect(result).toBeUndefined();
    });

    it('should check if key exists', () => {
      const key = 'exists-key';
      const value = 'test-value';

      expect(cacheService.has(key)).toBe(false);
      
      cacheService.set(key, value);
      expect(cacheService.has(key)).toBe(true);
    });

    it('should delete keys correctly', () => {
      const key = 'delete-key';
      const value = 'delete-value';

      cacheService.set(key, value);
      expect(cacheService.has(key)).toBe(true);

      const deletedCount = cacheService.del(key);
      expect(deletedCount).toBe(1);
      expect(cacheService.has(key)).toBe(false);
    });

    it('should delete multiple keys', () => {
      const keys = ['key1', 'key2', 'key3'];
      keys.forEach(key => cacheService.set(key, `value-${key}`));

      const deletedCount = cacheService.del(keys);
      expect(deletedCount).toBe(3);
      
      keys.forEach(key => {
        expect(cacheService.has(key)).toBe(false);
      });
    });
  });

  describe('TTL (Time To Live) Operations', () => {
    it('should set values with custom TTL', () => {
      const key = 'ttl-key';
      const value = 'ttl-value';
      const ttl = 1; // 1 second

      const result = cacheService.set(key, value, ttl);
      expect(result).toBe(true);
      expect(cacheService.get(key)).toBe(value);
    });

    it('should expire keys after TTL', (done) => {
      const key = 'expire-key';
      const value = 'expire-value';
      const ttl = 1; // 1 second

      cacheService.set(key, value, ttl);
      expect(cacheService.get(key)).toBe(value);

      // Wait for expiration
      setTimeout(() => {
        expect(cacheService.get(key)).toBeUndefined();
        done();
      }, 1100); // Wait slightly longer than TTL
    });
  });

  describe('Cache Statistics', () => {
    it('should track hit and miss statistics', () => {
      const key = 'stats-key';
      const value = 'stats-value';

      // Initial stats
      let stats = cacheService.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);

      // Cache miss
      cacheService.get('non-existent');
      stats = cacheService.getStats();
      expect(stats.misses).toBe(1);

      // Cache set and hit
      cacheService.set(key, value);
      cacheService.get(key);
      stats = cacheService.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it('should calculate hit and miss rates', () => {
      const key = 'rate-key';
      const value = 'rate-value';

      cacheService.set(key, value);
      
      // 2 hits, 1 miss
      cacheService.get(key);
      cacheService.get(key);
      cacheService.get('non-existent');

      const stats = cacheService.getStats();
      expect(stats.hitRate).toBeCloseTo(66.67, 1);
      expect(stats.missRate).toBeCloseTo(33.33, 1);
    });
  });

  describe('Advanced Cache Operations', () => {
    it('should implement getOrSet pattern', async () => {
      const key = 'getOrSet-key';
      const expectedValue = { id: 1, data: 'fetched' };
      
      const fetchFunction = jest.fn().mockResolvedValue(expectedValue);

      // First call should fetch and cache
      const result1 = await cacheService.getOrSet(key, fetchFunction);
      expect(result1).toEqual(expectedValue);
      expect(fetchFunction).toHaveBeenCalledTimes(1);

      // Second call should return cached value
      const result2 = await cacheService.getOrSet(key, fetchFunction);
      expect(result2).toEqual(expectedValue);
      expect(fetchFunction).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should handle getOrSet fetch errors', async () => {
      const key = 'error-key';
      const error = new Error('Fetch failed');
      const fetchFunction = jest.fn().mockRejectedValue(error);

      await expect(cacheService.getOrSet(key, fetchFunction)).rejects.toThrow('Fetch failed');
      expect(cacheService.has(key)).toBe(false);
    });

    it('should invalidate cache by pattern', () => {
      // Set multiple keys with patterns
      cacheService.set('product:1', { id: 1 });
      cacheService.set('product:2', { id: 2 });
      cacheService.set('customer:1', { id: 1 });
      cacheService.set('other:key', { data: 'test' });

      // Invalidate product pattern
      const deletedCount = cacheService.invalidatePattern('product:');
      expect(deletedCount).toBe(2);

      // Check that only product keys were deleted
      expect(cacheService.has('product:1')).toBe(false);
      expect(cacheService.has('product:2')).toBe(false);
      expect(cacheService.has('customer:1')).toBe(true);
      expect(cacheService.has('other:key')).toBe(true);
    });

    it('should return cache size correctly', () => {
      expect(cacheService.getSize()).toBe(0);

      cacheService.set('key1', 'value1');
      expect(cacheService.getSize()).toBe(1);

      cacheService.set('key2', 'value2');
      expect(cacheService.getSize()).toBe(2);

      cacheService.del('key1');
      expect(cacheService.getSize()).toBe(1);
    });

    it('should flush all cache', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      expect(cacheService.getSize()).toBe(2);

      cacheService.flushAll();
      expect(cacheService.getSize()).toBe(0);
      
      // Stats should also be reset
      const stats = cacheService.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('Cache Keys Enum', () => {
    it('should have predefined cache key patterns', () => {
      expect(CacheKeys.PRODUCTS).toBe('products');
      expect(CacheKeys.PRODUCT_BY_ID).toBe('product:');
      expect(CacheKeys.SALES).toBe('sales');
      expect(CacheKeys.CUSTOMERS).toBe('customers');
      expect(CacheKeys.DASHBOARD_STATS).toBe('dashboard:stats');
    });

    it('should use cache keys in operations', () => {
      const productId = '123';
      const productKey = `${CacheKeys.PRODUCT_BY_ID}${productId}`;
      const product = { id: productId, name: 'Test Product' };

      cacheService.set(productKey, product);
      const retrieved = cacheService.get(productKey);
      
      expect(retrieved).toEqual(product);
    });
  });
});