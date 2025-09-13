import { Request, Response, NextFunction } from 'express';
import { 
  AppError, 
  ValidationError, 
  DatabaseError, 
  AuthenticationError, 
  AuthorizationError,
  globalErrorHandler,
  requestIdMiddleware
} from '../src/middleware/errorHandler';

// Mock logger
jest.mock('../src/config/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}));

// Mock config
jest.mock('../src/config/environment', () => ({
  config: {
    nodeEnv: 'development',
    port: 3002
  }
}));

describe('Error Handler Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      url: '/test',
      originalUrl: '/test',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent'
      },
      body: {},
      query: {},
      params: {},
      requestId: 'test-request-id',
      get: jest.fn().mockImplementation((header: string) => {
        if (header.toLowerCase() === 'user-agent') {
          return 'test-agent';
        }
        return mockRequest.headers?.[header.toLowerCase()];
      }) as any
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      locals: {}
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Custom Error Classes', () => {
    describe('AppError', () => {
      it('should create AppError with default values', () => {
        const error = new AppError('Test error');
        
        expect(error.message).toBe('Test error');
        expect(error.statusCode).toBe(500);
        expect(error.isOperational).toBe(true);
        expect(error.code).toBeUndefined();
      });

      it('should create AppError with custom values', () => {
        const error = new AppError('Custom error', 400, 'CUSTOM_ERROR');
        
        expect(error.message).toBe('Custom error');
        expect(error.statusCode).toBe(400);
        expect(error.isOperational).toBe(true);
        expect(error.code).toBe('CUSTOM_ERROR');
      });

      it('should capture stack trace', () => {
        const error = new AppError('Stack test');
        expect(error.stack).toBeDefined();
      });
    });

    describe('ValidationError', () => {
      it('should create ValidationError with field and value', () => {
        const error = new ValidationError('Invalid email', 'email', 'invalid-email');
        
        expect(error.message).toBe('Invalid email');
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.field).toBe('email');
        expect(error.value).toBe('invalid-email');
      });

      it('should create ValidationError without field and value', () => {
        const error = new ValidationError('General validation error');
        
        expect(error.message).toBe('General validation error');
        expect(error.field).toBeUndefined();
        expect(error.value).toBeUndefined();
      });
    });

    describe('DatabaseError', () => {
      it('should create DatabaseError with original error', () => {
        const originalError = new Error('Connection failed');
        const error = new DatabaseError('Database connection error', originalError);
        
        expect(error.message).toBe('Database connection error');
        expect(error.statusCode).toBe(500);
        expect(error.code).toBe('DATABASE_ERROR');
        expect(error.stack).toBe(originalError.stack);
      });

      it('should create DatabaseError without original error', () => {
        const error = new DatabaseError('Database error');
        
        expect(error.message).toBe('Database error');
        expect(error.statusCode).toBe(500);
        expect(error.code).toBe('DATABASE_ERROR');
      });
    });

    describe('AuthenticationError', () => {
      it('should create AuthenticationError with default message', () => {
        const error = new AuthenticationError();
        
        expect(error.message).toBe('Authentication required');
        expect(error.statusCode).toBe(401);
        expect(error.code).toBe('AUTHENTICATION_ERROR');
      });

      it('should create AuthenticationError with custom message', () => {
        const error = new AuthenticationError('Invalid token');
        
        expect(error.message).toBe('Invalid token');
        expect(error.statusCode).toBe(401);
        expect(error.code).toBe('AUTHENTICATION_ERROR');
      });
    });

    describe('AuthorizationError', () => {
      it('should create AuthorizationError with default message', () => {
        const error = new AuthorizationError();
        
        expect(error.message).toBe('Access denied');
        expect(error.statusCode).toBe(403);
        expect(error.code).toBe('AUTHORIZATION_ERROR');
      });

      it('should create AuthorizationError with custom message', () => {
        const error = new AuthorizationError('Insufficient permissions');
        
        expect(error.message).toBe('Insufficient permissions');
        expect(error.statusCode).toBe(403);
        expect(error.code).toBe('AUTHORIZATION_ERROR');
      });
    });
  });

  describe('Request ID Middleware', () => {
    it('should add request ID to request and response', () => {
      requestIdMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockRequest.requestId).toBeDefined();
      expect(mockResponse.locals!.requestId).toBeDefined();
      expect(mockRequest.requestId).toBe(mockResponse.locals!.requestId);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should generate unique request IDs', () => {
      const req1 = { ...mockRequest };
      const res1 = { ...mockResponse, locals: {} };
      const req2 = { ...mockRequest };
      const res2 = { ...mockResponse, locals: {} };
      
      requestIdMiddleware(req1 as Request, res1 as Response, mockNext);
      requestIdMiddleware(req2 as Request, res2 as Response, mockNext);
      
      expect(req1.requestId).not.toBe(req2.requestId);
    });
  });

  describe('Global Error Handler', () => {
    it('should handle AppError correctly', () => {
      const error = new AppError('Test app error', 400, 'TEST_ERROR');
      
      globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: 'Test app error',
          code: 'TEST_ERROR',
          statusCode: 400
        }),
        requestId: undefined
      }));
    });

    it('should handle ValidationError with field details', () => {
      const error = new ValidationError('Invalid email format', 'email', 'invalid@');
      
      globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Invalid email format',
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          field: 'email',
          value: 'invalid@',
          stack: expect.any(String)
        }
      });
    });

    it('should handle generic Error as internal server error', () => {
      const error = new Error('Generic error');
      
      globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
          statusCode: 500
        }),
        requestId: undefined
      }));
    });

    it('should include request ID when available', () => {
      const error = new AppError('Test error');
      mockResponse.locals!.requestId = 'test-request-id';
      
      globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        requestId: 'test-request-id'
      }));
    });

    it('should handle errors without status method', () => {
      const error = new AppError('Test error', 400);
      mockResponse.status = undefined;
      mockResponse.json = jest.fn();
      
      // Should not throw
      expect(() => {
        globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      }).not.toThrow();
    });

    it('should handle MongoDB duplicate key error', () => {
      const mongoError = {
        name: 'MongoError',
        code: 11000,
        message: 'E11000 duplicate key error collection: test.users index: email_1 dup key: { email: "test@test.com" }'
      };
      
      globalErrorHandler(mongoError as any, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: expect.stringContaining('already exists'),
          code: 'DUPLICATE_KEY_ERROR',
          statusCode: 400
        })
      }));
    });

    it('should handle JWT errors', () => {
      const jwtError = {
        name: 'JsonWebTokenError',
        message: 'invalid token'
      };
      
      globalErrorHandler(jwtError as any, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: 'Invalid token',
          code: 'INVALID_TOKEN',
          statusCode: 401
        })
      }));
    });

    it('should handle validation errors from express-validator', () => {
      const validationError = {
        name: 'ValidationError',
        errors: [
          { path: 'email', message: 'Invalid email' },
          { path: 'password', message: 'Password too short' }
        ]
      };
      
      globalErrorHandler(validationError as any, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          details: expect.arrayContaining([
            expect.objectContaining({ field: 'email', message: 'Invalid email' }),
            expect.objectContaining({ field: 'password', message: 'Password too short' })
          ])
        })
      }));
    });
  });

  describe('Error Handler Edge Cases', () => {
    it('should handle null error', () => {
      globalErrorHandler(null as any, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: 'Internal server error',
          statusCode: 500
        })
      }));
    });

    it('should handle undefined error', () => {
      globalErrorHandler(undefined as any, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('should handle error with circular references', () => {
      const circularError: any = new Error('Circular error');
      circularError.self = circularError;
      
      expect(() => {
        globalErrorHandler(circularError, mockRequest as Request, mockResponse as Response, mockNext);
      }).not.toThrow();
    });
  });
});