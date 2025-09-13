import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { config } from '../config/environment';

// Custom error class for application errors
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Validation error class
export class ValidationError extends AppError {
  public field?: string;
  public value?: any;
  public details?: Array<{ field: string; message: string }>;

  constructor(message: string, field?: string, value?: any, details?: Array<{ field: string; message: string }>) {
    super(message, 400, 'VALIDATION_ERROR');
    this.field = field;
    this.value = value;
    this.details = details;
  }
}

// Database error class
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, 500, 'DATABASE_ERROR');
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

// Authentication error class
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

// Utility function to create standardized error responses
export const createErrorResponse = (message: string, statusCode: number = 500, code?: string, requestId?: string) => {
  const errorResponse: any = {
    success: false,
    error: {
      message,
      code: code || 'GENERIC_ERROR',
      statusCode
    }
  };
  
  if (requestId) {
    errorResponse.requestId = requestId;
  }
  
  return errorResponse;
};

// Utility function to create standardized success responses
export const createSuccessResponse = (data: any, message?: string, requestId?: string) => {
  const successResponse: any = {
    success: true,
    data
  };
  
  if (message) {
    successResponse.message = message;
  }
  
  if (requestId) {
    successResponse.requestId = requestId;
  }
  
  return successResponse;
};

// Helper function to handle async route errors
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Authorization error class
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

// Duplicate key error class
export class DuplicateKeyError extends AppError {
  constructor(message: string) {
    super(message, 400, 'DUPLICATE_KEY_ERROR');
  }
}

// Not found error class
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND_ERROR');
  }
}

// Rate limit error class
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

// File upload error class
export class FileUploadError extends AppError {
  constructor(message: string) {
    super(message, 400, 'FILE_UPLOAD_ERROR');
  }
}

// Error response interface
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    statusCode: number;
    field?: string;
    value?: any;
    details?: Array<{ field: string; message: string }>;
    stack?: string;
    timestamp: string;
    requestId?: string;
  };
}

// Generate unique request ID
const generateRequestId = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// Request ID middleware
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.requestId = generateRequestId();
  res.setHeader('X-Request-ID', req.requestId);
  if (!res.locals) {
    res.locals = {};
  }
  res.locals.requestId = req.requestId;
  next();
};

// Async error handler wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Handle specific error types
const handleCastError = (error: any): AppError => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return new ValidationError(message, error.path, error.value);
};

