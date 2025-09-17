# Complete Medusa Docker Deployment Guide

## 🎯 Overview

This comprehensive guide walks you through deploying your Medusa e-commerce application using Docker with automated blue-green deployment. From local testing to production deployment, everything is covered in one place.

## 🏗️ Architecture

Our deployment includes:

- **PostgreSQL Database**: Persistent data storage
- **Redis**: Cache, event bus, and workflow engine (production modules)
- **Medusa Server (Blue/Green)**: API and admin dashboard instances
- **Medusa Worker (Blue/Green)**: Background job processing instances
- **Next.js Storefront**: Customer-facing frontend
- **Nginx**: Reverse proxy with blue-green routing
- **GitHub Actions**: Automated CI/CD with zero-downtime deployments

## 📋 Prerequisites

- Docker and Docker Compose installed locally
- A VPS with Ubuntu/Debian (for production)
- GitHub repository with your code
- Domain name (for production)
- At least 4GB RAM available

---

## 🧪 Step 1: Local Testing with Redis

**Before deploying to production, test your setup locally with Redis modules.**

### 1.1 Prepare Local Environment

```bash
# Make scripts executable
chmod +x scripts/test-local-redis.sh
chmod +x scripts/deploy-blue.sh
chmod +x scripts/deploy-green.sh

# Copy environment template (if not exists)
cp env.docker.example .env.test
```

### 1.2 Run Local Redis Test

```bash
# Test local setup with Redis modules
./scripts/test-local-redis.sh
```

This comprehensive test will:

- ✅ Start PostgreSQL and Redis containers
- ✅ Test Redis modules (cache, event-bus, workflow-engine)
- ✅ Verify Medusa configuration with production modules
- ✅ Test API endpoints and health checks
- ✅ Run performance tests
- ✅ Check resource usage

### 1.3 Verify Local Setup

If the test passes, you'll see:

```
✅ Local Redis testing completed successfully!
🎯 Your setup is ready for production deployment!
```

Access your local environment:

- **Medusa API**: <http://localhost:9000>
- **Admin Dashboard**: <http://localhost:9000/app>
- **Health Check**: <http://localhost:9000/health>

### 1.4 Local Blue-Green Testing (Optional)

```bash
# Test blue deployment
./scripts/deploy-blue.sh

# Test green deployment
./scripts/deploy-green.sh

# Check which environment is active
curl http://localhost/deploy/blue
curl http://localhost/deploy/green
```

### 1.5 Clean Up Local Testing

```bash
# Stop all services
docker-compose down

# Remove test data (optional)
docker-compose down -v
```

---

## 🚀 Step 2: VPS Setup (One-time Only)

**This step sets up your VPS for automated deployments. You only need to do this once.**

### 2.1 Initial VPS Setup

SSH into your VPS as root and run the automated setup:

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Download and run setup script
curl -fsSL https://raw.githubusercontent.com/your-username/your-repo/main/scripts/setup-server.sh | bash
```

This script will:

- ✅ Install Docker and Docker Compose
- ✅ Configure firewall (ports 80, 443, SSH)
- ✅ Set up monitoring and health checks
- ✅ Create automated backups (daily at 2 AM)
- ✅ Generate SSH keys for GitHub Actions
- ✅ Create project directory at `/opt/medusa-app`
- ✅ Set up systemd service for auto-start

### 2.2 Save SSH Key

The setup script will output an SSH private key. **Copy this key** - you'll need it for GitHub Secrets.

```
📋 SSH Private Key (add this to GitHub repository secrets as SSH_PRIVATE_KEY):
==========================================
-----BEGIN RSA PRIVATE KEY-----
[Your SSH private key content]
-----END RSA PRIVATE KEY-----
==========================================
```

---

## ⚙️ Step 3: Configure GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

### 3.1 Required Secrets

```
HOST=your-vps-ip-address
SSH_USER=your-vps-username
SSH_PRIVATE_KEY=your-ssh-private-key-from-setup
PROJECT_PATH=/opt/medusa-app
```

### 3.2 Environment Secrets

```
POSTGRES_PASSWORD=your-secure-postgres-password
REDIS_PASSWORD=your-secure-redis-password
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars
COOKIE_SECRET=your-super-secure-cookie-secret-min-32-chars
```

### 3.3 S3 Configuration

```
S3_FILE_URL=https://your-bucket.s3.amazonaws.com
S3_ACCESS_KEY_ID=your-s3-access-key
S3_SECRET_ACCESS_KEY=your-s3-secret-key
S3_REGION=us-east-1
S3_BUCKET=your-s3-bucket-name
S3_ENDPOINT=https://s3.amazonaws.com
```

### 3.4 Email Configuration (Resend)

```
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### 3.5 CORS Settings

