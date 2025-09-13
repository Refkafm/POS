import NodeCache from 'node-cache';
import * as crypto from 'crypto';
import logger from '../config/logger';
import { config } from '../config/environment';

// Cache configuration interface
interface CacheConfig {
  stdTTL: number; // Standard time to live in seconds
  checkperiod: number; // Period in seconds for automatic delete check
  useClones: boolean; // Whether to clone variables on get/set
  deleteOnExpire: boolean; // Whether to delete expired keys automatically
  maxKeys: number; // Maximum number of keys
}

// Cache statistics interface
interface CacheStats {
  keys: number;
  hits: number;
  misses: number;
  ksize: number;
  vsize: number;
}

// Cache key patterns
export enum CacheKeys {
  PRODUCTS = 'products',
  PRODUCT_BY_ID = 'product:',
  SALES = 'sales',
  SALES_HISTORY = 'sales:history:',
  CUSTOMERS = 'customers',
  CUSTOMER_BY_ID = 'customer:',
  INVENTORY = 'inventory',
  SUPPLIERS = 'suppliers',
  REPORTS_DAILY = 'reports:daily:',
  REPORTS_MONTHLY = 'reports:monthly:',
  REPORTS_YEARLY = 'reports:yearly:',
  USER_PERMISSIONS = 'user:permissions:',
  DASHBOARD_STATS = 'dashboard:stats'
}

// Cache service class
class CacheService {
  private cache: NodeCache;
  private hitCount: number = 0;
  private missCount: number = 0;

  constructor() {
    const cacheConfig: CacheConfig = {
      stdTTL: 600, // 10 minutes default
      checkperiod: 120, // 2 minutes default
      useClones: false, // Better performance
      deleteOnExpire: true,
      maxKeys: 1000
    };

    this.cache = new NodeCache(cacheConfig);
    this.setupEventListeners();
    
    logger.info('Cache service initialized', {
      ttl: cacheConfig.stdTTL,
      checkPeriod: cacheConfig.checkperiod,
      maxKeys: cacheConfig.maxKeys
    });
  }

  // Set up event listeners for cache events
  private setupEventListeners(): void {
    this.cache.on('set', (key: string, value: any) => {
      logger.debug('Cache set', { key, size: JSON.stringify(value).length });
    });

    this.cache.on('del', (key: string, value: any) => {
      logger.debug('Cache delete', { key });
    });

    this.cache.on('expired', (key: string, value: any) => {
      logger.debug('Cache expired', { key });
    });

    this.cache.on('flush', () => {
      logger.info('Cache flushed');
    });
  }

  // Get value from cache
  public get<T>(key: string): T | undefined {
    const value = this.cache.get<T>(key);
    
    if (value !== undefined) {
      this.hitCount++;
      logger.debug('Cache hit', { key });
      return value;
    } else {
      this.missCount++;
      logger.debug('Cache miss', { key });
      return undefined;
    }
  }

  // Set value in cache
  public set<T>(key: string, value: T, ttl?: number): boolean {
    try {
      const success = ttl !== undefined ? this.cache.set(key, value, ttl) : this.cache.set(key, value);
      if (success) {
        logger.debug('Cache set successful', { key, ttl });
      } else {
        logger.warn('Cache set failed', { key });
      }
      return success;
    } catch (error) {
      logger.error('Cache set error', { key, error });
      return false;
    }
  }

  // Delete value from cache
  public del(key: string | string[]): number {
    const hadKey = this.cache.has(Array.isArray(key) ? key[0] : key);
    const deletedCount = this.cache.del(key);
    const stillHasKey = this.cache.has(Array.isArray(key) ? key[0] : key);
    console.log(`Cache delete - key: ${key}, hadKey: ${hadKey}, deletedCount: ${deletedCount}, stillHasKey: ${stillHasKey}`);
    logger.debug('Cache delete', { key, deletedCount, hadKey, stillHasKey });
    return deletedCount;
  }

  // Check if key exists in cache
  public has(key: string): boolean {
    return this.cache.has(key);
  }

  // Get cache statistics
  public getStats(): CacheStats & { hitRate: number; missRate: number } {
    const stats = this.cache.getStats();
    const totalRequests = this.hitCount + this.missCount;
    
    return {
      ...stats,
      hits: this.hitCount,
      misses: this.missCount,
      hitRate: totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0,
      missRate: totalRequests > 0 ? (this.missCount / totalRequests) * 100 : 0
    };
  }

  // Get all keys
  public keys(): string[] {
    return this.cache.keys();
  }

  // Flush all cache
  public flushAll(): void {
    this.cache.flushAll();
    this.hitCount = 0;
    this.missCount = 0;
    logger.info('Cache flushed completely');
  }

  // Get cache size
  public getSize(): number {
    return this.cache.keys().length;
  }

