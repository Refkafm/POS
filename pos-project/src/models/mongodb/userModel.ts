import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

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
  _id?: mongoose.Types.ObjectId;
}

// Define a type for the user document with methods
export interface IUserDocument extends mongoose.Document, IUserBase {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Create the schema
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { 
      type: String, 
      enum: ['admin', 'cashier', 'manager'], 
      default: 'cashier' 
    },
    password: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date }
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Use any to avoid TypeScript complexity issues
export const UserModel = mongoose.model('User', userSchema) as any;