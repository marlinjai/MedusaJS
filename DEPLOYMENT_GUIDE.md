# MedusaJS Production Deployment Guide

This guide documents the complete process to deploy MedusaJS with blue-green deployment on a fresh VPS.

## Prerequisites

- Fresh Ubuntu 24.04 VPS
- Domain name pointing to your VPS IP
- GitHub repository with your MedusaJS application
- Local machine with GitHub CLI installed

## 1. Initial VPS Setup

### 1.1 Connect to VPS as Root

```bash
ssh root@YOUR_VPS_IP
```

### 1.2 Create Deploy User

```bash
# Create deploy user with home directory
useradd -m -s /bin/bash deploy

# Add deploy user to sudo group
usermod -aG sudo deploy

# Set up passwordless sudo
echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy

# Add deploy user to docker group (install Docker first if needed)
usermod -aG docker deploy
```

### 1.3 Set Up SSH Access

```bash
# Create SSH directory for deploy user
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh

# Add your public SSH key (replace with your actual public key)
echo "YOUR_PUBLIC_SSH_KEY" > /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh

# Create deployment directory
mkdir -p /opt/medusa-app
chown deploy:deploy /opt/medusa-app
```

## 2. GitHub Secrets Setup

### 2.1 Required Secrets

Set up the following GitHub secrets in your repository:

**Server Configuration:**

- `HOST`: Your VPS IP address
- `SSH_USER`: `deploy`
- `SSH_PRIVATE_KEY`: Your SSH private key (full content)
- `DOMAIN_NAME`: Your domain name (e.g., `yourdomain.com`)

**SSL Configuration:**

- `SSL_CERT_NAME`: `fullchain`
- `SSL_KEY_NAME`: `privkey`

**Database & Security:**

- `POSTGRES_PASSWORD`: Strong password for PostgreSQL
- `JWT_SECRET`: Random string for JWT tokens
- `COOKIE_SECRET`: Random string for session cookies

**Email Configuration:**

- `RESEND_API_KEY`: Your Resend API key
- `RESEND_FROM_EMAIL`: Your sender email address

**S3 Storage:**

- `S3_ACCESS_KEY_ID`: S3 access key
- `S3_SECRET_ACCESS_KEY`: S3 secret key
- `S3_REGION`: S3 region
- `S3_BUCKET`: S3 bucket name
- `S3_ENDPOINT`: S3 endpoint URL
- `S3_FILE_URL`: S3 file URL base

**Company Information:**

- `COMPANY_NAME`: Your company name
- `COMPANY_ADDRESS`: Company address
- `COMPANY_POSTAL_CODE`: Postal code
- `COMPANY_CITY`: City
- `COMPANY_EMAIL`: Company email
- `COMPANY_PHONE`: Company phone
- `COMPANY_TAX_ID`: Tax ID
- `COMPANY_BANK_INFO`: Bank information

**PDF & Email Templates:**

- `PDF_FOOTER_TEXT`: Footer text for PDFs
- `EMAIL_SIGNATURE`: Email signature
- `EMAIL_FOOTER`: Email footer

**Backend Configuration:**

