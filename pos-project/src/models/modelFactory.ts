import { usingMockDatabase } from '../config/database';

// Import real models
import { UserModel as RealUserModel } from './mongodb/userModel';

// Import mock models
import { UserModel as MockUserModel } from './mock/userModel';
import { ProductModel as MockProductModel } from './mock/productModel';
import { SaleModel as MockSaleModel } from './mock/saleModel';

/**
 * Factory function to get the appropriate model based on database connection status
 * This allows the application to switch between real MongoDB models and mock models
 */
export function getUserModel() {
  return usingMockDatabase ? MockUserModel : RealUserModel;
}

// Add these functions as needed when implementing the real models
export function getProductModel() {
  // If we have a real ProductModel, use it when not using mock DB
  // For now, always return the mock model
  return MockProductModel;
}

export function getSaleModel() {
  // If we have a real SaleModel, use it when not using mock DB
  // For now, always return the mock model
  return MockSaleModel;
}