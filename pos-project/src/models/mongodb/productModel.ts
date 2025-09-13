import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  price: number;
  stock: number;
  category?: string;
  description?: string;
  barcode?: string;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true, default: 0 },
    category: { type: String },
    description: { type: String },
    barcode: { type: String }
  },
  { timestamps: true }
);

export const ProductModel = mongoose.model<IProduct>('Product', productSchema);