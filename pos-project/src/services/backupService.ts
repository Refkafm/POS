import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import cron from 'node-cron';
import archiver from 'archiver';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { config } from '../config/environment';
import logger from '../config/logger';
import { products } from '../models/product';
import { sales } from '../models/sale';
// Import customers data - need to access the internal array
// Since customers is not exported, we'll create a simple backup without it for now
import { users } from '../models/user';
import { suppliers } from '../models/supplier';
import { purchaseOrders } from '../models/purchaseOrder';

const execAsync = promisify(exec);

export interface BackupOptions {
  includeUploads?: boolean;
  includeDatabase?: boolean;
  includeLogs?: boolean;
  format?: 'json' | 'csv';
  compression?: boolean;
}

export interface BackupMetadata {
  id: string;
  timestamp: Date;
  type: 'full' | 'database' | 'files' | 'export';
  size: number;
  path: string;
  checksum: string;
  collections?: string[];
  status: 'pending' | 'completed' | 'failed';
  error?: string;
}

export interface ExportOptions {
  collection: string;
  format: 'json' | 'csv';
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, any>;
  fields?: string[];
}

class BackupService {
  private backupDir: string;
  private maxBackups: number;
  private isBackupRunning: boolean = false;
  private backupHistory: BackupMetadata[] = [];

  constructor() {
    this.backupDir = path.join(process.cwd(), 'backups');
    this.maxBackups = 30; // Default to 30 backups
    this.initializeBackupDirectory();
    this.loadBackupHistory();
    this.scheduleBackups();
  }

