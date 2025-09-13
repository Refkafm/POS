import { mockDatabase } from '../../config/mockDatabase';

export interface IProduct {
  _id?: string;
  name: string;
  price: number;
  stock: number;
  category?: string;
  description?: string;
  barcode?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Mock Product Model
class ProductModelClass {
  private collectionName = 'products';

  // Find a product by ID
  async findById(id: string): Promise<IProduct | null> {
    return mockDatabase.findById(this.collectionName, id);
  }

  // Find a product by a query
  async findOne(query: Partial<IProduct>): Promise<IProduct | null> {
    return mockDatabase.findOne(this.collectionName, query);
  }

  // Find all products matching a query
  async find(query: Partial<IProduct> = {}): Promise<IProduct[]> {
    return mockDatabase.find(this.collectionName, query);
  }

  // Update a product by ID
  async findByIdAndUpdate(id: string, update: Partial<IProduct>, options?: { new: boolean }): Promise<IProduct | null> {
    const now = new Date();
    const updatedProduct = {
      ...update,
      updatedAt: now
    };
    
    return mockDatabase.updateById(this.collectionName, id, updatedProduct);
  }

  // Delete a product by ID
  async findByIdAndDelete(id: string): Promise<IProduct | null> {
    const product = await this.findById(id);
    if (!product) return null;
    
    const deleted = mockDatabase.deleteById(this.collectionName, id);
    return deleted ? product : null;
  }

  // Create a new product
  async create(productData: IProduct): Promise<IProduct> {
    const now = new Date();
    const newProduct = {
      ...productData,
      createdAt: now,
      updatedAt: now
    };

    return mockDatabase.insertOne(this.collectionName, newProduct);
  }
}

export const ProductModel = new ProductModelClass();