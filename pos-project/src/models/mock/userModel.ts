import bcrypt from 'bcrypt';
import { mockDatabase } from '../../config/mockDatabase';

// Define the base user interface without _id
export interface IUserBase {
  name: string;
  email: string;
  role: 'admin' | 'cashier' | 'manager';
  password: string;
  isActive: boolean;
  createdAt?: Date;
  lastLogin?: Date;
}

// Interface for user objects (plain objects, not documents)
export interface IUser extends IUserBase {
  _id?: string;
}

// Define a type for the user document with methods
export interface IUserDocument extends IUser {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Mock User Model
class UserModelClass {
  private collectionName = 'users';

  // Find a user by ID
  async findById(id: string): Promise<IUserDocument | null> {
    const user = mockDatabase.findById(this.collectionName, id);
    if (!user) return null;
    return this.addMethods(user);
  }

  // Find a user by a query
  async findOne(query: Partial<IUser>): Promise<IUserDocument | null> {
    const user = mockDatabase.findOne(this.collectionName, query);
    if (!user) return null;
    return this.addMethods(user);
  }

  // Find all users matching a query
  async find(query: Partial<IUser> = {}): Promise<IUserDocument[]> {
    const users = mockDatabase.find(this.collectionName, query);
    return users.map(user => this.addMethods(user));
  }

  // Update a user by ID
  async findByIdAndUpdate(id: string, update: Partial<IUser>, options?: { new: boolean }): Promise<IUserDocument | null> {
    // Handle password hashing if it's being updated
    if (update.password) {
      const salt = await bcrypt.genSalt(10);
      update.password = await bcrypt.hash(update.password, salt);
    }

    const updatedUser = mockDatabase.updateById(this.collectionName, id, update);
    if (!updatedUser) return null;
    return this.addMethods(updatedUser);
  }

  // Delete a user by ID
  async findByIdAndDelete(id: string): Promise<IUserDocument | null> {
    const user = await this.findById(id);
    if (!user) return null;
    
    const deleted = mockDatabase.deleteById(this.collectionName, id);
    return deleted ? user : null;
  }

  // Create a new user
  async create(userData: IUser): Promise<IUserDocument> {
    // Hash the password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    const now = new Date();
    const newUser = {
      ...userData,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
      isActive: userData.isActive !== undefined ? userData.isActive : true
    };

    const createdUser = mockDatabase.insertOne(this.collectionName, newUser);
    return this.addMethods(createdUser);
  }

  // Add methods to user objects
  private addMethods(user: any): IUserDocument {
    const userWithMethods = { ...user } as IUserDocument;
    
    // Add comparePassword method
    userWithMethods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
      return bcrypt.compare(candidatePassword, this.password);
    };

    return userWithMethods;
  }
}

export const UserModel = new UserModelClass();