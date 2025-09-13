import { config } from '../src/config/environment';

// Set test environment
if (!process.env.NODE_ENV) {
  (process.env as any).NODE_ENV = 'test';
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret';
}
if (!process.env.PORT) {
  process.env.PORT = '3002';
}

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Global test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});