  // Force cleanup of expired keys
  public forceExpiredCleanup(): void {
    // Use NodeCache's internal _checkData method if available, otherwise fallback
    if (typeof (this.cache as any)._checkData === 'function') {
      (this.cache as any)._checkData();
    } else {
      // Fallback: trigger expiration check by accessing keys
      const keys = this.cache.keys();
      keys.forEach(key => {
        this.cache.get(key);
      });
    }
  }

  // Get or set pattern (cache-aside pattern)
  public async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cachedValue = this.get<T>(key);
    if (cachedValue !== undefined) {
      return cachedValue;
    }

    // If not in cache, fetch the data
    try {
      const value = await fetchFunction();
      this.set(key, value, ttl);
      return value;
    } catch (error) {
      logger.error('Cache getOrSet fetch error', { key, error });
      throw error;
    }
  }

  // Invalidate cache by pattern
  public invalidatePattern(pattern: string): number {
    const keys = this.cache.keys();
    const matchingKeys = keys.filter(key => key.includes(pattern));
    
    if (matchingKeys.length > 0) {
      const deletedCount = this.cache.del(matchingKeys);
      logger.info('Cache pattern invalidated', { pattern, deletedCount });
      return deletedCount;
    }
    
    return 0;
  }

  // Warm up cache with initial data
  public async warmUp(warmUpFunctions: Array<{ key: string; fn: () => Promise<any>; ttl?: number }>): Promise<void> {
    logger.info('Starting cache warm-up', { functions: warmUpFunctions.length });
    
    const promises = warmUpFunctions.map(async ({ key, fn, ttl }) => {
      try {
        const data = await fn();
        this.set(key, data, ttl);
        logger.debug('Cache warm-up successful', { key });
      } catch (error) {
        logger.error('Cache warm-up failed', { key, error });
      }
    });

    await Promise.allSettled(promises);
    logger.info('Cache warm-up completed');
  }

  // Cache middleware for Express routes
  public middleware(keyGenerator: (req: any) => string, ttl?: number) {
    return (req: any, res: any, next: any) => {
      const key = keyGenerator(req);
      const cachedResponse = this.get(key);
      
      if (cachedResponse) {
        logger.debug('Serving cached response', { key });
        return res.json(cachedResponse);
      }

      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = (body: any) => {
        if (res.statusCode === 200 && body.success) {
          this.set(key, body, ttl);
        }
        return originalJson.call(res, body);
      };

      next();
    };
  }

  // Health check for cache service
  public healthCheck(): { status: string; stats: any } {
    try {
      const stats = this.getStats();
      return {
        status: 'healthy',
        stats
      };
    } catch (error) {
      logger.error('Cache health check failed', { error });
      return {
        status: 'unhealthy',
        stats: null
      };
    }
  }
}

// Create and export cache service instance
export const cacheService = new CacheService();

// Cache utility functions
export class CacheUtils {
  // Generate cache key for products
  static productKey(id?: string): string {
    return id ? `${CacheKeys.PRODUCT_BY_ID}${id}` : CacheKeys.PRODUCTS;
  }

  // Generate cache key for customers
  static customerKey(id?: string): string {
    return id ? `${CacheKeys.CUSTOMER_BY_ID}${id}` : CacheKeys.CUSTOMERS;
  }

  // Generate cache key for sales history
  static salesHistoryKey(filters: any): string {
    const filterString = JSON.stringify(filters);
    const hash = crypto.createHash('md5').update(filterString).digest('hex');
    return `${CacheKeys.SALES_HISTORY}${hash}`;
  }

  // Generate cache key for reports
  static reportKey(type: 'daily' | 'monthly' | 'yearly', date: string): string {
    switch (type) {
      case 'daily':
        return `${CacheKeys.REPORTS_DAILY}${date}`;
      case 'monthly':
        return `${CacheKeys.REPORTS_MONTHLY}${date}`;
      case 'yearly':
        return `${CacheKeys.REPORTS_YEARLY}${date}`;
      default:
        return `reports:${type}:${date}`;
    }
  }

  // Generate cache key for user permissions
  static userPermissionsKey(userId: string): string {
    return `${CacheKeys.USER_PERMISSIONS}${userId}`;
  }

  // Generate cache key for dashboard stats
  static dashboardStatsKey(): string {
    return CacheKeys.DASHBOARD_STATS;
  }
}

// Cache decorators for methods
export function Cacheable(key: string | ((...args: any[]) => string), ttl?: number) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = typeof key === 'function' ? key(...args) : key;
      
      // Try to get from cache
      const cachedResult = cacheService.get(cacheKey);
      if (cachedResult !== undefined) {
        return cachedResult;
      }

      // Execute method and cache result
      const result = await method.apply(this, args);
      cacheService.set(cacheKey, result, ttl);
      
      return result;
    };
  };
}

// Cache invalidation decorator
export function InvalidateCache(patterns: string | string[]) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await method.apply(this, args);
      
      // Invalidate cache patterns
      const patternsArray = Array.isArray(patterns) ? patterns : [patterns];
      patternsArray.forEach(pattern => {
        cacheService.invalidatePattern(pattern);
      });
      
      return result;
    };
  };
}

export default cacheService;