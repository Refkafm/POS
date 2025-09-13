import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface EnvironmentConfig {
  // Database
  mongodbUri: string;
  mongodbTestUri: string;
  
  // Server
  port: number;
  nodeEnv: string;
  
  // JWT
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshSecret: string;
  jwtRefreshExpiresIn: string;
  
  // Security
  bcryptRounds: number;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  
  // CORS
  corsOrigin: string;
  corsCredentials: boolean;
  
  // Session
  sessionSecret: string;
  sessionMaxAge: number;
  
  // File Upload
  maxFileSize: number;
  uploadPath: string;
  
  // Email
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  
  // Backup
  backupSchedule: string;
  backupRetentionDays: number;
  backupPath: string;
  
  // Logging
  logLevel: string;
  logFile: string;
  logMaxSize: string;
  logMaxFiles: number;
  
  // Cache
  redisUrl?: string;
  cacheTtl: number;
  
  // API
  apiVersion: string;
  apiPrefix: string;
  
  // Development
  debug?: string;
  verboseLogging: boolean;
}

function validateEnvironment(): EnvironmentConfig {
  const requiredVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'SESSION_SECRET'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate JWT secrets are not default values
  const defaultSecrets = [
    'your-super-secret-jwt-key-change-this-in-production',
    'your-super-secret-refresh-key-change-this-in-production',
    'your-super-secret-session-key-change-this-in-production'
  ];
  
  if (process.env.NODE_ENV === 'production') {
    if (defaultSecrets.includes(process.env.JWT_SECRET!) ||
        defaultSecrets.includes(process.env.JWT_REFRESH_SECRET!) ||
        defaultSecrets.includes(process.env.SESSION_SECRET!)) {
      throw new Error('Default secrets detected in production environment. Please change all secrets.');
    }
  }
  
  return {
    // Database
    mongodbUri: process.env.MONGODB_URI!,
    mongodbTestUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/pos_system_test',
    
    // Server
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    
    // JWT
    jwtSecret: process.env.JWT_SECRET!,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET!,
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    
    // Security
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    
    // CORS
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    corsCredentials: process.env.CORS_CREDENTIALS === 'true',
    
    // Session
    sessionSecret: process.env.SESSION_SECRET!,
    sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000', 10),
    
    // File Upload
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
    uploadPath: process.env.UPLOAD_PATH || './public/uploads',
    
    // Email
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    smtpFrom: process.env.SMTP_FROM,
    
    // Backup
    backupSchedule: process.env.BACKUP_SCHEDULE || '0 2 * * *',
    backupRetentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10),
    backupPath: process.env.BACKUP_PATH || './backups',
    
    // Logging
    logLevel: process.env.LOG_LEVEL || 'info',
    logFile: process.env.LOG_FILE || './logs/app.log',
    logMaxSize: process.env.LOG_MAX_SIZE || '10m',
    logMaxFiles: parseInt(process.env.LOG_MAX_FILES || '5', 10),
    
    // Cache
    redisUrl: process.env.REDIS_URL,
    cacheTtl: parseInt(process.env.CACHE_TTL || '3600', 10),
    
    // API
    apiVersion: process.env.API_VERSION || 'v1',
    apiPrefix: process.env.API_PREFIX || '/api',
    
    // Development
    debug: process.env.DEBUG,
    verboseLogging: process.env.VERBOSE_LOGGING === 'true'
  };
}

export const config = validateEnvironment();
export default config;