```
STORE_CORS=https://yourdomain.com
ADMIN_CORS=https://yourdomain.com
AUTH_CORS=https://yourdomain.com
MEDUSA_BACKEND_URL=https://yourdomain.com
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://yourdomain.com
```

**💡 Tip**: For development, use `http://localhost:8000` for STORE_CORS and `http://localhost:9000` for backend URLs.

---

## 📦 Step 4: First Deployment

### 4.1 Clone Repository to VPS

```bash
# SSH into your VPS
ssh your-username@your-vps-ip

# Navigate to project directory
cd /opt/medusa-app

# Clone your repository
git clone https://github.com/your-username/your-repo.git .
```

### 4.2 Trigger Automated Deployment

**Option A: Push to main branch (automatic)**

```bash
# From your local machine
git add .
git commit -m "Initial production deployment"
git push origin main
```

**Option B: Manual trigger**

1. Go to your GitHub repository
2. Click **"Actions"**
3. Select **"Deploy to Production"**
4. Click **"Run workflow"**

### 4.3 Monitor Deployment

Watch the deployment progress:

1. Go to GitHub → Actions → Your workflow run
2. Monitor the deployment logs
3. Wait for "✅ Deployment completed successfully!"

---

## 🔄 How Blue-Green Deployment Works

### Automatic Process

1. **GitHub Actions** detects push to main branch
2. **Determines current environment** (blue or green)
3. **Deploys to opposite environment** (zero downtime)
4. **Health checks** the new environment (5-minute timeout)
5. **Switches traffic** to new environment via Nginx
6. **Cleans up** old environment
7. **Automatic rollback** if health checks fail

### Manual Control

```bash
# SSH into your VPS
ssh your-username@your-vps-ip
cd /opt/medusa-app

# Check current environment
curl http://your-domain.com/deploy/blue
curl http://your-domain.com/deploy/green

# Manually switch environments
./scripts/deploy-blue.sh
./scripts/deploy-green.sh
```

---

## ✅ Step 5: Verify Deployment

### 5.1 Check Service Status

```bash
# SSH into your VPS
ssh your-username@your-vps-ip
cd /opt/medusa-app

# Check all containers
docker-compose ps

# Check health
curl http://your-vps-ip/health
curl http://your-vps-ip/api/health
```

### 5.2 Access Applications

- **Storefront**: <http://your-domain.com>
- **Admin Dashboard**: <http://your-domain.com/app>
- **API Health**: <http://your-domain.com/api/health>
- **Nginx Health**: <http://your-domain.com/health>

### 5.3 Create Admin User

```bash
# SSH into your VPS and run
docker-compose exec medusa-server-blue npx medusa user -e admin@yourdomain.com -p secure-password
```

### 5.4 Import Existing Data (Optional)

```bash
# Export from your local database
pg_dump -h localhost -U your_user -d your_database > backup.sql

# Copy to VPS and import
scp backup.sql your-username@your-vps-ip:/opt/medusa-app/
ssh your-username@your-vps-ip
cd /opt/medusa-app
docker-compose exec -T postgres psql -U medusa -d medusa < backup.sql
```

---

## 📊 Monitoring and Maintenance

### Health Checks

```bash
# Application health
curl http://your-domain.com/health

# API health
curl http://your-domain.com/api/health

# Container status
docker-compose ps

# Resource usage
docker stats
```

### Logs

