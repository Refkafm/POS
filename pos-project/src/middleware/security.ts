import { Request, Response, NextFunction, Application } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { config } from '../config/environment';

// Rate limiting configuration
const createRateLimiter = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests',
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: Request) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/api/health';
    }
  });
};

// General rate limiter
export const generalRateLimit = createRateLimiter(
  config.rateLimitWindowMs,
  config.rateLimitMaxRequests,
  `Too many requests from this IP, please try again after ${Math.ceil(config.rateLimitWindowMs / 60000)} minutes.`
);

// Strict rate limiter for auth endpoints
export const authRateLimit = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // 100 attempts (increased for development)
  'Too many authentication attempts, please try again after 15 minutes.'
);

// API rate limiter
export const apiRateLimit = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  1000, // 1000 requests per 15 minutes
  'API rate limit exceeded, please try again later.'
);

// CORS configuration
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = config.corsOrigin.split(',').map(o => o.trim());
    
    if (allowedOrigins.includes(origin) || config.nodeEnv === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: config.corsCredentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};

// Session configuration
export const sessionConfig = {
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: config.mongodbUri,
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: {
    secure: config.nodeEnv === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS
    maxAge: config.sessionMaxAge,
    sameSite: 'strict' as const // CSRF protection
  },
  name: 'pos.sid' // Change default session name
};

// Helmet configuration
export const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'http://localhost:3001'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: config.nodeEnv === 'production' ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false, // Disable for development
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

// Request sanitization middleware
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction) => {
  // Remove null bytes from request
  const sanitizeString = (str: string): string => {
    return str.replace(/\0/g, '');
  };
  
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = Array.isArray(obj) ? [] : {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  };
  
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  next();
};

// Apply all security middleware
export const applySecurity = (app: Application) => {
  // Basic security headers
  app.use(helmet(helmetConfig));
  app.use(securityHeaders);
  
  // CORS
  app.use(cors(corsOptions));
  
  // Session management
  app.use(session(sessionConfig));
  
  // Request sanitization
  app.use(sanitizeRequest);
  
  // Rate limiting
  app.use('/api/auth', authRateLimit);
  app.use('/api', apiRateLimit);
  app.use(generalRateLimit);
  
  console.log('✅ Security middleware applied');
};

export default {
  applySecurity,
  generalRateLimit,
  authRateLimit,
  apiRateLimit,
  corsOptions,
  sessionConfig,
  helmetConfig,
  securityHeaders,
  sanitizeRequest
};