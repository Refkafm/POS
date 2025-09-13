import { mockDatabase } from '../../config/mockDatabase';

export interface ISaleItem {
  product: string; // Product ID
  quantity: number;
  price: number; // Price at time of sale
  name: string; // Product name at time of sale
}

export interface ISale {
  _id?: string;
  items: ISaleItem[];
  total: number;
  cashier: string; // User ID
  paymentMethod: 'cash' | 'card' | 'other';
  createdAt?: Date;
  updatedAt?: Date;
}

// Mock Sale Model
class SaleModelClass {
  private collectionName = 'sales';

  // Find a sale by ID
  async findById(id: string): Promise<ISale | null> {
    return mockDatabase.findById(this.collectionName, id);
  }

  // Find a sale by a query
  async findOne(query: Partial<ISale>): Promise<ISale | null> {
    return mockDatabase.findOne(this.collectionName, query);
  }

  // Find all sales matching a query
  async find(query: Partial<ISale> = {}): Promise<ISale[]> {
    return mockDatabase.find(this.collectionName, query);
  }

  // Update a sale by ID
  async findByIdAndUpdate(id: string, update: Partial<ISale>, options?: { new: boolean }): Promise<ISale | null> {
    const now = new Date();
    const updatedSale = {
      ...update,
      updatedAt: now
    };
    
    return mockDatabase.updateById(this.collectionName, id, updatedSale);
  }

  // Delete a sale by ID
  async findByIdAndDelete(id: string): Promise<ISale | null> {
    const sale = await this.findById(id);
    if (!sale) return null;
    
    const deleted = mockDatabase.deleteById(this.collectionName, id);
    return deleted ? sale : null;
  }

  // Create a new sale
  async create(saleData: ISale): Promise<ISale> {
    const now = new Date();
    const newSale = {
      ...saleData,
      createdAt: now,
      updatedAt: now
    };

    return mockDatabase.insertOne(this.collectionName, newSale);
  }

  // Populate method to simulate MongoDB's populate
  async populate(field: string, select: string): Promise<this> {
    // This is a simplified mock of the populate functionality
    // In a real implementation, we would fetch the related documents
    return this;
  }

  // Sort method to simulate MongoDB's sort
  async sort(criteria: Record<string, number>): Promise<ISale[]> {
    // This is a simplified mock of the sort functionality
    // In a real implementation, we would sort the results
    return mockDatabase.find(this.collectionName);
  }
}

export const SaleModel = new SaleModelClass();