```bash
# View all logs
docker-compose logs -f

# Specific service logs
docker-compose logs -f medusa-server-blue
docker-compose logs -f storefront
docker-compose logs -f nginx

# Monitoring logs
tail -f /var/log/medusa/monitor.log
```

### Backups

```bash
# Manual backup
./backup.sh

# View backups
ls /opt/medusa-backups

# Restore backup
docker-compose exec -T postgres psql -U medusa -d medusa < /opt/medusa-backups/backup_file.sql.gz
```

### Automated Monitoring

The setup includes:

- **Health monitoring** every 5 minutes
- **Daily backups** at 2 AM
- **Log rotation** (52 weeks retention)
- **Resource monitoring** (disk, memory alerts)

---

## 🔧 Troubleshooting

### Common Issues

**1. Services not starting:**

```bash
docker-compose logs service-name
docker-compose restart service-name
```

**2. Database connection issues:**

```bash
docker-compose exec postgres pg_isready -U medusa
docker-compose down -v
docker-compose up -d postgres
```

**3. Redis connection issues:**

```bash
docker-compose exec redis redis-cli ping
docker-compose down -v
docker-compose up -d redis
```

**4. GitHub Actions failing:**

- Check SSH key configuration
- Verify all secrets are set correctly
- Test VPS connectivity
- Check disk space on VPS

**5. Blue-Green deployment stuck:**

```bash
# Check which environment is active
curl http://your-domain.com/deploy/blue

# Force switch to working environment
./scripts/deploy-blue.sh  # or deploy-green.sh

# Check container health
docker-compose ps
```

### Performance Issues

**High memory usage:**

```bash
docker stats
docker-compose restart
```

**Slow response times:**

```bash
# Check Redis cache
docker-compose exec redis redis-cli info memory

# Check database performance
docker-compose exec postgres psql -U medusa -c "SELECT * FROM pg_stat_activity;"
```

---

## 🔒 Security Setup

### SSL/TLS Configuration

```bash
# Install Certbot
sudo apt install certbot

# Get SSL certificate
sudo certbot certonly --standalone -d your-domain.com

# Configure Nginx (edit nginx/nginx.conf)
# Uncomment SSL configuration lines
# Update certificate paths
```

### Firewall Configuration

```bash
# Check firewall status
sudo ufw status

# Allow necessary ports
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 📈 Scaling

### Horizontal Scaling

```bash
# Scale workers
docker-compose up -d --scale medusa-worker-blue=3

# Scale storefront
docker-compose up -d --scale storefront=2
```

### Vertical Scaling

- Increase VPS resources (CPU, RAM)
- Optimize database configuration
- Configure Redis memory limits
- Use CDN for static assets

---

## 🔄 Rollback Process

### Automatic Rollback

The system automatically rolls back if:

- Health checks fail for 5 minutes
- Deployment script encounters errors
- New environment doesn't respond

### Manual Rollback

```bash
# Switch to previous environment
./scripts/deploy-blue.sh  # if green is problematic
./scripts/deploy-green.sh  # if blue is problematic

# Database rollback
docker-compose exec -T postgres psql -U medusa -d medusa < backup_file.sql
```

---

## 🎉 Success Checklist

- [ ] Local Redis testing passed
- [ ] VPS setup completed
- [ ] GitHub secrets configured
- [ ] First deployment successful
- [ ] Health checks passing
- [ ] Admin user created
- [ ] SSL certificates configured (production)
- [ ] Monitoring active
- [ ] Backups working
- [ ] Blue-green deployment tested

---

## 📚 Additional Resources

- [Medusa Documentation](https://docs.medusajs.com/)
- [Docker Documentation](https://docs.docker.com/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Nginx Documentation](https://nginx.org/en/docs/)

---

## 🆘 Support

If you encounter issues:

1. **Check local setup first** with `./scripts/test-local-redis.sh`
2. **Review application logs** with `docker-compose logs -f`
3. **Check GitHub Actions logs** in your repository
4. **Verify all secrets** are configured correctly
5. **Test VPS connectivity** and disk space

---

**🎉 Congratulations!** Your Medusa application is now deployed with automated blue-green deployment, zero-downtime updates, and comprehensive monitoring!