- `MEDUSA_BACKEND_URL`: Your backend URL (https://yourdomain.com/)

### 2.2 Set Secrets Using GitHub CLI

```bash
# Use the provided script to set all secrets at once
./setup-deployment/set-github-secrets.sh
```

## 3. SSL Certificate Setup

### 3.1 Install Certbot

```bash
ssh deploy@YOUR_VPS_IP "sudo apt update && sudo apt install -y certbot"
```

### 3.2 Get SSL Certificate

```bash
# Stop nginx temporarily
ssh deploy@YOUR_VPS_IP "cd /opt/medusa-app/busbasisberlin && docker stop medusa_nginx"

# Get Let's Encrypt certificate
ssh deploy@YOUR_VPS_IP "sudo certbot certonly --standalone -d YOUR_DOMAIN --non-interactive --agree-tos --email YOUR_EMAIL"

# Copy certificates to nginx directory
ssh deploy@YOUR_VPS_IP "cd /opt/medusa-app/busbasisberlin && sudo cp /etc/letsencrypt/live/YOUR_DOMAIN/fullchain.pem nginx/ssl/fullchain.pem && sudo cp /etc/letsencrypt/live/YOUR_DOMAIN/privkey.pem nginx/ssl/privkey.pem && sudo chown deploy:deploy nginx/ssl/*.pem"

# Restart nginx
ssh deploy@YOUR_VPS_IP "cd /opt/medusa-app/busbasisberlin && docker start medusa_nginx"

# Enable automatic renewal
ssh deploy@YOUR_VPS_IP "sudo systemctl enable certbot.timer && sudo systemctl start certbot.timer"
```

## 4. Deployment Workflow

### 4.1 GitHub Actions Workflow

The deployment is automated via GitHub Actions. The workflow:

1. **Triggers on**: Push to `main` branch or manual dispatch
2. **SSH into VPS**: Uses the deploy user and SSH key
3. **Pulls latest code**: Updates the repository on the server
4. **Exports environment variables**: Makes all secrets available
5. **Runs deployment script**: Executes blue-green deployment
6. **Health checks**: Verifies new deployment is healthy
7. **Switches traffic**: Updates nginx to point to new deployment
8. **Cleans up**: Stops old deployment

### 4.2 Manual Deployment

You can also deploy manually:

```bash
# SSH into the server
ssh deploy@YOUR_VPS_IP

# Navigate to project directory
cd /opt/medusa-app/busbasisberlin

# Export environment variables (replace with actual values)
export POSTGRES_PASSWORD="your_password"
export JWT_SECRET="your_jwt_secret"
# ... export all other variables

# Run deployment
./scripts/deploy-with-domain.sh
```

## 5. Monitoring and Management

### 5.1 Container Management

```bash
# Check container status
docker ps

# View logs
docker logs medusa_backend_server_blue
docker logs medusa_nginx

# Access container shell
docker exec -it medusa_backend_server_blue /bin/sh
```

### 5.2 Web Interfaces

- **Portainer**: http://YOUR_VPS_IP:9000 (Docker management)
- **Uptime Kuma**: http://YOUR_VPS_IP:3001 (Monitoring)
- **Your Application**: https://YOUR_DOMAIN
- **Admin Panel**: https://YOUR_DOMAIN/app

### 5.3 Health Checks

```bash
# Check deployment status
cd /opt/medusa-app/busbasisberlin
./scripts/deploy.sh status

# Manual health check
curl -I https://YOUR_DOMAIN
```

## 6. Troubleshooting

### 6.1 Common Issues

**SSH Authentication Failed:**

- Verify SSH key is correctly added to GitHub secrets
- Check deploy user has correct permissions
- Ensure SSH key format is preserved (including newlines)

**Environment Variables Missing:**

- Verify all required secrets are set in GitHub
- Check environment variable export in deployment scripts

**Docker Permission Denied:**

- Ensure deploy user is in docker group: `sudo usermod -aG docker deploy`
- Restart docker service: `sudo systemctl restart docker`

**SSL Certificate Issues:**

- Verify domain points to correct IP
- Check port 80 is accessible for Let's Encrypt validation
- Ensure nginx is stopped during certificate generation

**Deployment Timeout:**

- Check GitHub Actions timeout (set to 30 minutes)
- Monitor server resources during npm install
- Consider using Docker layer caching

### 6.2 Log Locations

- **GitHub Actions**: Repository → Actions tab
- **Container logs**: `docker logs CONTAINER_NAME`
- **Nginx logs**: `docker logs medusa_nginx`
- **Let's Encrypt logs**: `/var/log/letsencrypt/letsencrypt.log`

## 7. Maintenance

### 7.1 SSL Certificate Renewal

Certificates auto-renew via systemd timer. To check:

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

### 7.2 System Updates

```bash
sudo apt update && sudo apt upgrade
sudo reboot  # If kernel updates
```

### 7.3 Docker Cleanup

```bash
# Remove unused images and containers
docker system prune -f

# Remove old deployment images
docker image prune -f
```

## 8. Security Considerations

- Use strong passwords for all services
- Keep system and Docker updated
- Monitor access logs regularly
- Use proper firewall rules (UFW recommended)
- Regular backup of database and configuration
- Consider using Docker secrets for sensitive data

## 9. Backup Strategy

### 9.1 Database Backup

```bash
# Create backup
docker exec medusa_postgres pg_dump -U postgres medusa-store > backup.sql

# Restore backup
cat backup.sql | docker exec -i medusa_postgres psql -U postgres medusa-store
```

### 9.2 Configuration Backup

```bash
# Backup nginx configuration
cp -r /opt/medusa-app/busbasisberlin/nginx/ ~/backup/

# Backup SSL certificates
sudo cp -r /etc/letsencrypt/ ~/backup/
```

## 10. Performance Optimization

- Monitor resource usage with Portainer
- Use Redis for caching
- Optimize Docker images with multi-stage builds
- Consider CDN for static assets
- Regular database maintenance and indexing

---

## Quick Reference Commands

```bash
# Check deployment status
./scripts/deploy.sh status

# Manual deployment
./scripts/deploy-with-domain.sh

# View container logs
docker logs -f medusa_backend_server_blue

# Restart nginx
docker restart medusa_nginx

# Check SSL certificate
openssl x509 -in /etc/letsencrypt/live/YOUR_DOMAIN/fullchain.pem -text -noout
```

This deployment setup provides a robust, scalable, and maintainable MedusaJS application with zero-downtime deployments, proper SSL certificates, and comprehensive monitoring.
