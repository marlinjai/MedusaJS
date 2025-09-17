# 🚀 Production Deployment Guide - Linode VPS

## Prerequisites

- ✅ Linode VPS running (Ubuntu 20.04+ recommended)
- ✅ SSH access to VPS as root
- ✅ Domain name (optional but recommended)
- ✅ GitHub repository with your code

---

## Step 1: Initial VPS Setup

### 1.1 Connect to Your VPS

```bash
# Replace YOUR_LINODE_IP with your actual IP
ssh root@YOUR_LINODE_IP
```

### 1.2 Update System

```bash
apt update && apt upgrade -y
```

### 1.3 Install Required Packages

```bash
apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
```

### 1.4 Install Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh
```

### 1.5 Install Docker Compose

```bash
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### 1.6 Create Project Directory

```bash
mkdir -p /opt/medusa-app
cd /opt/medusa-app
```

---

## Step 2: Clone Repository and Setup Files

### 2.1 Clone Your Repository

```bash
# Replace with your actual repository URL
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .
```

### 2.2 Copy Data Files to VPS

You'll need to copy your CSV data files to the VPS. From your local machine:

```bash
# Copy data directory to VPS
scp -r data/ root@YOUR_LINODE_IP:/opt/medusa-app/

# Or copy specific files
scp data/artikeldaten*.csv root@YOUR_LINODE_IP:/opt/medusa-app/data/
scp data/JTL-Export-Lieferantendaten-*.csv root@YOUR_LINODE_IP:/opt/medusa-app/data/
```

### 2.3 Make Scripts Executable

```bash
chmod +x scripts/*.sh
```

---

## Step 3: Configure Environment Variables

### 3.1 Create Production Environment File

```bash
cp .env.docker .env.production

# Edit the production environment file
nano .env.production
```

### 3.2 Update Critical Settings

Update these values in `.env.production`:

```bash
# Database (use strong passwords!)
POSTGRES_PASSWORD=your_super_secure_postgres_password
DATABASE_URL=postgresql://medusa:your_super_secure_postgres_password@postgres:5432/medusa

# Redis (use strong password!)
REDIS_PASSWORD=your_super_secure_redis_password
REDIS_URL=redis://:your_super_secure_redis_password@redis:6379

# Security (generate strong secrets!)
JWT_SECRET=your_super_secure_jwt_secret_min_32_characters
COOKIE_SECRET=your_super_secure_cookie_secret_min_32_characters

# CORS (use your actual domain)
STORE_CORS=https://yourdomain.com
ADMIN_CORS=https://yourdomain.com
AUTH_CORS=https://yourdomain.com
MEDUSA_BACKEND_URL=https://yourdomain.com
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://yourdomain.com

# S3 Configuration (your actual values)
S3_FILE_URL=your_s3_file_url
S3_ACCESS_KEY_ID=your_s3_access_key
S3_SECRET_ACCESS_KEY=your_s3_secret_key
S3_REGION=your_s3_region
S3_BUCKET=your_s3_bucket
S3_ENDPOINT=your_s3_endpoint

# Email (your actual Resend credentials)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

---

## Step 4: Configure Firewall

### 4.1 Setup UFW Firewall

```bash
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

### 4.2 Verify Firewall Status

```bash
ufw status
```

---

## Step 5: Initial Deployment

### 5.1 Start Infrastructure Services

```bash
docker-compose up -d postgres redis
```

### 5.2 Wait for Services to be Ready

```bash
# Check if PostgreSQL is ready
docker-compose exec postgres pg_isready -U medusa

# Check if Redis is ready
docker-compose exec redis redis-cli ping
```

### 5.3 Deploy Blue Environment (Initial)

```bash
./scripts/deploy-blue.sh
```

### 5.4 Create Admin User

```bash
docker-compose exec medusa-server-blue npx medusa user -e admin@yourdomain.com -p your_secure_admin_password
```

---

## Step 6: Import Data

### 6.1 Import Suppliers First

```bash
docker-compose exec medusa-server-blue npm run import:suppliers
```

### 6.2 Import Products

```bash
docker-compose exec medusa-server-blue npm run import:products
```

### 6.3 Verify Data Import

