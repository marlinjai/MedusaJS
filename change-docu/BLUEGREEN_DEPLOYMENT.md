# Blue-Green Deployment Guide

This guide explains how to use the blue-green deployment system for zero-downtime deployments of your MedusaJS application on a VPS.

## Overview

Blue-green deployment is a technique that reduces downtime and risk by running two identical production environments called Blue and Green. At any time, only one environment is live, serving all production traffic.

### Architecture

```
┌─────────────────┐    ┌─────────────────┐
│     Nginx       │    │   Persistent    │
│   (Load Balancer)│    │   Services      │
│                 │    │                 │
│  Routes to:     │    │ ┌─────────────┐ │
│  Blue or Green  │    │ │ PostgreSQL  │ │
└─────────────────┘    │ │             │ │
         │              │ └─────────────┘ │
         │              │                 │
         ▼              │ ┌─────────────┐ │
┌─────────────────┐    │ │   Redis     │ │
│ Blue Deployment │    │ │             │ │
│                 │    │ └─────────────┘ │
│ ┌─────────────┐ │    └─────────────────┘
│ │   Server    │ │
│ └─────────────┘ │
│ ┌─────────────┐ │
│ │   Worker    │ │
│ └─────────────┘ │
└─────────────────┘

┌─────────────────┐
│Green Deployment │
│                 │
│ ┌─────────────┐ │
│ │   Server    │ │
│ └─────────────┘ │
│ ┌─────────────┐ │
│ │   Worker    │ │
│ └─────────────┘ │
└─────────────────┘
```

## File Structure

```
busbasisberlin/
├── docker-compose.base.yml     # Persistent services (nginx, postgres, redis)
├── docker-compose.blue.yml     # Blue deployment configuration
├── docker-compose.green.yml    # Green deployment configuration
├── nginx/
│   ├── nginx.conf              # Current active configuration
│   ├── nginx-blue.conf         # Blue deployment nginx config
│   └── nginx-green.conf        # Green deployment nginx config
├── scripts/
│   ├── deploy.sh               # Main deployment script
│   └── health-check.sh         # Health check utilities
└── .current_deployment         # Tracks active deployment (blue/green)
```

## Quick Start

### 1. Initial Setup

```bash
# Start persistent services (database, redis, nginx)
npm run bluegreen:setup

# Deploy initial blue environment
npm run deploy
```

### 2. Deploy New Version

```bash
# Deploy new version (automatically switches between blue/green)
npm run deploy
```

### 3. Rollback if Needed

```bash
# Rollback to previous version
npm run deploy:rollback
```

## Available Commands

### NPM Scripts

```bash
# Deployment commands
npm run deploy              # Perform blue-green deployment
npm run deploy:rollback     # Rollback to previous deployment
npm run deploy:status       # Show current deployment status

# Health check commands
npm run health:check        # Run comprehensive health check
npm run health:wait         # Wait for all services to be healthy

# Manual blue-green commands
npm run bluegreen:setup     # Start persistent services only
npm run bluegreen:blue      # Start blue deployment manually
npm run bluegreen:green     # Start green deployment manually
```

### Direct Script Usage

```bash
# Deployment script
./scripts/deploy.sh deploy      # Deploy new version
./scripts/deploy.sh rollback    # Rollback deployment
./scripts/deploy.sh status      # Show status

# Health check script
./scripts/health-check.sh check   # Run health check
./scripts/health-check.sh wait    # Wait for healthy state
./scripts/health-check.sh status  # Show container status
```

## Deployment Process

### Automated Deployment Flow

1. **Determine Target**: Script identifies current deployment (blue/green) and targets the opposite
2. **Start New Environment**: Builds and starts the target deployment containers
3. **Health Checks**: Waits for new containers to pass health checks (up to 2 minutes)
4. **Switch Traffic**: Updates nginx configuration to route traffic to new deployment
5. **Cleanup**: Stops old deployment containers
6. **Update State**: Records new active deployment

### Manual Deployment Steps

If you need to deploy manually:

```bash
# 1. Check current deployment
npm run deploy:status

# 2. Start persistent services
npm run bluegreen:setup

# 3. Deploy to target environment (if current is blue, deploy green)
npm run bluegreen:green

# 4. Wait for health checks
npm run health:wait

# 5. Switch nginx configuration manually
cp nginx/nginx-green.conf nginx/nginx.conf
docker exec medusa_nginx nginx -s reload

# 6. Update state file
echo "green" > .current_deployment

# 7. Stop old deployment
docker compose -f docker-compose.blue.yml down
```

## Health Checks

The system includes comprehensive health checks:

### Container Health

- PostgreSQL: Connection acceptance
- Redis: Ping response
- Nginx: HTTP response
- Medusa Server: Health endpoint
- Medusa Worker: Container health status

### HTTP Endpoints

