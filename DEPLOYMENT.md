# Book Analytics Platform - Deployment Guide

This guide covers deploying the Book Analytics Platform to production using Docker.

## 🚀 Quick Start

### Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB+ RAM
- 10GB+ disk space

### One-Command Deployment

```bash
./scripts/deploy.sh
```

This will:
- ✅ Build the React frontend
- ✅ Create Docker images
- ✅ Start all services
- ✅ Run health checks
- ✅ Display service status

## 📋 Services Overview

| Service | Port | Description |
|---------|------|-------------|
| **Frontend** | 80 | React app via Nginx |
| **API** | 3001 | Express.js server |
| **MongoDB** | 27017 | Book data storage |
| **Redis** | 6379 | Caching (optional) |

## 🔧 Configuration

### Environment Variables

Create `.env.production`:

```bash
# Application
NODE_ENV=production
PORT=3001

# Database
MONGODB_URL=mongodb://book_app:app_password_456@mongodb:27017/book_analytics
REDIS_URL=redis://redis:6379

# Security
SESSION_SECRET=your_session_secret_here
API_RATE_LIMIT=100

# Features
ENABLE_EXPORT=true
MAX_EXPORT_SIZE=10000
```

### MongoDB Credentials

Default credentials (change for production):
- Admin: `admin` / `secure_password_123`
- App User: `book_app` / `app_password_456`

## 🛠️ Manual Deployment Steps

### 1. Build Application

```bash
# Install dependencies
npm install

# Build React frontend
npm run build

# Build Docker image
docker build -t book-analytics:latest .
```

### 2. Start Services

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 3. Initialize Data (Optional)

```bash
# Run ETL pipeline
docker-compose exec book-analytics npm run etl

# Or copy existing data
docker cp ./data_cleaned/ book-analytics:/app/data_cleaned/
```

## 🔍 Health Monitoring

### Health Check Endpoints

- **API Health**: `http://localhost:3001/health`
- **Database**: `http://localhost:3001/api/health/db`
- **System**: `http://localhost:3001/api/health/system`

### Monitoring Commands

```bash
# Service status
docker-compose ps

# Resource usage
docker stats

# Application logs
docker-compose logs book-analytics

# Database logs
docker-compose logs mongodb

# All logs
docker-compose logs -f
```

## 📊 Performance Tuning

### Resource Limits

Update `docker-compose.yml`:

```yaml
services:
  book-analytics:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'
```

### Database Optimization

```bash
# Connect to MongoDB
docker-compose exec mongodb mongosh

# Create additional indexes
db.books.createIndex({ "title": "text", "author": "text" })
db.books.createIndex({ "genre": 1, "rating": -1 })
```

### Nginx Caching

Update `nginx.conf` for aggressive caching:

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 🔒 Security Setup

### SSL/TLS Configuration

1. Obtain SSL certificates:
```bash
# Using Let's Encrypt
certbot certonly --webroot -w /var/www/html -d yourdomain.com
```

2. Update `nginx.conf`:
```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ... SSL configuration
}
```

3. Mount certificates:
```yaml
volumes:
  - /etc/letsencrypt:/etc/nginx/ssl:ro
```

### Security Headers

Already configured in `nginx.conf`:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

### Rate Limiting

Configured zones:
- API: 10 requests/second
- Export: 2 requests/second

## 🔄 Updates & Maintenance

### Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
./scripts/deploy.sh latest production
```

### Backup Data

```bash
# Backup MongoDB
docker-compose exec mongodb mongodump --out /data/backups/

# Backup DuckDB
docker cp book-analytics:/app/data/ ./backups/data-$(date +%Y%m%d)/
```

### Log Rotation

Add to `/etc/logrotate.d/docker-compose`:

```
/var/lib/docker/containers/*/*-json.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
}
```

## 🚨 Troubleshooting

### Common Issues

**Service won't start:**
```bash
# Check logs
docker-compose logs book-analytics

# Check disk space
df -h

# Check memory
free -h
```

**Database connection failed:**
```bash
# Restart MongoDB
docker-compose restart mongodb

# Check MongoDB logs
docker-compose logs mongodb

# Test connection
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
```

**Frontend not loading:**
```bash
# Check Nginx status
docker-compose logs nginx

# Test static files
ls -la dist/

# Rebuild frontend
npm run build && docker-compose restart nginx
```

### Performance Issues

**High memory usage:**
```bash
# Check container stats
docker stats

# Restart services
docker-compose restart

# Increase memory limits in docker-compose.yml
```

**Slow queries:**
```bash
# Enable MongoDB profiling
docker-compose exec mongodb mongosh --eval "db.setProfilingLevel(2)"

# Check slow queries
docker-compose exec mongodb mongosh --eval "db.system.profile.find().limit(5).sort({ts:-1})"
```

## 📈 Scaling

### Horizontal Scaling

```yaml
services:
  book-analytics:
    deploy:
      replicas: 3
  
  nginx:
    depends_on:
      - book-analytics
    # Add load balancing configuration
```

### Database Scaling

```yaml
services:
  mongodb-primary:
    image: mongo:7.0
    command: mongod --replSet rs0
  
  mongodb-secondary:
    image: mongo:7.0
    command: mongod --replSet rs0
```

## 🎯 Production Checklist

- [ ] SSL certificates configured
- [ ] Database credentials changed
- [ ] Environment variables set
- [ ] Monitoring setup (logs, metrics)
- [ ] Backup strategy implemented
- [ ] Rate limiting configured
- [ ] Security headers enabled
- [ ] Health checks working
- [ ] Auto-restart policies set
- [ ] Log rotation configured

## 📞 Support

For deployment issues:
1. Check logs: `docker-compose logs`
2. Verify health: `curl http://localhost:3001/health`
3. Review configuration files
4. Consult troubleshooting section

---

**Last Updated**: August 2025  
**Version**: 1.0.0