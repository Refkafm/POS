export interface SaleItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface PaymentMethod {
  type: 'cash' | 'card' | 'digital';
  amount: number;
}

export interface Sale {
  id: number;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethods: PaymentMethod[];
  change: number;
  createdAt: string;
  userId: number;
  userName: string;
}

export const sales: Sale[] = [];