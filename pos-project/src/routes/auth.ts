import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { getUserByEmail, createUser } from '../services/userService';
import { config } from '../config/environment';
import { createErrorResponse, createSuccessResponse, catchAsync, AppError } from '../middleware/errorHandler';

const JWT_SECRET = 'your-secret-key'; // In production, use environment variables
const SALT_ROUNDS = 10;

export function setAuthRoutes(app: express.Application) {
  // Login endpoint
  app.post('/api/auth/login', express.json(), async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
      const errorResponse = createErrorResponse('Email and password are required', 400, 'MISSING_CREDENTIALS', res.locals?.requestId);
      return res.status(400).json(errorResponse);
    }

    try {
      // Get user by email
      const user = await getUserByEmail(email);
      
      if (!user || !user.isActive || !(await bcrypt.compare(password, user.password))) {
        const errorResponse = createErrorResponse('Invalid credentials or inactive account', 401, 'INVALID_CREDENTIALS', res.locals?.requestId);
        return res.status(401).json(errorResponse);
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user._id,
          email: user.email,
          role: user.role 
        }, 
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      const successResponse = createSuccessResponse({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }, 'Login successful', res.locals?.requestId);
      res.json(successResponse);
    } catch (error) {
      console.error('Authentication error:', error);
      const errorResponse = createErrorResponse('Authentication failed', 500, 'AUTH_ERROR', res.locals?.requestId);
      res.status(500).json(errorResponse);
    }
  });

  // Token validation endpoint
  app.get('/api/auth/validate', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      const errorResponse = createErrorResponse('Token is required', 400, 'TOKEN_REQUIRED', res.locals?.requestId);
      return res.status(400).json(errorResponse);
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Get user from database to ensure they still exist and are active
      const user = await getUserByEmail(decoded.email);
      
      if (!user || !user.isActive) {
      const errorResponse = createErrorResponse('Invalid token or inactive user', 401, 'INVALID_TOKEN', res.locals?.requestId);
      return res.status(401).json(errorResponse);
    }
      
      // Don't send password in response
      const userResponse = typeof user.toObject === 'function' ? user.toObject() : { ...user };
      delete userResponse.password;
      
      const successResponse = createSuccessResponse({
        user: userResponse
      }, 'Token verified successfully', res.locals?.requestId);
      res.json(successResponse);
    } catch (error) {
      console.error('Token validation error:', error);
      const errorResponse = createErrorResponse('Invalid token', 401, 'INVALID_TOKEN', res.locals?.requestId);
      res.status(401).json(errorResponse);
    }
  });

  // Register endpoint (for creating new users with hashed passwords)
  app.post('/api/auth/register', express.json(), async (req, res) => {
    try {
      const { name, email, password, role = 'cashier' } = req.body;
      
      if (!name || !email || !password) {
        const errorResponse = createErrorResponse('Name, email and password are required', 400, 'MISSING_REQUIRED_FIELDS', res.locals?.requestId);
        return res.status(400).json(errorResponse);
      }
      
      // Check if user already exists
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        const errorResponse = createErrorResponse('User with this email already exists', 409, 'EMAIL_EXISTS', res.locals?.requestId);
        return res.status(409).json(errorResponse);
      }
      
      // Create new user (password will be hashed by the pre-save hook)
      const newUser = await createUser({
        name,
        email,
        password,
        role: role as 'admin' | 'cashier' | 'manager',
        isActive: true
      });
      
      // Don't send password in response
      const userResponse = typeof newUser.toObject === 'function' ? newUser.toObject() : { ...newUser };
      delete userResponse.password;
      
      const successResponse = createSuccessResponse({
        user: userResponse
      }, 'User registered successfully', res.locals?.requestId);
      res.status(201).json(successResponse);
    } catch (error) {
      console.error('Registration error:', error);
      const errorResponse = createErrorResponse('Registration failed', 500, 'REGISTRATION_ERROR', res.locals?.requestId);
      res.status(500).json(errorResponse);
    }
  });
}