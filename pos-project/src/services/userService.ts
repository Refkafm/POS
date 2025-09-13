import { IUser, IUserDocument } from '../models/mongodb/userModel';
import { getUserModel } from '../models/modelFactory';

export const getUserById = async (id: string): Promise<IUserDocument | null> => {
  const UserModel = getUserModel();
  return UserModel.findById(id);
};

export const getUserByEmail = async (email: string): Promise<IUserDocument | null> => {
  const UserModel = getUserModel();
  return UserModel.findOne({ email });
};

export const getAllUsers = async (): Promise<IUserDocument[]> => {
  const UserModel = getUserModel();
  return UserModel.find({});
};

export const getUsersByRole = async (role: string): Promise<IUserDocument[]> => {
  const UserModel = getUserModel();
  return UserModel.find({ role });
};

export const createUser = async (userData: {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'cashier' | 'manager';
  isActive?: boolean;
}): Promise<IUserDocument> => {
  const UserModel = getUserModel();
  return UserModel.create(userData);
};

export const updateUser = async (
  id: string,
  updates: Partial<IUser>
): Promise<IUserDocument | null> => {
  const UserModel = getUserModel();
  // Use any as intermediate type to avoid TypeScript circular reference issues
  return UserModel.findByIdAndUpdate(id, updates, { new: true }) as any as IUserDocument | null;
};

export const deleteUser = async (id: string): Promise<boolean> => {
  const UserModel = getUserModel();
  const result = await UserModel.findByIdAndDelete(id);
  return result !== null;
};

export const authenticateUser = async (
  email: string,
  password: string
): Promise<IUserDocument | null> => {
  const user = await getUserByEmail(email);
  
  if (!user || !user.isActive) {
    return null;
  }
  
  const isMatch = await user.comparePassword(password);
  
  if (!isMatch) {
    return null;
  }
  
  // Update last login
  const UserModel = getUserModel();
  user.lastLogin = new Date();
  
  // Handle both mongoose documents and mock objects
  if (typeof user.save === 'function') {
    await user.save();
  } else {
    // For mock database, use updateById
    await UserModel.findByIdAndUpdate(user._id as string, { lastLogin: new Date() });
  }
  
  return user;
};

export const deactivateUser = async (id: string): Promise<boolean> => {
  const user = await updateUser(id, { isActive: false });
  return user !== null;
};

export const activateUser = async (id: string): Promise<boolean> => {
  const user = await updateUser(id, { isActive: true });
  return user !== null;
};