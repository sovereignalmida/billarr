# ⚓ Billarr Deployment Guide

![Billarr](logo.png)

## Quick Deploy (Recommended)

The easiest way to get started:

```bash
chmod +x start.sh
./start.sh
```

This script will:
1. ✅ Check Docker installation
2. 📁 Create necessary directories
3. 🏗️ Build containers
4. 🚀 Start the application
5. ✨ Open at http://localhost:8080

## Manual Deployment

If you prefer to deploy manually:

```bash
# 1. Create data directory
mkdir -p data

# 2. Build and start containers
docker compose up -d --build

# 3. Check status
docker compose ps

# 4. View logs
docker compose logs -f
```

## Production Deployment

For production use with HTTPS and a domain:

### Option 1: Using Nginx Reverse Proxy

1. **Install Nginx** on your server
2. **Configure Nginx** with SSL:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

3. **Update docker compose.yml** to only expose to localhost:

```yaml
services:
  frontend:
    ports:
      - "127.0.0.1:8080:80"  # Only accessible from localhost
```

### Option 2: Using Caddy (Automatic HTTPS)

1. **Install Caddy**
2. **Create Caddyfile**:

```
yourdomain.com {
    reverse_proxy localhost:8080
}
```

3. **Start Caddy**: `caddy run`

### Option 3: Using Traefik

See the included `docker compose.traefik.yml` for a complete setup with automatic HTTPS.

## Environment Variables

Create a `.env` file for custom configuration:

```env
# Backend
PORT=3001
DB_PATH=/app/data/bills.db

# Frontend
REACT_APP_API_URL=http://localhost:8080

# Docker
COMPOSE_PROJECT_NAME=bill-tracker
```

## Updating

To update to a new version:

```bash
# Pull latest changes
git pull

# Rebuild containers
docker compose up -d --build

# Your data in ./data directory is preserved
```

## Backup Strategy

### Automated Backups

Create a backup script `backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
cp -r ./data "$BACKUP_DIR/billarr-$DATE"

# Keep only last 30 backups
cd "$BACKUP_DIR"
ls -t | tail -n +31 | xargs rm -rf

echo "Backup completed: billarr-$DATE"
```

### Cron Job

Add to crontab for daily backups at 2 AM:

```bash
0 2 * * * /path/to/billarr/backup.sh
```

## Monitoring

### Health Checks

The backend includes a health endpoint:

```bash
curl http://localhost:3001/health
```

Response: `{"status":"ok","timestamp":"2024-..."}`

### Container Logs

```bash
# All logs
docker compose logs -f

# Backend only
docker compose logs -f backend

# Frontend only
docker compose logs -f frontend
```

### Resource Usage

```bash
docker stats billarr-backend billarr-frontend
```

## Troubleshooting

### Port Already in Use

Change ports in `docker compose.yml`:

```yaml
services:
  frontend:
    ports:
      - "8081:80"  # Changed from 8080
  backend:
    ports:
      - "3002:3001"  # Changed from 3001
```

### Database Locked

If you see "database is locked" errors:

```bash
# Stop containers
docker compose down

# Check for zombie processes
ps aux | grep bill-tracker

# Restart
docker compose up -d
```

### Containers Won't Start

```bash
# Remove and recreate
docker compose down -v
docker compose up -d --build
```

## Security Checklist

- [ ] Use HTTPS in production
- [ ] Set up firewall rules
- [ ] Regular backups enabled
- [ ] Update containers regularly
- [ ] Use strong credentials for notifications
- [ ] Restrict network access if public
- [ ] Monitor logs for suspicious activity

## Performance Optimization

### For Heavy Usage

In `docker compose.yml`, increase resources:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
```

### Database Optimization

The SQLite database is optimized for small to medium use. For heavy usage, consider:
- Adding indexes (already included for common queries)
- Regular VACUUM operations
- Database backups before large operations

## Support

For issues or questions:
1. Check logs: `docker compose logs`
2. Review this guide
3. Check GitHub issues
4. Create a new issue with logs and configuration

---

Happy bill tracking with Billarr! ⚓💰