const handleDuplicateFieldsError = (error: any): AppError => {
  const value = error.errmsg?.match(/(["\''])(\\?.)*?\1/)?.[0];
  const message = `${value} already exists. Please use another value!`;
  return new DuplicateKeyError(message);
};

const handleValidationError = (error: any): AppError => {
  const details = Object.values(error.errors).map((el: any) => ({
    field: el.path,
    message: el.message
  }));
  const message = 'Validation failed';
  return new ValidationError(message, undefined, undefined, details);
};

const handleJWTError = (): AppError => {
  return new AppError('Invalid token', 401, 'INVALID_TOKEN');
};

const handleJWTExpiredError = (): AppError => {
  return new AuthenticationError('Your token has expired! Please log in again.');
};

// Send error response in development
const sendErrorDev = (err: AppError, req: Request, res: Response) => {
  const errorResponse: any = {
    success: false,
    error: {
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      stack: err.stack
    }
  };

  // Add ValidationError specific fields if it's a ValidationError
  // Use code check instead of instanceof to avoid Jest issues
  if (err.code === 'VALIDATION_ERROR' && 'field' in err) {
    const validationErr = err as ValidationError;
    errorResponse.error.field = validationErr.field;
    errorResponse.error.value = validationErr.value;
    if (validationErr.details) {
      errorResponse.error.details = validationErr.details;
    }
  }

  // Always include requestId field
  errorResponse.requestId = res.locals?.requestId;

  // Log error details
  logger.error('Error occurred:', {
    message: err.message,
    statusCode: err.statusCode,
    code: err.code,
    stack: err.stack,
    requestId: req.requestId,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Safety check for status method
  if (typeof res.status === 'function') {
    res.status(err.statusCode).json(errorResponse);
  } else {
    res.json(errorResponse);
  }
};

// Send error response in production
const sendErrorProd = (err: AppError, req: Request, res: Response) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    const errorObj: any = {
      message: err.message,
      code: err.code,
      statusCode: err.statusCode
    };
    
    // Add field-specific properties for ValidationError
    if (err instanceof ValidationError) {
      if (err.field) errorObj.field = err.field;
      if (err.value !== undefined) errorObj.value = err.value;
      if (err.details) errorObj.details = err.details;
    }
    
    const errorResponse: any = {
      success: false,
      error: errorObj
    };
    
    // Only add requestId if it exists
    if (res.locals?.requestId) {
      errorResponse.requestId = res.locals.requestId;
    }

    // Log operational errors
    logger.warn('Operational error:', {
      message: err.message,
      statusCode: err.statusCode,
      code: err.code,
      requestId: req.requestId,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip
    });

    if (typeof res.status === 'function') {
      res.status(err.statusCode).json(errorResponse);
    } else {
      res.json(errorResponse);
    }
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('Programming error:', {
      message: err.message,
      stack: err.stack,
      requestId: req.requestId,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const errorResponse: any = {
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        statusCode: 500
      }
    };
    
    // Only add requestId if it exists
    if (res.locals?.requestId) {
      errorResponse.requestId = res.locals.requestId;
    }

    if (typeof res.status === 'function') {
      res.status(500).json(errorResponse);
    } else {
      res.json(errorResponse);
    }
  }
};

// Global error handling middleware
export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Handle null or undefined errors
  if (!err) {
    err = new Error('Internal server error');
  }
  
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (config.nodeEnv === 'development') {
    // Handle specific error types in development too
    let error = err;
    if (error.name === 'CastError') error = handleCastError(error);
    if (error.code === 11000) error = handleDuplicateFieldsError(error);
    if (error.name === 'ValidationError' && error.errors) error = handleValidationError(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    if (error.type === 'entity.parse.failed' || error.message === 'Invalid JSON format') {
      error = new ValidationError('Invalid JSON format');
    }
    
    // Convert generic errors to AppError
    if (!(error instanceof AppError)) {
      error = new AppError('Internal server error', 500, 'INTERNAL_ERROR');
    }
    
    sendErrorDev(error, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (error.name === 'CastError') error = handleCastError(error);
    if (error.code === 11000) error = handleDuplicateFieldsError(error);
    if (error.name === 'ValidationError') error = handleValidationError(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    if (error.type === 'entity.parse.failed' || error.message === 'Invalid JSON format') {
      error = new ValidationError('Invalid JSON format');
    }

    sendErrorProd(error, req, res);
  }
};

// Handle unhandled routes
export const handleUnhandledRoutes = (req: Request, res: Response, next: NextFunction) => {
  const err = new NotFoundError(`Can't find ${req.originalUrl} on this server`);
  next(err);
};

// Handle uncaught exceptions
export const handleUncaughtException = () => {
  process.on('uncaughtException', (err: Error) => {
    logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', {
      message: err.message,
      stack: err.stack
    });
    process.exit(1);
  });
};

// Handle unhandled promise rejections
export const handleUnhandledRejection = (server: any) => {
  process.on('unhandledRejection', (err: Error) => {
    logger.error('UNHANDLED REJECTION! 💥 Shutting down...', {
      message: err.message,
      stack: err.stack
    });
    server.close(() => {
      process.exit(1);
    });
  });
};

// Graceful shutdown handler
export const handleGracefulShutdown = (server: any) => {
  const gracefulShutdown = (signal: string) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      logger.info('Process terminated');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}