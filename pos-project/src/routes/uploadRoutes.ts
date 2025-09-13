import express, { Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const uploadPath = path.join(__dirname, '../../public/uploads/products');
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `product-${uniqueSuffix}${ext}`);
  }
});

// File filter for images only
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

export function setUploadRoutes(app: express.Application) {
  // Single image upload
  app.post('/api/upload/image', upload.single('image'), (req: any, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const imageUrl = `${baseUrl}/uploads/products/${req.file.filename}`;

      res.json({
        url: imageUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    } catch (error) {
      console.error('Image upload error:', error);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  });

  // Multiple images upload
  app.post('/api/upload/images', upload.array('images', 5), (req: any, res: Response) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const uploadedFiles = req.files.map((file: Express.Multer.File) => ({
        url: `${baseUrl}/uploads/products/${file.filename}`,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      }));

      res.json({ files: uploadedFiles });
    } catch (error) {
      console.error('Multiple images upload error:', error);
      res.status(500).json({ error: 'Failed to upload images' });
    }
  });

  // Delete image
  app.delete('/api/upload/image/:filename', (req: Request, res: Response) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(__dirname, '../../public/uploads/products', filename);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json({ message: 'Image deleted successfully' });
      } else {
        res.status(404).json({ error: 'Image not found' });
      }
    } catch (error) {
      console.error('Image deletion error:', error);
      res.status(500).json({ error: 'Failed to delete image' });
    }
  });
}