```bash
# Check if data was imported successfully
docker-compose exec medusa-server-blue npx medusa exec -c "
const { MedusaContainer } = require('@medusajs/framework');
const container = MedusaContainer.getInstance();
const productService = container.resolve('product');
productService.listProducts().then(products => {
  console.log('Total products:', products.length);
  process.exit(0);
}).catch(console.error);
"
```

---

## Step 7: Configure GitHub Actions

### 7.1 Add Repository Secrets

Go to GitHub → Your Repository → Settings → Secrets and variables → Actions

Add these secrets:

```
HOST=your_linode_ip
SSH_USER=root
SSH_PRIVATE_KEY=your_ssh_private_key
PROJECT_PATH=/opt/medusa-app

POSTGRES_PASSWORD=your_postgres_password
REDIS_PASSWORD=your_redis_password
JWT_SECRET=your_jwt_secret
COOKIE_SECRET=your_cookie_secret

STORE_CORS=https://yourdomain.com
ADMIN_CORS=https://yourdomain.com
AUTH_CORS=https://yourdomain.com
MEDUSA_BACKEND_URL=https://yourdomain.com
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://yourdomain.com

S3_FILE_URL=your_s3_file_url
S3_ACCESS_KEY_ID=your_s3_access_key
S3_SECRET_ACCESS_KEY=your_s3_secret_key
S3_REGION=your_s3_region
S3_BUCKET=your_s3_bucket
S3_ENDPOINT=your_s3_endpoint

RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### 7.2 Generate SSH Key for GitHub Actions

On your VPS:

```bash
ssh-keygen -t rsa -b 4096 -f /root/.ssh/github_actions_key -N ""

# Copy the PRIVATE key (add to GitHub Secrets as SSH_PRIVATE_KEY)
cat /root/.ssh/github_actions_key

# Copy the PUBLIC key (add to authorized_keys)
cat /root/.ssh/github_actions_key.pub >> /root/.ssh/authorized_keys
```

---

## Step 8: SSL Setup (Optional but Recommended)

### 8.1 Install Certbot

```bash
apt install certbot
```

### 8.2 Get SSL Certificate

```bash
# Stop nginx temporarily
docker-compose stop nginx

# Get certificate (replace yourdomain.com)
certbot certonly --standalone -d yourdomain.com

# Start nginx again
docker-compose start nginx
```

### 8.3 Update Nginx Configuration

Edit `nginx/nginx.conf` to use SSL certificates and restart nginx.

---

## Step 9: Verify Deployment

### 9.1 Check All Services

```bash
docker-compose ps
```

### 9.2 Test Endpoints

```bash
# Test health
curl http://your_linode_ip/health

# Test API
curl http://your_linode_ip/api/health

# Test storefront (should return HTML)
curl http://your_linode_ip/
```

### 9.3 Test Admin Access

Visit: `http://your_linode_ip/app`
Login with the admin credentials you created.

---

## Step 10: Test GitHub Actions Deployment

### 10.1 Make a Small Change

```bash
# On your local machine
echo "# Production deployment test" >> README.md
git add README.md
git commit -m "test: production deployment"
git push origin main
```

### 10.2 Monitor Deployment

- Go to GitHub → Actions
- Watch the deployment progress
- Verify the site updates

---

## 🎉 Success Checklist

- [ ] VPS setup completed
- [ ] Docker and Docker Compose installed
- [ ] Repository cloned and data files copied
- [ ] Environment variables configured
- [ ] Firewall configured
- [ ] Initial deployment successful
- [ ] Admin user created
- [ ] Data imported (suppliers and products)
- [ ] GitHub Actions configured
- [ ] SSL configured (optional)
- [ ] All endpoints responding
- [ ] Test deployment successful

---

## 📞 Support Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f medusa-server-blue
```

### Restart Services

```bash
# Restart everything
docker-compose restart

# Restart specific service
docker-compose restart medusa-server-blue
```

### Database Backup

```bash
docker-compose exec postgres pg_dump -U medusa medusa > backup_$(date +%Y%m%d).sql
```

### Monitor Resources

```bash
# Container stats
docker stats

# Disk usage
df -h

# Memory usage
free -h
```

---

**🎯 Ready for Production!** Your Medusa e-commerce platform should now be running smoothly on Linode with automated deployments!
