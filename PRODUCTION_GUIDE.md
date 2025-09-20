# MedusaJS Production Deployment Guide

**Complete guide for production-ready blue-green deployment with monitoring**

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Architecture                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────────────────────────────┐ │
│  │   GitHub    │    │            VPS Server               │ │
│  │   Actions   │───▶│                                     │ │
│  │   CI/CD     │    │  ┌─────────────────────────────────┐ │ │
│  └─────────────┘    │  │    Persistent Infrastructure   │ │ │
│                     │  │                                 │ │ │
│                     │  │  ┌─────────┐  ┌─────────────┐   │ │ │
│                     │  │  │PostgreSQL│  │    Redis    │   │ │ │
│                     │  │  └─────────┘  └─────────────┘   │ │ │
│                     │  │                                 │ │ │
│                     │  │  ┌─────────┐  ┌─────────────┐   │ │ │
│                     │  │  │Portainer│  │ Uptime Kuma │   │ │ │
│                     │  │  └─────────┘  └─────────────┘   │ │ │
│                     │  └─────────────────────────────────┘ │ │
│                     │                                     │ │
│                     │  ┌─────────────────────────────────┐ │ │
│                     │  │         Nginx Router            │ │ │
│                     │  │    (SSL + Load Balancing)       │ │ │
│                     │  └─────────────────────────────────┘ │ │
│                     │                 │                   │ │
│                     │        ┌────────┴────────┐          │ │
│                     │        ▼                 ▼          │ │
│                     │  ┌─────────────┐  ┌─────────────┐   │ │
│                     │  │    Blue     │  │    Green    │   │ │
│                     │  │ Deployment  │  │ Deployment  │   │ │
│                     │  │             │  │             │   │ │
│                     │  │ ┌─────────┐ │  │ ┌─────────┐ │   │ │
│                     │  │ │ Server  │ │  │ │ Server  │ │   │ │
│                     │  │ │ Worker  │ │  │ │ Worker  │ │   │ │
│                     │  │ └─────────┘ │  │ └─────────┘ │   │ │
│                     │  └─────────────┘  └─────────────┘   │ │
│                     └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Ubuntu 20.04+ VPS with 4GB+ RAM
- Domain name with DNS access
- GitHub repository access

### 1. VPS Setup (One-time)

```bash
# Run as root on your VPS
curl -sSL https://raw.githubusercontent.com/marlinjai/MedusaJS/main/scripts/vps-setup.sh | bash
```

### 2. SSH Key Setup

```bash
# On VPS as root
cd /home/deploy/medusa
sudo ./scripts/setup-github-ssh.sh
```

### 3. Configure GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets → Actions):

**VPS Connection:**

- `VPS_HOST`: Your VPS IP address
- `VPS_USER`: `deploy`
- `SSH_PRIVATE_KEY`: From setup-github-ssh.sh output

**Domain & SSL:**

- `DOMAIN_NAME`: `your-domain.com`
- `SSL_CERT_NAME`: `fullchain`
- `SSL_KEY_NAME`: `privkey`

**Database & Security:**

- `POSTGRES_PASSWORD`: Strong password
- `REDIS_PASSWORD`: Strong password
- `JWT_SECRET`: 64-character secret
- `COOKIE_SECRET`: 32-character secret

**Application Secrets:**

- `RESEND_API_KEY`: Your email service key
- `RESEND_FROM_EMAIL`: Your sender email
- `S3_ACCESS_KEY_ID`: Storage access key
- `S3_SECRET_ACCESS_KEY`: Storage secret
- `S3_REGION`: Storage region
- `S3_BUCKET`: Storage bucket name
- `S3_ENDPOINT`: Storage endpoint
- `S3_FILE_URL`: Storage URL

**Company Information:**

- `COMPANY_NAME`: Your company name
- `COMPANY_ADDRESS`: Company address
- `COMPANY_POSTAL_CODE`: Postal code
- `COMPANY_CITY`: City
- `COMPANY_EMAIL`: Contact email
- `COMPANY_PHONE`: Phone number
- `COMPANY_TAX_ID`: Tax ID
- `COMPANY_BANK_INFO`: Bank information
- `PDF_FOOTER_TEXT`: PDF footer
- `EMAIL_SIGNATURE`: Email signature
- `EMAIL_FOOTER`: Email footer

### 4. DNS Configuration