- `https://localhost/health` - Main health endpoint
- Response codes and timing validation

### Automatic Validation

- Health checks run automatically during deployment
- 2-minute timeout with 5-second intervals
- Automatic rollback on health check failure

## Configuration

### Environment Variables

Create `.env.docker` with your production settings:

```bash
# Database
POSTGRES_PASSWORD=your_secure_password

# Application
NODE_ENV=production
JWT_SECRET=your_jwt_secret
COOKIE_SECRET=your_cookie_secret

# Email (if using Resend)
RESEND_API_KEY=your_resend_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Other environment variables...
```

### SSL Certificates

Ensure SSL certificates are in place:

```bash
# For development/testing
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/localhost-key.pem \
  -out nginx/ssl/localhost.pem \
  -subj "/C=DE/ST=Berlin/L=Berlin/O=Development/CN=localhost"

# For production, use proper SSL certificates
```

## VPS Deployment

### Server Requirements

- Docker and Docker Compose installed
- Minimum 2GB RAM (4GB recommended)
- 20GB+ disk space
- Open ports: 80, 443

### Initial VPS Setup

```bash
# 1. Clone repository
git clone <your-repo> /opt/medusa
cd /opt/medusa/busbasisberlin

# 2. Set up environment
cp .env.docker.example .env.docker
# Edit .env.docker with production values

# 3. Set up SSL certificates
mkdir -p nginx/ssl
# Copy your SSL certificates to nginx/ssl/

# 4. Initial deployment
npm run deploy
```

### Continuous Deployment

Set up automated deployments with GitHub Actions or similar:

```yaml
# .github/workflows/deploy.yml
name: Deploy to VPS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/medusa/busbasisberlin
            git pull origin main
            npm run deploy
```

## Monitoring and Troubleshooting

### Check Deployment Status

```bash
# Quick status check
npm run deploy:status

# Detailed health check
npm run health:check

# View logs
docker compose logs -f medusa_nginx
docker compose -f docker-compose.blue.yml logs -f
docker compose -f docker-compose.green.yml logs -f
```

### Common Issues

#### Deployment Fails Health Checks

```bash
# Check container logs
docker compose -f docker-compose.blue.yml logs medusa-server-blue
docker compose -f docker-compose.green.yml logs medusa-server-green

# Check database connectivity
docker exec medusa_postgres pg_isready -U postgres

# Check Redis connectivity
docker exec medusa_redis redis-cli ping
```

#### Nginx Configuration Issues

```bash
# Test nginx configuration
docker exec medusa_nginx nginx -t

# Reload nginx configuration
docker exec medusa_nginx nginx -s reload

# Check nginx logs
docker logs medusa_nginx
```

#### Rollback Issues

```bash
# Manual rollback
npm run deploy:rollback

# If automatic rollback fails, manual switch:
cp nginx/nginx-blue.conf nginx/nginx.conf  # or nginx-green.conf
docker exec medusa_nginx nginx -s reload
echo "blue" > .current_deployment  # or "green"
```

## Data Persistence

### Database Persistence

- PostgreSQL data is stored in named volume `postgres_data`
- Survives container restarts and deployments
- Regular backups recommended

### Redis Persistence

- Redis data is stored in named volume `redis_data`
- Configured for persistence across deployments
- Contains session data and cache

### File Uploads

- Application files are mounted as volumes
- Persistent across deployments
- Consider using external storage (S3) for production

## Security Considerations

### SSL/TLS

- Always use HTTPS in production
- Keep SSL certificates updated
- Use strong cipher suites

### Container Security

- Run containers as non-root user
- Keep base images updated
- Regular security scanning

### Network Security

- Use Docker networks for service isolation
- Firewall configuration for VPS
- Regular security updates

## Performance Optimization

### Resource Allocation

- Monitor container resource usage
- Adjust container limits as needed
- Scale horizontally if required

### Database Optimization

- Regular database maintenance
- Connection pooling configuration
- Query optimization

### Caching

- Redis caching configuration
- CDN for static assets
- Browser caching headers

## Backup and Recovery

### Database Backups

```bash
# Create backup
docker exec medusa_postgres pg_dump -U postgres medusa-store > backup.sql

# Restore backup
docker exec -i medusa_postgres psql -U postgres medusa-store < backup.sql
```

### Full System Backup

```bash
# Backup volumes
docker run --rm -v postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .
docker run --rm -v redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis_backup.tar.gz -C /data .
```

## Support and Maintenance

### Regular Maintenance Tasks

- Monitor disk space and clean up old images
- Update base images regularly
- Review and rotate secrets
- Monitor application performance
- Check logs for errors

### Getting Help

- Check container logs for error messages
- Use health check scripts for diagnostics
- Monitor system resources
- Review deployment logs

This blue-green deployment system provides zero-downtime deployments while maintaining data persistence and allowing for quick rollbacks when needed.
