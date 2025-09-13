import { User } from '../src/types';

// Mock authentication service functions
class MockAuthService {
  static async login(credentials: { username: string; password: string }) {
    const testUsername = process.env.TEST_ADMIN_USERNAME || 'admin';
    const testPassword = process.env.TEST_ADMIN_PASSWORD || 'admin123';
    if (credentials.username === testUsername && credentials.password === testPassword) {
      const user: User = {
        id: 1,
        name: 'admin',
        email: 'admin@test.com',
        role: 'admin'
      };
      return { user, token: 'mock-jwt-token' };
    }
    throw new Error('Invalid credentials');
  }

  static async register(userData: { name: string; email: string; password: string; role: string }) {
    if (!userData.name || !userData.email || !userData.password) {
      throw new Error('Missing required fields');
    }
    const user: User = {
      id: 2,
      name: userData.name,
      email: userData.email,
      role: userData.role
    };
    return user;
  }
}

describe('Authentication Service', () => {
  describe('login', () => {
    it('should login with valid credentials', async () => {
      const result = await MockAuthService.login({
        username: 'admin',
        password: 'password123'
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.name).toBe('admin');
      expect(result.token).toBe('mock-jwt-token');
    });

    it('should throw error for invalid credentials', async () => {
      await expect(MockAuthService.login({
        username: 'admin',
        password: 'wrongpassword'
      })).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const userData = {
        name: 'newuser',
        email: 'newuser@test.com',
        password: 'password123',
        role: 'cashier'
      };

      const result = await MockAuthService.register(userData);

      expect(result.name).toBe('newuser');
      expect(result.email).toBe('newuser@test.com');
      expect(result.role).toBe('cashier');
    });

    it('should throw error for missing required fields', async () => {
      await expect(MockAuthService.register({
        name: '',
        email: 'test@test.com',
        password: 'password123',
        role: 'cashier'
      })).rejects.toThrow('Missing required fields');
    });
  });
});

// Basic validation utility tests
describe('Validation Utils', () => {
  describe('Password validation', () => {
    it('should validate password requirements', () => {
      const validatePassword = (password: string): boolean => {
        const minLength = password.length >= 8;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        return minLength && hasUpper && hasLower && hasNumber && hasSpecial;
      };

      expect(validatePassword('Password123!')).toBe(true);
      expect(validatePassword('MySecure@Pass1')).toBe(true);
      expect(validatePassword('short')).toBe(false);
      expect(validatePassword('nouppercase123!')).toBe(false);
    });
  });

  describe('Email validation', () => {
    it('should validate email format', () => {
      const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };

      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('notanemail')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
    });
  });
});