Add these A records to your domain:

- `your-domain.com` → VPS IP
- `portainer.your-domain.com` → VPS IP
- `status.your-domain.com` → VPS IP

### 5. SSL Certificates

```bash
# On VPS as deploy user
sudo DOMAIN_NAME=your-domain.com SSL_EMAIL=admin@your-domain.com ./scripts/setup-ssl.sh
```

### 6. Deploy

Push to main branch or trigger GitHub Actions manually.

## 📁 File Structure

```
MedusaJS/
├── .github/workflows/
│   └── deploy.yml                          # CI/CD Pipeline
├── scripts/
│   ├── vps-setup.sh                        # VPS initialization
│   ├── setup-ssl.sh                        # SSL management
│   ├── setup-github-ssh.sh                 # SSH key setup
│   └── clean-vps.sh                        # VPS cleanup
├── busbasisberlin/
│   ├── infrastructure/
│   │   ├── docker-compose.infrastructure.yml  # Persistent services
│   │   ├── nginx-monitoring.conf              # Monitoring proxy
│   │   └── setup-infrastructure.sh            # Infrastructure startup
│   ├── scripts/
│   │   └── deploy-blue-green.sh               # Deployment logic
│   ├── docker-compose.blue.yml               # Blue deployment
│   ├── docker-compose.green.yml              # Green deployment
│   ├── nginx/
│   │   ├── nginx-blue.template               # Blue nginx config
│   │   ├── nginx-green.template              # Green nginx config
│   │   ├── nginx.conf                        # Active config
│   │   └── ssl/                              # SSL certificates
│   ├── Dockerfile                            # Application image
│   └── package.json                          # Application config
└── PRODUCTION_GUIDE.md                       # This guide
```

## 🔄 Deployment Process

### Automated Deployment (GitHub Actions)

1. **Trigger**: Push to `main` branch or manual trigger
2. **Pre-checks**: Validate changes and generate deployment ID
3. **SSH Setup**: Configure secure connection to VPS
4. **Infrastructure**: Ensure persistent services are running
5. **Blue-Green**: Deploy to inactive environment
6. **Health Check**: Verify new deployment health
7. **Traffic Switch**: Route traffic to new deployment
8. **Cleanup**: Stop old deployment and clean resources

### Manual Deployment

```bash
# On VPS as deploy user
cd /home/deploy/medusa/busbasisberlin

# Start infrastructure (if not running)
./infrastructure/setup-infrastructure.sh

# Deploy application
./scripts/deploy-blue-green.sh deploy

# Check status
./scripts/deploy-blue-green.sh status

# Rollback if needed
./scripts/deploy-blue-green.sh rollback
```

## 🏥 Health Checks & Monitoring

### Application Health

- **Endpoint**: `https://your-domain.com/health`
- **Checks**: Database, Redis, Application status
- **Timeout**: 5 minutes for deployment health checks

### Container Health

- **PostgreSQL**: `pg_isready` check every 10s
- **Redis**: `redis-cli ping` check every 10s
- **Nginx**: HTTP response check every 30s
- **Medusa**: `/health` endpoint check every 30s

### Monitoring Services

- **Portainer**: `https://portainer.your-domain.com`

  - Container management and monitoring
  - Resource usage tracking
  - Log aggregation

- **Uptime Kuma**: `https://status.your-domain.com`
  - Service availability monitoring
  - Status page for users
  - Alert notifications

## 🔒 Security Features

### SSL/TLS

- **Let's Encrypt**: Automatic certificate generation
- **Modern Protocols**: TLS 1.2+ only
- **HSTS**: HTTP Strict Transport Security
- **Security Headers**: XSS, CSRF, Content-Type protection

### Network Security

- **Firewall**: UFW with minimal open ports
- **Fail2Ban**: Intrusion prevention
- **Docker Networks**: Isolated container communication
- **Rate Limiting**: API endpoint protection

### Access Control

- **SSH Keys**: Key-based authentication only
- **Deploy User**: Dedicated deployment user
- **Sudo Access**: Passwordless for deployment tasks
- **Container Isolation**: Non-root container execution

## 🛠️ Troubleshooting

### Common Issues

**Deployment Fails**

```bash
# Check infrastructure
docker compose -f infrastructure/docker-compose.infrastructure.yml ps

# Check logs
docker compose -f infrastructure/docker-compose.infrastructure.yml logs

# Restart infrastructure
./infrastructure/setup-infrastructure.sh
```

