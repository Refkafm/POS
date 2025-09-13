import { SaleModel, ISale } from '../models/mongodb/saleModel';
import { updateStock } from './productService';
import mongoose from 'mongoose';

export const getSaleById = async (id: string): Promise<ISale | null> => {
  return SaleModel.findById(id).populate('cashier', 'name');
};

export const getAllSales = async (): Promise<ISale[]> => {
  return SaleModel.find({}).populate('cashier', 'name').sort({ createdAt: -1 });
};

export const getSalesByDateRange = async (
  startDate: Date,
  endDate: Date
): Promise<ISale[]> => {
  return SaleModel.find({
    createdAt: { $gte: startDate, $lte: endDate }
  }).populate('cashier', 'name').sort({ createdAt: -1 });
};

export const getSalesByCashier = async (cashierId: string): Promise<ISale[]> => {
  return SaleModel.find({ cashier: cashierId }).sort({ createdAt: -1 });
};

export const createSale = async (saleData: {
  items: Array<{
    product: string;
    quantity: number;
    price: number;
    name: string;
  }>;
  total: number;
  cashier: string;
  paymentMethod: 'cash' | 'card' | 'other';
}): Promise<ISale> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Create the sale
    const sale = new SaleModel(saleData);
    await sale.save({ session });

    // Update product stock
    for (const item of saleData.items) {
      await updateStock(item.product, -item.quantity);
    }

    await session.commitTransaction();
    return sale;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const getSalesStats = async (): Promise<{
  totalSales: number;
  totalRevenue: number;
  averageSaleValue: number;
}> => {
  const result = await SaleModel.aggregate([
    {
      $group: {
        _id: null,
        totalSales: { $sum: 1 },
        totalRevenue: { $sum: '$total' },
      },
    },
  ]);

  if (result.length === 0) {
    return { totalSales: 0, totalRevenue: 0, averageSaleValue: 0 };
  }

  const { totalSales, totalRevenue } = result[0];
  const averageSaleValue = totalRevenue / totalSales;

  return { totalSales, totalRevenue, averageSaleValue };
};