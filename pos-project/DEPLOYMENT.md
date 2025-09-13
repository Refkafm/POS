# Deployment Guide for POS System

## Overview

This guide provides step-by-step instructions for deploying the POS system in production environments.

## Prerequisites

- Node.js 18+ and npm
- MongoDB 5.0+ or MongoDB Atlas account
- SSL certificate for HTTPS
- Domain name configured
- Server with at least 2GB RAM and 20GB storage

## Production Environment Setup

### 1. Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install nginx -y

# Install certbot for SSL certificates
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Application Deployment

```bash
# Clone the repository
git clone <your-repository-url>
cd pos-project

# Install dependencies
npm ci --only=production

# Build the application
npm run build

# Create production environment file
cp .env.example .env
```

### 3. Environment Configuration

Edit the `.env` file with production values:

```bash
# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pos_production

# Server Configuration
PORT=3001
NODE_ENV=production

# JWT Configuration (Generate strong secrets)
JWT_SECRET=<generate-strong-secret-64-chars>
JWT_REFRESH_SECRET=<generate-strong-secret-64-chars>
SESSION_SECRET=<generate-strong-secret-64-chars>

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com
CORS_CREDENTIALS=true

# Logging Configuration
LOG_LEVEL=warn
LOG_FILE=./logs/app.log
```

### 4. Generate Strong Secrets

```bash
# Generate secure random strings for secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 5. PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'pos-api',
    script: './dist/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

### 6. Nginx Configuration

Create `/etc/nginx/sites-available/pos-api`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';";

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Proxy Configuration
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Static files
    location /uploads {
        alias /path/to/pos-project/public/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check
    location /health {
        access_log off;
        proxy_pass http://localhost:3001/health;
    }
}
```

### 7. SSL Certificate Setup

```bash
# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

### 8. Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 9. Start Services

```bash
# Enable and start Nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Enable Nginx site
sudo ln -s /etc/nginx/sites-available/pos-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Start application with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Docker Deployment

### 1. Backend Dockerfile

Create `Dockerfile` in pos-project:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy node_modules from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Create necessary directories
RUN mkdir -p logs public/uploads && chown -R nodejs:nodejs logs public/uploads

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start application
CMD ["npm", "start"]
```

### 2. Frontend Dockerfile

Create `Dockerfile` in pos-frontend:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine AS runtime

# Copy built app
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

### 3. Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:5.0
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
      MONGO_INITDB_DATABASE: pos_system
    volumes:
      - mongodb_data:/data/db
      - ./mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    networks:
      - pos-network
    ports:
      - "27017:27017"

  pos-api:
    build:
      context: ./pos-project
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/pos_system
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - SESSION_SECRET=${SESSION_SECRET}
    volumes:
      - ./pos-project/logs:/app/logs
      - ./pos-project/public/uploads:/app/public/uploads
    networks:
      - pos-network
    ports:
      - "3001:3001"
    depends_on:
      - mongodb

  pos-frontend:
    build:
      context: ./pos-frontend
      dockerfile: Dockerfile
    restart: unless-stopped
    networks:
      - pos-network
    ports:
      - "80:80"
    depends_on:
      - pos-api

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    networks:
      - pos-network
    ports:
      - "443:443"
    depends_on:
      - pos-frontend
      - pos-api

volumes:
  mongodb_data:

networks:
  pos-network:
    driver: bridge
```

### 4. Deploy with Docker

```bash
# Create environment file
cp .env.example .env.docker

# Edit environment variables
vim .env.docker

# Build and start services
docker-compose -f docker-compose.prod.yml --env-file .env.docker up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Monitoring and Maintenance

### 1. Log Monitoring

```bash
# View application logs
pm2 logs pos-api

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# View system logs
sudo journalctl -u nginx -f
```

### 2. Performance Monitoring

```bash
# Monitor PM2 processes
pm2 monit

# System resource monitoring
htop
df -h
free -h
```

### 3. Backup Strategy

```bash
# Database backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"
mkdir -p $BACKUP_DIR

mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/backup_$DATE"
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" -C "$BACKUP_DIR" "backup_$DATE"
rm -rf "$BACKUP_DIR/backup_$DATE"

# Keep only last 30 days of backups
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +30 -delete
```

### 4. Update Process

```bash
# Update application
git pull origin main
npm ci --only=production
npm run build
pm2 reload pos-api

# Update system packages
sudo apt update && sudo apt upgrade -y
```

## Troubleshooting

### Common Issues

1. **Application won't start**
   - Check environment variables
   - Verify database connection
   - Check logs: `pm2 logs pos-api`

2. **SSL certificate issues**
   - Renew certificate: `sudo certbot renew`
   - Check certificate status: `sudo certbot certificates`

3. **Database connection issues**
   - Verify MongoDB is running
   - Check connection string
   - Test connection: `mongo $MONGODB_URI`

4. **High memory usage**
   - Monitor with: `pm2 monit`
   - Restart application: `pm2 reload pos-api`
   - Check for memory leaks in logs

### Emergency Procedures

1. **Service restart**
   ```bash
   pm2 restart pos-api
   sudo systemctl restart nginx
   ```

2. **Rollback deployment**
   ```bash
   git checkout previous-stable-commit
   npm ci --only=production
   pm2 reload pos-api
   ```

3. **Database recovery**
   ```bash
   # Restore from backup
   mongorestore --uri="$MONGODB_URI" /path/to/backup
   ```

## Security Checklist

- [ ] All secrets are properly configured
- [ ] HTTPS is enforced
- [ ] Firewall is configured
- [ ] Security headers are set
- [ ] Rate limiting is enabled
- [ ] Logs are monitored
- [ ] Backups are automated
- [ ] Dependencies are updated
- [ ] SSL certificates are valid
- [ ] Database is secured

---

For additional support or questions, please refer to the [Security Guide](SECURITY.md) or contact the development team.