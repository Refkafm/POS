# Docker Deployment Guide

This guide explains how to deploy the POS System using Docker containers for development, staging, and production environments.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git
- 4GB+ RAM
- 10GB+ disk space

## Quick Start (Development)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd POS
   ```

2. **Set up environment variables**
   ```bash
   cp .env.docker .env
   # Edit .env with your configuration
   ```

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost
   - Backend API: http://localhost:3001
   - MongoDB: localhost:27017

## Environment Configuration

### Required Environment Variables

Copy `.env.docker` to `.env` and update these critical values:

```bash
# Database (CRITICAL: Change in production)
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=secure_mongodb_root_password_change_me

# Application Secrets (CRITICAL: Change in production)
JWT_SECRET=your-super-secure-jwt-secret-key-here-change-in-production-docker
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-key-here-change-in-production-docker
SESSION_SECRET=your-super-secure-session-secret-key-here-change-in-production-docker
```

### Generate Secure Secrets

```bash
# Generate JWT secrets
openssl rand -base64 32

# Generate session secret
openssl rand -base64 32

# Generate MongoDB password
openssl rand -base64 16
```

## Deployment Modes

### Development Mode

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Mode

```bash
# Start with production profile (includes SSL)
docker-compose --profile production up -d

# Or start without SSL proxy
docker-compose up -d mongodb redis backend frontend
```

## Service Architecture

### Services Overview

| Service | Port | Description |
|---------|------|-------------|
| frontend | 80 | React app with Nginx |
| backend | 3001 | Node.js API server |
| mongodb | 27017 | MongoDB database |
| redis | 6379 | Redis cache |
| nginx | 443 | SSL reverse proxy (production) |

### Data Persistence

- **mongodb_data**: Database files
- **redis_data**: Cache data
- **backend_uploads**: File uploads
- **backend_logs**: Application logs
- **backend_backups**: Database backups

## Health Monitoring

### Check Service Health

```bash
# Check all services
docker-compose ps

# Check specific service health
docker-compose exec backend node healthcheck.js

# View service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongodb
```

### Health Check Endpoints

- Backend: `GET /api/health`
- Frontend: `GET /health`
- MongoDB: Built-in ping command
- Redis: Built-in ping command

## Database Management

### Initial Setup

The MongoDB container automatically:
- Creates admin user
- Sets up application database
- Creates indexes for optimal performance
- Configures user permissions

### Manual Database Operations

```bash
# Connect to MongoDB
docker-compose exec mongodb mongosh -u admin -p

# Backup database
docker-compose exec mongodb mongodump --uri="mongodb://admin:password@localhost:27017/pos_system?authSource=admin" --out=/data/backup

# Restore database
docker-compose exec mongodb mongorestore --uri="mongodb://admin:password@localhost:27017/pos_system?authSource=admin" /data/backup/pos_system
```

## SSL/HTTPS Configuration

### Generate SSL Certificates

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Generate self-signed certificate (development)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem

# For production, use Let's Encrypt or your CA certificates
```

### Enable HTTPS

```bash
# Start with SSL proxy
docker-compose --profile production up -d
```

## Scaling and Performance

### Scale Services

```bash
# Scale backend instances
docker-compose up -d --scale backend=3

# Scale with load balancer
docker-compose -f docker-compose.yml -f docker-compose.scale.yml up -d
```

### Performance Tuning

1. **MongoDB Optimization**
   ```bash
   # Increase MongoDB memory
   docker-compose exec mongodb mongosh --eval "db.adminCommand({setParameter: 1, wiredTigerCacheSizeGB: 2})"
   ```

2. **Redis Configuration**
   ```bash
   # Set Redis max memory
   docker-compose exec redis redis-cli CONFIG SET maxmemory 512mb
   ```

## Backup and Recovery

### Automated Backups

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T mongodb mongodump --uri="mongodb://admin:${MONGO_ROOT_PASSWORD}@localhost:27017/pos_system?authSource=admin" --archive | gzip > backup_${DATE}.gz
EOF

chmod +x backup.sh

# Schedule with cron
echo "0 2 * * * /path/to/backup.sh" | crontab -
```

### Manual Backup

```bash
# Backup all data
docker-compose exec mongodb mongodump --uri="mongodb://admin:password@localhost:27017/pos_system?authSource=admin" --out=/data/backup

# Copy backup files
docker cp pos-mongodb:/data/backup ./mongodb-backup
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check port usage
   netstat -tulpn | grep :80
   netstat -tulpn | grep :3001
   
   # Change ports in docker-compose.yml
   ```

2. **Permission Issues**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER .
   
   # Fix Docker socket permissions
   sudo usermod -aG docker $USER
   ```

3. **Memory Issues**
   ```bash
   # Check Docker memory usage
   docker stats
   
   # Increase Docker memory limit
   # Docker Desktop: Settings > Resources > Memory
   ```

4. **Database Connection Issues**
   ```bash
   # Check MongoDB logs
   docker-compose logs mongodb
   
   # Test connection
   docker-compose exec backend node -e "console.log(process.env.MONGODB_URI)"
   ```

### Log Analysis

```bash
# View all logs
docker-compose logs

# Follow specific service logs
docker-compose logs -f backend

# View last 100 lines
docker-compose logs --tail=100 frontend

# Filter logs by time
docker-compose logs --since="2024-01-01T00:00:00" backend
```

## Security Best Practices

1. **Change Default Passwords**
   - MongoDB root password
   - Application secrets
   - Default user passwords

2. **Network Security**
   - Use internal Docker networks
   - Expose only necessary ports
   - Enable firewall rules

3. **Container Security**
   - Run containers as non-root users
   - Use official base images
   - Regular security updates

4. **Data Security**
   - Encrypt data at rest
   - Use SSL/TLS for connections
   - Regular backups

## Production Deployment Checklist

- [ ] Change all default passwords and secrets
- [ ] Configure SSL certificates
- [ ] Set up monitoring and alerting
- [ ] Configure automated backups
- [ ] Set up log aggregation
- [ ] Configure firewall rules
- [ ] Test disaster recovery procedures
- [ ] Set up CI/CD pipeline
- [ ] Configure load balancing (if needed)
- [ ] Set up health checks
- [ ] Configure resource limits
- [ ] Test security configurations

## Support and Maintenance

### Regular Maintenance

```bash
# Update images
docker-compose pull
docker-compose up -d

# Clean up unused resources
docker system prune -a

# Update application
git pull
docker-compose build
docker-compose up -d
```

### Monitoring Commands

```bash
# Resource usage
docker stats

# Disk usage
docker system df

# Network inspection
docker network ls
docker network inspect pos_pos-network
```

For additional support, refer to:
- [Security Guidelines](SECURITY_GUIDELINES.md)
- [API Documentation](README.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)