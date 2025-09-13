import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getUserById } from '../services/userService';

const JWT_SECRET = 'your-secret-key'; // In production, use environment variables

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string, email: string, role: string };
    const user = await getUserById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(403).json({ error: 'Invalid or inactive user' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const requireAdmin = requireRole(['admin']);
export const requireManagerOrAdmin = requireRole(['admin', 'manager']);
export const requireCashierOrAbove = requireRole(['admin', 'manager', 'cashier']);