import express from 'express';
import { Product, ProductImage } from '../types';
import cacheService from '../services/cacheService';
import { authenticateToken } from '../middleware/auth';
import * as productService from '../services/productService';
import { createErrorResponse, createSuccessResponse, catchAsync, AppError } from '../middleware/errorHandler';

export function setProductRoutes(app: express.Application) {
  // Get all products
  app.get('/api/products', authenticateToken, async (req, res) => {
    try {
      // Check cache first
      const cachedProducts = cacheService.get('products');
      if (cachedProducts) {
        return res.json(cachedProducts);
      }
      
      // Get products from database
      const products = await productService.getAllProducts();
      // Cache the products
      cacheService.set('products', products);
      res.json(products);
    } catch (error) {
      const errorResponse = createErrorResponse('Failed to fetch products', 500, 'FETCH_PRODUCTS_ERROR', res.locals?.requestId);
      res.status(500).json(errorResponse);
    }
  });

  // Get a product by ID
  app.get('/api/products/:id', async (req, res) => {
    try {
      const product = await productService.getProductById(req.params.id);
      if (!product) {
        const errorResponse = createErrorResponse('Product not found', 404, 'PRODUCT_NOT_FOUND', res.locals?.requestId);
        return res.status(404).json(errorResponse);
      }
      res.json(product);
    } catch (error) {
      const errorResponse = createErrorResponse('Failed to fetch product', 500, 'FETCH_PRODUCT_ERROR', res.locals?.requestId);
      res.status(500).json(errorResponse);
    }
  });

  // Add a new product with validation
  app.post('/api/products', authenticateToken, express.json(), async (req, res) => {
    try {
      const { name, price, stock, quantity, category, barcode, description } = req.body;
      
      // Handle both 'stock' and 'quantity' field names for backward compatibility
      const stockValue = stock !== undefined ? stock : quantity;

      // Validation
      if (
        typeof name !== 'string' || name.trim() === '' ||
        typeof price !== 'number' || price <= 0 ||
        typeof stockValue !== 'number' || stockValue < 0
      ) {
        const errorResponse = createErrorResponse('Invalid product data. Name must be a non-empty string, price > 0, stock/quantity >= 0.', 400, 'INVALID_PRODUCT_DATA', res.locals?.requestId);
        return res.status(400).json(errorResponse);
      }

      const productData = {
        name: name.trim(),
        price,
        stock: stockValue,
        ...(category && { category: category.trim() }),
        ...(barcode && { barcode: barcode.trim() }),
        ...(description && { description: description.trim() })
      };

      const newProduct = await productService.createProduct(productData);
      // Invalidate cache
      cacheService.del('products');
      res.status(201).json(newProduct);
    } catch (error) {
      const errorResponse = createErrorResponse('Failed to create product', 500, 'CREATE_PRODUCT_ERROR', res.locals?.requestId);
      res.status(500).json(errorResponse);
    }
  });

  // Update a product with validation
  app.put('/api/products/:id', authenticateToken, express.json(), async (req, res) => {
    try {
      const { name, price, stock } = req.body;
      const updates: any = {};

      if (name !== undefined) {
        if (typeof name !== 'string' || name.trim() === '') {
          const errorResponse = createErrorResponse('Invalid product name', 400, 'INVALID_PRODUCT_NAME', res.locals?.requestId);
          return res.status(400).json(errorResponse);
        }
        updates.name = name.trim();
      }

      if (price !== undefined) {
        if (typeof price !== 'number' || price <= 0) {
          const errorResponse = createErrorResponse('Invalid product price', 400, 'INVALID_PRODUCT_PRICE', res.locals?.requestId);
          return res.status(400).json(errorResponse);
        }
        updates.price = price;
      }

      if (stock !== undefined) {
        if (typeof stock !== 'number' || stock < 0) {
          const errorResponse = createErrorResponse('Invalid product stock', 400, 'INVALID_PRODUCT_STOCK', res.locals?.requestId);
          return res.status(400).json(errorResponse);
        }
        updates.stock = stock;
      }

      const updatedProduct = await productService.updateProduct(req.params.id, updates);
      if (!updatedProduct) {
        const errorResponse = createErrorResponse('Product not found', 404, 'PRODUCT_NOT_FOUND', res.locals?.requestId);
        return res.status(404).json(errorResponse);
      }

      // Invalidate cache
      cacheService.del('products');
      res.json(updatedProduct);
    } catch (error) {
      const errorResponse = createErrorResponse('Failed to update product', 500, 'UPDATE_PRODUCT_ERROR', res.locals?.requestId);
      res.status(500).json(errorResponse);
    }
  });

  // Delete a product
  app.delete('/api/products/:id', authenticateToken, async (req, res) => {
    try {
      const deleted = await productService.deleteProduct(req.params.id);
      if (!deleted) {
        const errorResponse = createErrorResponse('Product not found', 404, 'PRODUCT_NOT_FOUND', res.locals?.requestId);
        return res.status(404).json(errorResponse);
      }
      // Invalidate cache
      cacheService.del('products');
      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      const errorResponse = createErrorResponse('Failed to delete product', 500, 'DELETE_PRODUCT_ERROR', res.locals?.requestId);
      res.status(500).json(errorResponse);
    }
  });
}