**SSL Certificate Issues**

```bash
# Check certificates
ls -la nginx/ssl/

# Regenerate certificates
sudo ./scripts/setup-ssl.sh

# Check nginx config
docker compose -f infrastructure/docker-compose.infrastructure.yml exec nginx nginx -t
```

**Health Check Failures**

```bash
# Check application logs
docker logs medusa_backend_server_blue
docker logs medusa_backend_server_green

# Test health endpoint directly
curl -f http://localhost:9000/health
curl -f http://localhost:9002/health

# Check database connectivity
docker exec medusa_postgres pg_isready -U medusa
```

**Port Conflicts**

```bash
# Check what's using ports
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443

# Stop conflicting services
sudo systemctl stop nginx
sudo systemctl stop apache2
```

### Log Locations

- **Application Logs**: `docker logs <container_name>`
- **Nginx Logs**: `docker exec medusa_nginx cat /var/log/nginx/error.log`
- **System Logs**: `/var/log/syslog`
- **Deployment Logs**: GitHub Actions interface

### Recovery Procedures

**Complete System Recovery**

```bash
# Clean everything and start fresh
sudo ./scripts/clean-vps.sh
sudo ./scripts/vps-setup.sh
```

**Database Recovery**

```bash
# Backup database
docker exec medusa_postgres pg_dump -U medusa medusa > backup.sql

# Restore database
docker exec -i medusa_postgres psql -U medusa medusa < backup.sql
```

## 🔧 Maintenance

### Regular Tasks

**Weekly**

- Check SSL certificate expiry
- Review application logs
- Monitor disk space usage
- Update Docker images

**Monthly**

- Security updates: `apt update && apt upgrade`
- Clean old Docker images: `docker system prune`
- Review and rotate secrets
- Backup database

### Updates

**Application Updates**

- Push changes to main branch
- GitHub Actions handles deployment automatically
- Monitor deployment in Actions tab

**Infrastructure Updates**

```bash
# Update Docker images
docker compose -f infrastructure/docker-compose.infrastructure.yml pull
docker compose -f infrastructure/docker-compose.infrastructure.yml up -d
```

**System Updates**

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker
curl -fsSL https://get.docker.com | sh
```

## 📊 Performance Optimization

### Resource Limits

- **Server Container**: 1GB RAM, 0.5 CPU
- **Worker Container**: 512MB RAM, 0.25 CPU
- **Database**: Unlimited (adjust based on usage)
- **Redis**: Unlimited (typically low usage)

### Scaling Options

- **Vertical**: Increase VPS resources
- **Horizontal**: Add more VPS instances with load balancer
- **Database**: Use managed PostgreSQL service
- **Storage**: Use CDN for static assets

## 🆘 Support

### Getting Help

1. Check this guide first
2. Review GitHub Actions logs
3. Check container logs on VPS
4. Search GitHub Issues
5. Create new issue with logs

### Emergency Contacts

- **Rollback**: `./scripts/deploy-blue-green.sh rollback`
- **Status Page**: `https://status.your-domain.com`
- **Monitoring**: `https://portainer.your-domain.com`

---

## 📝 Quick Reference

### Essential Commands

```bash
# Deploy
./scripts/deploy-blue-green.sh deploy

# Check status
./scripts/deploy-blue-green.sh status

# Rollback
./scripts/deploy-blue-green.sh rollback

# View logs
docker logs medusa_backend_server_blue -f

# Restart infrastructure
./infrastructure/setup-infrastructure.sh

# SSL setup
sudo ./scripts/setup-ssl.sh
```

### Service URLs

- **Main App**: `https://your-domain.com`
- **Admin Panel**: `https://your-domain.com/app`
- **Health Check**: `https://your-domain.com/health`
- **Portainer**: `https://portainer.your-domain.com`
- **Status Page**: `https://status.your-domain.com`

### Important Paths

- **Project**: `/home/deploy/medusa`
- **SSL Certs**: `/home/deploy/medusa/busbasisberlin/nginx/ssl`
- **Logs**: `docker logs <container_name>`
- **Config**: `/home/deploy/medusa/busbasisberlin/nginx/nginx.conf`

---

_This guide covers the complete production deployment setup. For development setup, see the local development documentation._
