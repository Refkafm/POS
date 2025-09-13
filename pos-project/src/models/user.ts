export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'cashier' | 'manager';
  password: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export const users: User[] = [
  {
    id: 1,
    name: 'Admin User',
    email: 'admin@pos.com',
    role: 'admin',
    password: 'admin123', // In production, this should be hashed
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'John Cashier',
    email: 'john@pos.com',
    role: 'cashier',
    password: 'cashier123',
    isActive: true,
    createdAt: new Date().toISOString(),
  }
];

// User management functions
export const getUserById = (id: number): User | undefined => {
  return users.find(user => user.id === id);
};

export const getUserByEmail = (email: string): User | undefined => {
  return users.find(user => user.email === email);
};

export const createUser = (userData: Omit<User, 'id' | 'createdAt'>): User => {
  const newUser: User = {
    ...userData,
    id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  return newUser;
};

export const updateUser = (id: number, updates: Partial<Omit<User, 'id' | 'createdAt'>>): User | null => {
  const userIndex = users.findIndex(user => user.id === id);
  if (userIndex === -1) return null;
  
  users[userIndex] = { ...users[userIndex], ...updates };
  return users[userIndex];
};

export const deleteUser = (id: number): boolean => {
  const userIndex = users.findIndex(user => user.id === id);
  if (userIndex === -1) return false;
  
  users.splice(userIndex, 1);
  return true;
};

export const getAllUsers = (): User[] => {
  return [...users];
};

export const getUsersByRole = (role: User['role']): User[] => {
  return users.filter(user => user.role === role);
};

export const authenticateUser = (email: string, password: string): User | null => {
  const user = getUserByEmail(email);
  if (user && user.password === password && user.isActive) {
    // Update last login
    updateUser(user.id, { lastLogin: new Date().toISOString() });
    return user;
  }
  return null;
};

export const deactivateUser = (id: number): boolean => {
  return updateUser(id, { isActive: false }) !== null;
};

export const activateUser = (id: number): boolean => {
  return updateUser(id, { isActive: true }) !== null;
};