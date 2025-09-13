import { EventEmitter } from 'events';

// Mock database service for development when MongoDB is not available
class MockDatabase {
  private static instance: MockDatabase;
  private data: Record<string, any[]>;
  private eventEmitter: EventEmitter;
  private isConnected: boolean = false;

  private constructor() {
    this.data = {
      users: [],
      products: [],
      sales: []
    };
    this.eventEmitter = new EventEmitter();
  }

  public static getInstance(): MockDatabase {
    if (!MockDatabase.instance) {
      MockDatabase.instance = new MockDatabase();
    }
    return MockDatabase.instance;
  }

  public connect(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.isConnected = true;
        console.log('Connected to mock database');
        this.eventEmitter.emit('connected');
        resolve();
      }, 500); // Simulate connection delay
    });
  }

  public disconnect(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.isConnected = false;
        console.log('Disconnected from mock database');
        this.eventEmitter.emit('disconnected');
        resolve();
      }, 500); // Simulate disconnection delay
    });
  }

  public isConnectedToDatabase(): boolean {
    return this.isConnected;
  }

  public getCollection(collectionName: string): any[] {
    if (!this.data[collectionName]) {
      this.data[collectionName] = [];
    }
    return this.data[collectionName];
  }

  public insertOne(collectionName: string, document: any): any {
    const collection = this.getCollection(collectionName);
    const newDoc = { ...document, _id: this.generateId() };
    collection.push(newDoc);
    return newDoc;
  }

  public find(collectionName: string, query: any = {}): any[] {
    const collection = this.getCollection(collectionName);
    return collection.filter(item => this.matchesQuery(item, query));
  }

  public findOne(collectionName: string, query: any = {}): any | null {
    const results = this.find(collectionName, query);
    return results.length > 0 ? results[0] : null;
  }

  public findById(collectionName: string, id: string): any | null {
    const collection = this.getCollection(collectionName);
    return collection.find(item => item._id === id) || null;
  }

  public updateOne(collectionName: string, query: any, update: any): any | null {
    const collection = this.getCollection(collectionName);
    const index = collection.findIndex(item => this.matchesQuery(item, query));
    
    if (index !== -1) {
      const updatedDoc = { ...collection[index], ...update.$set };
      collection[index] = updatedDoc;
      return updatedDoc;
    }
    
    return null;
  }

  public updateById(collectionName: string, id: string, update: any): any | null {
    const collection = this.getCollection(collectionName);
    const index = collection.findIndex(item => item._id === id);
    
    if (index !== -1) {
      const updatedDoc = { ...collection[index], ...update };
      collection[index] = updatedDoc;
      return updatedDoc;
    }
    
    return null;
  }

  public deleteOne(collectionName: string, query: any): boolean {
    const collection = this.getCollection(collectionName);
    const index = collection.findIndex(item => this.matchesQuery(item, query));
    
    if (index !== -1) {
      collection.splice(index, 1);
      return true;
    }
    
    return false;
  }

  public deleteById(collectionName: string, id: string): boolean {
    const collection = this.getCollection(collectionName);
    const index = collection.findIndex(item => item._id === id);
    
    if (index !== -1) {
      collection.splice(index, 1);
      return true;
    }
    
    return false;
  }

  public on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private matchesQuery(item: any, query: any): boolean {
    for (const key in query) {
      if (query[key] !== item[key]) {
        return false;
      }
    }
    return true;
  }
}

export const mockDatabase = MockDatabase.getInstance();

export const connectToMockDatabase = async (): Promise<any> => {
  try {
    await mockDatabase.connect();
    console.log('Connected to mock database');
    
    // Import and call seedMockData dynamically to avoid circular dependencies
    const { seedMockData } = await import('./seedMockData');
    await seedMockData();
  } catch (error) {
    console.error('Mock database connection error:', error);
  }
  return mockDatabase;
};

// Flag to track if we're using mock database
export let usingMockDatabase = false;