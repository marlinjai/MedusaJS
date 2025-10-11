# Medusa Docker Deployment Guide

This guide explains how to deploy the Medusa application using Docker, following the official Medusa deployment guidelines.

## Prerequisites

- Docker and Docker Compose installed
- At least 2GB of RAM available
- Ports 5432, 6379, and 9000 available

## Quick Start

1. **Start the application:**

   ```bash
   npm run docker:up
   ```

2. **Check logs:**

   ```bash
   npm run docker:logs
   ```

3. **Stop the application:**
   ```bash
   npm run docker:down
   ```

## Architecture

The Docker setup includes:

- **PostgreSQL Database**: Stores application data
- **Redis Database**: Handles sessions and caching
- **Medusa Server**: Handles API requests and serves admin dashboard
- **Medusa Worker**: Processes background tasks

## Environment Configuration

### Development

Use `.env.local` for local development without Docker.

### Production

Use `.env.docker` for Docker deployment. Update the following variables:

```bash
# Security (GENERATE SECURE SECRETS!)
JWT_SECRET=your-super-secure-jwt-secret
COOKIE_SECRET=your-super-secure-cookie-secret

# URLs (update with your production URLs)
STORE_CORS=https://your-storefront.com
ADMIN_CORS=https://your-medusa-backend.com
AUTH_CORS=https://your-storefront.com,https://your-medusa-backend.com
MEDUSA_BACKEND_URL=https://your-medusa-backend.com

# S3 Configuration
S3_FILE_URL=https://your-s3-bucket.s3.amazonaws.com
S3_ACCESS_KEY_ID=your-s3-access-key
S3_SECRET_ACCESS_KEY=your-s3-secret-key
S3_REGION=us-east-1
S3_BUCKET=your-production-bucket

# Email Configuration
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@yourcompany.com
```

## Available Scripts

- `npm run docker:up` - Start all services
- `npm run docker:down` - Stop all services
- `npm run docker:logs` - View logs
- `npm run docker:restart` - Restart services
- `npm run docker:clean` - Clean up volumes and containers

## Health Checks

The application includes health checks for all services:

- **PostgreSQL**: `pg_isready` check
- **Redis**: `redis-cli ping` check
- **Medusa Server**: HTTP health endpoint check

## Access Points

- **Medusa API**: http://localhost:9000
- **Admin Dashboard**: http://localhost:9000/app
- **Health Check**: http://localhost:9000/health

## Creating Admin User

After deployment, create an admin user:

```bash
docker exec -it medusa_backend_server npx medusa user -e admin@yourcompany.com -p yourpassword
```

## Production Deployment

For production deployment:

1. Update `.env.docker` with production values
2. Use a reverse proxy (nginx) for SSL termination
3. Set up proper monitoring and logging
4. Configure backup strategies for PostgreSQL
5. Use managed Redis and PostgreSQL services for better reliability

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 5432, 6379, and 9000 are available
2. **Memory issues**: Ensure at least 2GB RAM is available
3. **Database connection**: Check PostgreSQL container logs
4. **Redis connection**: Check Redis container logs

### Logs

View specific service logs:

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f medusa-server
docker compose logs -f postgres
docker compose logs -f redis
```

### Clean Restart

If you encounter issues, try a clean restart:

```bash
npm run docker:clean
npm run docker:up
```

## Security Considerations

- Change default passwords in production
- Use secure secrets for JWT and cookies
- Configure proper CORS settings
- Use HTTPS in production
- Regularly update Docker images
- Monitor container logs for security issues
