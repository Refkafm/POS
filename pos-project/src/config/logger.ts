import { createLogger, format, transports, Logger } from 'winston';
import path from 'path';
import fs from 'fs';
import { config } from './environment';

// Ensure logs directory exists
const logsDir = path.dirname(config.logFile);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for sensitive data filtering
const sensitiveDataFilter = format((info: any) => {
  const sensitiveFields = [
    'password',
    'token',
    'authorization',
    'cookie',
    'session',
    'secret',
    'key',
    'auth',
    'jwt',
    'refresh_token',
    'access_token',
    'api_key',
    'private_key',
    'credit_card',
    'ssn',
    'social_security'
  ];

  const filterObject = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(filterObject);
    }

    const filtered: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        filtered[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        filtered[key] = filterObject(value);
      } else {
        filtered[key] = value;
      }
    }
    return filtered;
  };

  // Filter the message and any additional data
  if (typeof info.message === 'object') {
    info.message = filterObject(info.message);
  }

  // Filter any additional metadata
  Object.keys(info).forEach(key => {
    if (key !== 'level' && key !== 'timestamp' && key !== 'message') {
      info[key] = filterObject(info[key]);
    }
  });

  return info;
});

// Custom format for production
const productionFormat = format.combine(
  format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  sensitiveDataFilter(),
  format.errors({ stack: true }),
  format.json()
);

// Custom format for development
const developmentFormat = format.combine(
  format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  sensitiveDataFilter(),
  format.errors({ stack: true }),
  format.colorize(),
  format.printf(({ timestamp, level, message, ...meta }: any) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta, null, 2)}`;
    }
    return msg;
  })
);

// Create logger instance
const logger: Logger = createLogger({
  level: config.logLevel,
  format: config.nodeEnv === 'production' ? productionFormat : developmentFormat,
  defaultMeta: {
    service: 'pos-api',
    environment: config.nodeEnv,
    version: config.apiVersion
  },
  transports: [
    // Console transport
    new transports.Console({
      level: config.nodeEnv === 'production' ? 'warn' : 'debug',
      handleExceptions: true,
      handleRejections: true
    }),

    // File transport for all logs
    new transports.File({
      filename: config.logFile,
      level: config.logLevel,
      maxsize: parseInt(config.logMaxSize.replace('m', '')) * 1024 * 1024,
      maxFiles: config.logMaxFiles,
      handleExceptions: true,
      handleRejections: true
    }),

    // Separate file for errors
    new transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: parseInt(config.logMaxSize.replace('m', '')) * 1024 * 1024,
      maxFiles: config.logMaxFiles,
      handleExceptions: true,
      handleRejections: true
    })
  ],
  exitOnError: false
});

// Request logging middleware
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  const { method, url, ip, headers } = req;
  
  // Log request start
  logger.info('Request started', {
    method,
    url,
    ip,
    userAgent: headers['user-agent'],
    requestId: req.id || 'unknown'
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk: any, encoding: any) {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    // Log response
    const logLevel = statusCode >= 400 ? 'warn' : 'info';
    logger.log(logLevel, 'Request completed', {
      method,
      url,
      ip,
      statusCode,
      duration: `${duration}ms`,
      requestId: req.id || 'unknown'
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Security event logger
export const securityLogger = {
  loginAttempt: (username: string, ip: string, success: boolean, reason?: string) => {
    logger.warn('Login attempt', {
      event: 'login_attempt',
      username,
      ip,
      success,
      reason,
      timestamp: new Date().toISOString()
    });
  },

  rateLimitExceeded: (ip: string, endpoint: string, limit: number) => {
    logger.warn('Rate limit exceeded', {
      event: 'rate_limit_exceeded',
      ip,
      endpoint,
      limit,
      timestamp: new Date().toISOString()
    });
  },

  suspiciousActivity: (ip: string, activity: string, details?: any) => {
    logger.error('Suspicious activity detected', {
      event: 'suspicious_activity',
      ip,
      activity,
      details,
      timestamp: new Date().toISOString()
    });
  },

  authorizationFailure: (userId: string, resource: string, action: string) => {
    logger.warn('Authorization failure', {
      event: 'authorization_failure',
      userId,
      resource,
      action,
      timestamp: new Date().toISOString()
    });
  },

  dataAccess: (userId: string, resource: string, action: string, success: boolean) => {
    logger.info('Data access', {
      event: 'data_access',
      userId,
      resource,
      action,
      success,
      timestamp: new Date().toISOString()
    });
  }
};

// Database operation logger
export const dbLogger = {
  query: (operation: string, collection: string, duration: number, success: boolean, error?: string) => {
    const logLevel = success ? 'debug' : 'error';
    logger.log(logLevel, 'Database operation', {
      event: 'db_operation',
      operation,
      collection,
      duration: `${duration}ms`,
      success,
      error
    });
  },

  connection: (status: 'connected' | 'disconnected' | 'error', details?: string) => {
    const logLevel = status === 'error' ? 'error' : 'info';
    logger.log(logLevel, 'Database connection', {
      event: 'db_connection',
      status,
      details
    });
  }
};

// Performance logger
export const performanceLogger = {
  slowQuery: (query: string, duration: number, threshold: number = 1000) => {
    if (duration > threshold) {
      logger.warn('Slow query detected', {
        event: 'slow_query',
        query,
        duration: `${duration}ms`,
        threshold: `${threshold}ms`
      });
    }
  },

  memoryUsage: () => {
    const usage = process.memoryUsage();
    logger.debug('Memory usage', {
      event: 'memory_usage',
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(usage.external / 1024 / 1024)}MB`
    });
  }
};

// Error logger with context
export const errorLogger = {
  apiError: (error: Error, req: any, context?: any) => {
    logger.error('API Error', {
      event: 'api_error',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      request: {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      },
      context
    });
  },

  systemError: (error: Error, component: string, context?: any) => {
    logger.error('System Error', {
      event: 'system_error',
      component,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context
    });
  }
};

// Startup logger
export const startupLogger = {
  configLoaded: (config: any) => {
    logger.info('Configuration loaded', {
      event: 'config_loaded',
      environment: config.nodeEnv,
      port: config.port,
      logLevel: config.logLevel
    });
  },

  serviceStarted: (service: string, details?: any) => {
    logger.info('Service started', {
      event: 'service_started',
      service,
      details
    });
  },

  serviceError: (service: string, error: Error) => {
    logger.error('Service startup error', {
      event: 'service_error',
      service,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
  }
};

export default logger;