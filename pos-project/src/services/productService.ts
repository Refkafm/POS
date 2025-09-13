import { getProductModel } from '../models/modelFactory';
import { IProduct } from '../models/mock/productModel';

export const getProductById = async (id: string): Promise<IProduct | null> => {
  const ProductModel = getProductModel();
  return ProductModel.findById(id);
};

export const getAllProducts = async (): Promise<IProduct[]> => {
  const ProductModel = getProductModel();
  return ProductModel.find({});
};

export const getProductsByCategory = async (category: string): Promise<IProduct[]> => {
  const ProductModel = getProductModel();
  return ProductModel.find({ category });
};

export const searchProducts = async (query: string): Promise<IProduct[]> => {
  const ProductModel = getProductModel();
  const allProducts = await ProductModel.find({});
  return allProducts.filter(product => 
    product.name?.toLowerCase().includes(query.toLowerCase()) ||
    product.description?.toLowerCase().includes(query.toLowerCase()) ||
    product.barcode === query
  );
};

export const getLowStockProducts = async (threshold: number = 10): Promise<IProduct[]> => {
  const ProductModel = getProductModel();
  const allProducts = await ProductModel.find({});
  return allProducts.filter(product => product.stock <= threshold);
};

export const createProduct = async (productData: {
  name: string;
  price: number;
  stock: number;
  category?: string;
  description?: string;
  barcode?: string;
}): Promise<IProduct> => {
  const ProductModel = getProductModel();
  return await ProductModel.create(productData);
};

export const updateProduct = async (
  id: string,
  updates: Partial<IProduct>
): Promise<IProduct | null> => {
  const ProductModel = getProductModel();
  return await ProductModel.findByIdAndUpdate(id, updates, { new: true });
};

export const deleteProduct = async (id: string): Promise<IProduct | null> => {
  const ProductModel = getProductModel();
  return await ProductModel.findByIdAndDelete(id);
};

export const updateStock = async (id: string, quantity: number): Promise<IProduct | null> => {
  const ProductModel = getProductModel();
  const product = await ProductModel.findById(id);
  if (!product) return null;
  
  return ProductModel.findByIdAndUpdate(
    id,
    { stock: product.stock + quantity },
    { new: true }
  );
};