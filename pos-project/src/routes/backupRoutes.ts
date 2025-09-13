import { Router, Request, Response } from 'express';
import { backupService, BackupOptions, ExportOptions } from '../services/backupService';
import logger from '../config/logger';
import path from 'path';
import fs from 'fs/promises';

const router = Router();

// Get backup status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = backupService.getBackupStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Failed to get backup status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get backup status'
    });
  }
});

// Get backup history
router.get('/history', async (req: Request, res: Response) => {
  try {
    const history = backupService.getBackupHistory();
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Failed to get backup history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get backup history'
    });
  }
});

// Create full backup
router.post('/create', async (req: Request, res: Response) => {
  try {
    const options: BackupOptions = {
      includeUploads: req.body.includeUploads !== false,
      includeDatabase: req.body.includeDatabase !== false,
      includeLogs: req.body.includeLogs || false,
      compression: req.body.compression !== false
    };

    const backup = await backupService.createFullBackup(options);
    
    res.json({
      success: true,
      message: 'Backup created successfully',
      data: backup
    });
  } catch (error) {
    logger.error('Failed to create backup:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create backup'
    });
  }
});

// Export data
router.post('/export', async (req: Request, res: Response) => {
  try {
    const { collection, format, dateRange, filters, fields } = req.body;

    if (!collection || !format) {
      return res.status(400).json({
        success: false,
        message: 'Collection and format are required'
      });
    }

    const options: ExportOptions = {
      collection,
      format,
      dateRange: dateRange ? {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end)
      } : undefined,
      filters,
      fields
    };

    const filePath = await backupService.exportData(options);
    
    res.json({
      success: true,
      message: 'Data exported successfully',
      data: {
        filePath,
        downloadUrl: `/api/backup/download/${path.basename(filePath)}`
      }
    });
  } catch (error) {
    logger.error('Failed to export data:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to export data'
    });
  }
});

// Download backup or export file
router.get('/download/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    
    // Security check: ensure filename doesn't contain path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename'
      });
    }

    // Check in backups directory first
    let filePath = path.join(process.cwd(), 'backups', filename);
    
    try {
      await fs.access(filePath);
    } catch {
      // Check in exports directory
      const exportDirs = await fs.readdir(path.join(process.cwd(), 'backups', 'exports'));
      let found = false;
      
      for (const dir of exportDirs) {
        const exportFilePath = path.join(process.cwd(), 'backups', 'exports', dir, filename);
        try {
          await fs.access(exportFilePath);
          filePath = exportFilePath;
          found = true;
          break;
        } catch {
          continue;
        }
      }
      
      if (!found) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }
    }

    // Set appropriate headers
    const stats = await fs.stat(filePath);
    const ext = path.extname(filename).toLowerCase();
    
    let contentType = 'application/octet-stream';
    if (ext === '.json') contentType = 'application/json';
    else if (ext === '.csv') contentType = 'text/csv';
    else if (ext === '.gz') contentType = 'application/gzip';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Stream the file
    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    logger.error('Failed to download file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file'
    });
  }
});

// Cleanup old backups
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    await backupService.cleanupOldBackups();
    
    res.json({
      success: true,
      message: 'Backup cleanup completed successfully'
    });
  } catch (error) {
    logger.error('Failed to cleanup backups:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup backups'
    });
  }
});

// Get available collections for export
router.get('/collections', async (req: Request, res: Response) => {
  try {
    const collections = [
      {
        name: 'products',
        displayName: 'Products',
        description: 'Product inventory data'
      },
      {
        name: 'sales',
        displayName: 'Sales',
        description: 'Sales transaction data'
      },
      {
        name: 'inventory',
        displayName: 'Inventory Report',
        description: 'Current inventory status'
      }
    ];
    
    res.json({
      success: true,
      data: collections
    });
  } catch (error) {
    logger.error('Failed to get collections:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get collections'
    });
  }
});

// Get export formats
router.get('/formats', async (req: Request, res: Response) => {
  try {
    const formats = [
      {
        value: 'json',
        label: 'JSON',
        description: 'JavaScript Object Notation'
      },
      {
        value: 'csv',
        label: 'CSV',
        description: 'Comma Separated Values'
      }
    ];
    
    res.json({
      success: true,
      data: formats
    });
  } catch (error) {
    logger.error('Failed to get formats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get formats'
    });
  }
});

export default router;