  private async initializeBackupDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      await fs.mkdir(path.join(this.backupDir, 'database'), { recursive: true });
      await fs.mkdir(path.join(this.backupDir, 'files'), { recursive: true });
      await fs.mkdir(path.join(this.backupDir, 'exports'), { recursive: true });
      logger.info('Backup directories initialized');
    } catch (error) {
      logger.error('Failed to initialize backup directories:', error);
      throw error;
    }
  }

  private async loadBackupHistory(): Promise<void> {
    try {
      const historyPath = path.join(this.backupDir, 'backup-history.json');
      const historyData = await fs.readFile(historyPath, 'utf-8');
      this.backupHistory = JSON.parse(historyData);
    } catch (error) {
      // History file doesn't exist yet, start with empty array
      this.backupHistory = [];
    }
  }

  private async saveBackupHistory(): Promise<void> {
    try {
      const historyPath = path.join(this.backupDir, 'backup-history.json');
      await fs.writeFile(historyPath, JSON.stringify(this.backupHistory, null, 2));
    } catch (error) {
      logger.error('Failed to save backup history:', error);
    }
  }

  private scheduleBackups(): void {
    // Daily backup at 2 AM
    cron.schedule('0 2 * * *', async () => {
      logger.info('Starting scheduled daily backup');
      await this.createFullBackup();
    });

    // Weekly cleanup on Sunday at 3 AM
    cron.schedule('0 3 * * 0', async () => {
      logger.info('Starting scheduled backup cleanup');
      await this.cleanupOldBackups();
    });

    logger.info('Backup schedules initialized');
  }

  async createFullBackup(options: BackupOptions = {}): Promise<BackupMetadata> {
    if (this.isBackupRunning) {
      throw new Error('Backup is already in progress');
    }

    this.isBackupRunning = true;
    const backupId = `backup_${Date.now()}`;
    const timestamp = new Date();

    const metadata: BackupMetadata = {
      id: backupId,
      timestamp,
      type: 'full',
      size: 0,
      path: '',
      checksum: '',
      status: 'pending'
    };

    try {
      logger.info(`Starting full backup: ${backupId}`);

      // Create backup directory
      const backupPath = path.join(this.backupDir, backupId);
      await fs.mkdir(backupPath, { recursive: true });

      // Backup database (export as JSON)
      if (options.includeDatabase !== false) {
        await this.backupDatabase(backupPath);
      }

      // Backup files
      if (options.includeUploads !== false) {
        await this.backupFiles(backupPath);
      }

      // Backup logs
      if (options.includeLogs) {
        await this.backupLogs(backupPath);
      }

      // Create archive if compression is enabled
      let finalPath = backupPath;
      if (options.compression !== false) {
        finalPath = await this.createArchive(backupPath, `${backupId}.tar.gz`);
        // Remove uncompressed directory
        await fs.rm(backupPath, { recursive: true });
      }

      // Calculate size and checksum
      const stats = await fs.stat(finalPath);
      const checksum = await this.calculateChecksum(finalPath);

      metadata.path = finalPath;
      metadata.size = stats.size;
      metadata.checksum = checksum;
      metadata.status = 'completed';

      this.backupHistory.push(metadata);
      await this.saveBackupHistory();

      logger.info(`Full backup completed: ${backupId}`, {
        size: metadata.size,
        path: finalPath
      });

      return metadata;
    } catch (error) {
      metadata.status = 'failed';
      metadata.error = error instanceof Error ? error.message : 'Unknown error';
      this.backupHistory.push(metadata);
      await this.saveBackupHistory();
      
      logger.error(`Full backup failed: ${backupId}`, error);
      throw error;
    } finally {
      this.isBackupRunning = false;
    }
  }

  private async backupDatabase(backupPath: string): Promise<void> {
    try {
      const dbBackupPath = path.join(backupPath, 'database');
      await fs.mkdir(dbBackupPath, { recursive: true });

      // Export collections as JSON
      await this.exportCollectionsAsJSON(dbBackupPath);
      logger.info('Database export as JSON completed');
    } catch (error) {
      logger.error('Database backup failed:', error);
      throw error;
    }
  }

  private async exportCollectionsAsJSON(backupPath: string): Promise<void> {
    const collections = [
      { name: 'products', data: products },
      { name: 'sales', data: sales },
      // { name: 'customers', data: customers }, // Commented out due to export issue
      { name: 'users', data: users },
      { name: 'suppliers', data: suppliers },
      { name: 'purchaseorders', data: purchaseOrders }
    ];

    for (const collection of collections) {
      try {
        const filePath = path.join(backupPath, `${collection.name}.json`);
        await fs.writeFile(filePath, JSON.stringify(collection.data, null, 2));
        logger.info(`Exported ${collection.name}: ${collection.data.length} documents`);
      } catch (error) {
        logger.error(`Failed to export ${collection.name}:`, error);
      }
    }
  }

  private async backupFiles(backupPath: string): Promise<void> {
    try {
      const filesBackupPath = path.join(backupPath, 'files');
      await fs.mkdir(filesBackupPath, { recursive: true });

      const uploadsPath = path.join(process.cwd(), 'public', 'uploads');
      
      try {
        await fs.access(uploadsPath);
        await this.copyDirectory(uploadsPath, path.join(filesBackupPath, 'uploads'));
        logger.info('Files backup completed');
      } catch (error) {
        logger.warn('Uploads directory not found, skipping files backup');
      }
    } catch (error) {
      logger.error('Files backup failed:', error);
      throw error;
    }
  }

  private async backupLogs(backupPath: string): Promise<void> {
    try {
      const logsBackupPath = path.join(backupPath, 'logs');
      await fs.mkdir(logsBackupPath, { recursive: true });

      const logsPath = path.join(process.cwd(), 'logs');
      
      try {
        await fs.access(logsPath);
        await this.copyDirectory(logsPath, logsBackupPath);
        logger.info('Logs backup completed');
      } catch (error) {
        logger.warn('Logs directory not found, skipping logs backup');
      }
    } catch (error) {
      logger.error('Logs backup failed:', error);
      throw error;
    }
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  private async createArchive(sourcePath: string, archiveName: string): Promise<string> {
    const archivePath = path.join(this.backupDir, archiveName);
    const output = createWriteStream(archivePath);
    const archive = archiver('tar', { gzip: true });

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        logger.info(`Archive created: ${archivePath} (${archive.pointer()} bytes)`);
        resolve(archivePath);
      });

      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(sourcePath, false);
      archive.finalize();
    });
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    const { createHash } = await import('crypto');
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    
    await pipeline(stream, hash);
    return hash.digest('hex');
  }

  async exportData(options: ExportOptions): Promise<string> {
    try {
      logger.info(`Starting data export: ${options.collection}`);
      
      const exportId = `export_${options.collection}_${Date.now()}`;
      const exportPath = path.join(this.backupDir, 'exports', exportId);
      await fs.mkdir(exportPath, { recursive: true });

      let data: any[];
      let fileName: string;

      // Get data based on collection
      switch (options.collection) {
        case 'products':
          data = this.getProductsData(options);
          fileName = 'products';
          break;
        case 'sales':
          data = this.getSalesData(options);
          fileName = 'sales';
          break;
        // case 'customers':
        //   data = this.getCustomersData(options);
        //   fileName = 'customers';
        //   break;
        case 'inventory':
          data = this.getInventoryData(options);
          fileName = 'inventory';
          break;
        default:
          throw new Error(`Unsupported collection: ${options.collection}`);
      }

      // Export in requested format
      let filePath: string;
      switch (options.format) {
        case 'json':
          filePath = path.join(exportPath, `${fileName}.json`);
          await fs.writeFile(filePath, JSON.stringify(data, null, 2));
          break;
        case 'csv':
          filePath = path.join(exportPath, `${fileName}.csv`);
          await this.exportToCSV(data, filePath);
          break;
        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }

      logger.info(`Data export completed: ${filePath}`);
      return filePath;
    } catch (error) {
      logger.error('Data export failed:', error);
      throw error;
    }
  }

  private getProductsData(options: ExportOptions): any[] {
    let data = [...products];
    
    if (options.filters) {
      data = data.filter(item => {
        return Object.entries(options.filters!).every(([key, value]) => {
          return (item as any)[key] === value;
        });
      });
    }
    
    if (options.fields) {
      data = data.map(item => {
        const filtered: any = {};
        options.fields!.forEach(field => {
          filtered[field] = (item as any)[field];
        });
        return filtered;
      });
    }
    
    return data;
  }

  private getSalesData(options: ExportOptions): any[] {
    let data = [...sales];
    
    if (options.dateRange) {
      data = data.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate >= options.dateRange!.start && saleDate <= options.dateRange!.end;
      });
    }
    
    if (options.filters) {
      data = data.filter(item => {
        return Object.entries(options.filters!).every(([key, value]) => {
          return (item as any)[key] === value;
        });
      });
    }
    
    return data;
  }

  // private getCustomersData(options: ExportOptions): any[] {
  //   let data = [...customers];
  //   
  //   if (options.filters) {
  //     data = data.filter(item => {
  //       return Object.entries(options.filters!).every(([key, value]) => {
  //         return (item as any)[key] === value;
  //       });
  //     });
  //   }
  //   
  //   if (options.fields) {
  //     data = data.map(item => {
  //       const filtered: any = {};
  //       options.fields!.forEach(field => {
  //         filtered[field] = (item as any)[field];
  //       });
  //       return filtered;
  //     });
  //   }
  //   
  //   return data;
  // }

  private getInventoryData(options: ExportOptions): any[] {
    return products.map(product => ({
      id: product.id,
      name: product.name,
      category: product.category,
      currentStock: product.quantity,
      barcode: product.barcode,
      cost: product.cost,
      price: product.price,
      supplierId: product.supplierId,
      minStockLevel: product.minStockLevel
    }));
  }

  private async exportToCSV(data: any[], filePath: string): Promise<void> {
    if (data.length === 0) {
      await fs.writeFile(filePath, '');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return String(value);
        }).join(',')
      )
    ].join('\n');

    await fs.writeFile(filePath, csvContent);
  }

  async cleanupOldBackups(): Promise<void> {
    try {
      logger.info('Starting backup cleanup');
      
      // Sort backups by timestamp (oldest first)
      const sortedBackups = this.backupHistory
        .filter(b => b.status === 'completed')
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      if (sortedBackups.length <= this.maxBackups) {
        logger.info('No backups to cleanup');
        return;
      }

      const backupsToDelete = sortedBackups.slice(0, sortedBackups.length - this.maxBackups);
      
      for (const backup of backupsToDelete) {
        try {
          await fs.rm(backup.path, { recursive: true, force: true });
          this.backupHistory = this.backupHistory.filter(b => b.id !== backup.id);
          logger.info(`Deleted old backup: ${backup.id}`);
        } catch (error) {
          logger.error(`Failed to delete backup ${backup.id}:`, error);
        }
      }

      await this.saveBackupHistory();
      logger.info(`Cleanup completed: ${backupsToDelete.length} backups removed`);
    } catch (error) {
      logger.error('Backup cleanup failed:', error);
    }
  }

  getBackupHistory(): BackupMetadata[] {
    return this.backupHistory.slice().sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getBackupStatus(): { isRunning: boolean; lastBackup?: BackupMetadata } {
    const lastBackup = this.backupHistory
      .filter(b => b.status === 'completed')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    return {
      isRunning: this.isBackupRunning,
      lastBackup
    };
  }
}

export const backupService = new BackupService();