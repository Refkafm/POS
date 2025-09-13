import express from 'express';
import { 
  getAllUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  getUserById,
  getUsersByRole,
  deactivateUser,
  activateUser,
  getUserByEmail
} from '../services/userService';
import { authenticateToken, requireAdmin, requireManagerOrAdmin } from '../middleware/auth';
import { IUser, IUserDocument } from '../models/mongodb/userModel';
import { createErrorResponse, createSuccessResponse, catchAsync, AppError } from '../middleware/errorHandler';

export function setUserRoutes(app: express.Application) {

  // Get all users (protected - admin/manager only)
  app.get('/api/users', authenticateToken, requireManagerOrAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const allUsers = await getAllUsers();
      const usersWithoutPassword = allUsers.map(user => {
        // Handle both mongoose documents and plain objects
        const userObj = typeof user.toObject === 'function' ? user.toObject() : { ...user };
        delete userObj.password;
        
        // Transform _id to id for frontend compatibility
        if (userObj._id && !userObj.id) {
          userObj.id = userObj._id;
        }
        
        return userObj;
      });
      res.json(usersWithoutPassword);
    } catch (error) {
      console.error('Error fetching users:', error);
      const errorResponse = createErrorResponse('Failed to fetch users', 500, 'FETCH_USERS_ERROR', res.locals?.requestId);
      res.status(500).json(errorResponse);
    }
  });

  // Get users by role (protected - admin/manager only)
  app.get('/api/users/role/:role', authenticateToken, requireManagerOrAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const { role } = req.params;
      if (!['admin', 'cashier', 'manager'].includes(role)) {
        const errorResponse = createErrorResponse('Invalid role', 400, 'INVALID_ROLE', res.locals?.requestId);
        return res.status(400).json(errorResponse);
      }
      
      const usersByRole = await getUsersByRole(role as IUser['role']);
      const usersWithoutPassword = usersByRole.map(user => {
        // Handle both mongoose documents and plain objects
        const userObj = typeof user.toObject === 'function' ? user.toObject() : { ...user };
        delete userObj.password;
        return userObj;
      });
      res.json(usersWithoutPassword);
    } catch (error) {
      console.error('Error fetching users by role:', error);
      const errorResponse = createErrorResponse('Failed to fetch users by role', 500, 'FETCH_USERS_BY_ROLE_ERROR', res.locals?.requestId);
      res.status(500).json(errorResponse);
    }
  });

  // Get user by ID (protected - admin/manager only)
  app.get('/api/users/:id', authenticateToken, requireManagerOrAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.params.id;
      const user = await getUserById(userId);
      
      if (user) {
        const userObj = typeof user.toObject === 'function' ? user.toObject() : { ...user };
        delete userObj.password;
        res.json(userObj);
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      const errorResponse = createErrorResponse('Failed to fetch user', 500, 'FETCH_USER_ERROR', res.locals?.requestId);
      res.status(500).json(errorResponse);
    }
  });

  // Add a new user (protected - admin only)
  app.post('/api/users', authenticateToken, requireAdmin, express.json(), async (req: express.Request, res: express.Response) => {
    try {
      const { name, email, role, password } = req.body;

      // Validation
      if (
        typeof name !== 'string' || name.trim() === '' ||
        typeof email !== 'string' || !email.includes('@') ||
        typeof role !== 'string' || !['admin', 'cashier', 'manager'].includes(role) ||
        typeof password !== 'string' || password.length < 6
      ) {
        const errorResponse = createErrorResponse('Invalid user data. Name must be non-empty, email must be valid, role must be "admin", "cashier", or "manager", password must be at least 6 characters.', 400, 'INVALID_USER_DATA', res.locals?.requestId);
        return res.status(400).json(errorResponse);
      }

      // Check if email already exists (this is now handled by the service)
      const existingUser = await getUserByEmail(email.trim());
      if (existingUser) {
        const errorResponse = createErrorResponse('Email already exists', 409, 'EMAIL_EXISTS', res.locals?.requestId);
        return res.status(409).json(errorResponse);
      }

      const newUser = await createUser({
        name: name.trim(),
        email: email.trim(),
        role: role as IUser['role'],
        password,
        isActive: true
      });

      // Handle both mongoose documents and plain objects
      const userResponse = typeof newUser.toObject === 'function' ? newUser.toObject() : { ...newUser };
      delete userResponse.password;
      
      // Transform _id to id for frontend compatibility
      if (userResponse._id && !userResponse.id) {
        userResponse.id = userResponse._id;
      }
      
      res.status(201).json(userResponse);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  // Update a user (protected - admin only)
  app.put('/api/users/:id', authenticateToken, requireAdmin, express.json(), async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.params.id;
      const user = await getUserById(userId);
      if (!user) {
        const errorResponse = createErrorResponse('User not found', 404, 'USER_NOT_FOUND', res.locals?.requestId);
        return res.status(404).json(errorResponse);
      }

      const { name, email, role, password, isActive } = req.body;
      const updates: Partial<IUser> = {};

      if (name !== undefined) {
        if (typeof name !== 'string' || name.trim() === '') {
          const errorResponse = createErrorResponse('Invalid user name', 400, 'INVALID_USER_NAME', res.locals?.requestId);
        return res.status(400).json(errorResponse);
        }
        updates.name = name.trim();
      }

    if (email !== undefined) {
      if (typeof email !== 'string' || !email.includes('@')) {
        const errorResponse = createErrorResponse('Invalid email format', 400, 'INVALID_EMAIL_FORMAT', res.locals?.requestId);
        return res.status(400).json(errorResponse);
      }
      
      // Check if email already exists for another user
      const existingUser = await getUserByEmail(email.trim());
      if (existingUser && existingUser._id && existingUser._id.toString() !== userId) {
        const errorResponse = createErrorResponse('Email already exists for another user', 409, 'EMAIL_EXISTS', res.locals?.requestId);
        return res.status(409).json(errorResponse);
      }
      
      updates.email = email.trim();
    }
    
    if (role !== undefined) {
      if (!['admin', 'cashier', 'manager'].includes(role)) {
        const errorResponse = createErrorResponse('Invalid role', 400, 'INVALID_ROLE', res.locals?.requestId);
        return res.status(400).json(errorResponse);
      }
      updates.role = role as IUser['role'];
    }
    
    if (password !== undefined) {
      if (typeof password !== 'string' || password.length < 6) {
        const errorResponse = createErrorResponse('Password must be at least 6 characters', 400, 'INVALID_PASSWORD', res.locals?.requestId);
        return res.status(400).json(errorResponse);
      }
      updates.password = password;
    }
    
    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') {
        const errorResponse = createErrorResponse('isActive must be a boolean', 400, 'INVALID_ACTIVE_STATUS', res.locals?.requestId);
        return res.status(400).json(errorResponse);
      }
      updates.isActive = isActive;
    }
    
    const updatedUser = await updateUser(userId, updates);
    if (!updatedUser) {
      const errorResponse = createErrorResponse('User not found', 404, 'USER_NOT_FOUND', res.locals?.requestId);
        return res.status(404).json(errorResponse);
    }
    
    const userResponse = typeof updatedUser.toObject === 'function' ? updatedUser.toObject() : { ...updatedUser };
    delete userResponse.password;
    res.json(userResponse);
  } catch (error) {
      console.error('Error updating user:', error);
      const errorResponse = createErrorResponse('Failed to update user', 500, 'UPDATE_USER_ERROR', res.locals?.requestId);
      res.status(500).json(errorResponse);
    }
  });

  // Delete a user (protected - admin only)
  app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.params.id;
      
      // Prevent deleting yourself
      if (req.user && req.user._id.toString() === userId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }
      
      const success = await deleteUser(userId);
      if (success) {
        res.json({ message: 'User deleted successfully' });
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  // Deactivate user (protected - admin only)
  app.patch('/api/users/:id/deactivate', authenticateToken, requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.params.id;
      
      // Prevent deactivating yourself
      if (req.user && req.user._id.toString() === userId) {
        return res.status(400).json({ error: 'Cannot deactivate your own account' });
      }
      
      const success = await deactivateUser(userId);
      if (success) {
        res.json({ message: 'User deactivated successfully' });
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (error) {
      console.error('Error deactivating user:', error);
      res.status(500).json({ error: 'Failed to deactivate user' });
    }
  });

  // Activate user (protected - admin only)
  app.patch('/api/users/:id/activate', authenticateToken, requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.params.id;
      const success = await activateUser(userId);
      if (success) {
        res.json({ message: 'User activated successfully' });
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (error) {
      console.error('Error activating user:', error);
      res.status(500).json({ error: 'Failed to activate user' });
    }
  });
}