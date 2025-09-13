import mongoose, { Document, Schema } from 'mongoose';

export interface ISaleItem {
  product: mongoose.Types.ObjectId;
  quantity: number;
  price: number; // Price at time of sale
  name: string; // Product name at time of sale
}

export interface ISale extends Document {
  items: ISaleItem[];
  total: number;
  cashier: mongoose.Types.ObjectId;
  paymentMethod: 'cash' | 'card' | 'other';
  createdAt: Date;
  updatedAt: Date;
}

const saleItemSchema = new Schema<ISaleItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  name: { type: String, required: true }
});

const saleSchema = new Schema<ISale>(
  {
    items: [saleItemSchema],
    total: { type: Number, required: true },
    cashier: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    paymentMethod: { 
      type: String, 
      enum: ['cash', 'card', 'other'], 
      default: 'cash' 
    }
  },
  { timestamps: true }
);

export const SaleModel = mongoose.model<ISale>('Sale', saleSchema);