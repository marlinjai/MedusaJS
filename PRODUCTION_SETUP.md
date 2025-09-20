# Production Setup Guide

This guide provides step-by-step instructions for setting up a production-ready MedusaJS deployment with blue-green deployment, monitoring, and SSL automation.

## Architecture Overview

### Infrastructure Components

**Persistent Services (Always Running):**

- PostgreSQL database (shared between deployments)
- Redis cache (shared between deployments)
- Nginx load balancer (SSL termination & routing)
- Portainer (container management UI)
- Uptime Kuma (service monitoring)

**Blue-Green Application Layer:**

- Medusa backend (blue/green instances on ports 9000/9002)
- Medusa worker (blue/green instances on ports 9001/9003)

### Network Architecture

```
Internet → Nginx (443/80) → Blue/Green Medusa (9000/9002)
                          ↓
                    PostgreSQL (5432) + Redis (6379)
                          ↓
                    Monitoring Services
                    - Portainer (3000 → 8443)
                    - Uptime Kuma (3001 → 8443)
```

## Prerequisites

### VPS Requirements

- Ubuntu 20.04+ or Debian 11+
- 4GB RAM minimum (8GB recommended)
- 50GB storage minimum
- Root access
- Public IP address

### Domain Setup

Configure DNS A records pointing to your VPS IP:

- `basiscamp-berlin.de`
- `portainer.basiscamp-berlin.de`
- `uptime.basiscamp-berlin.de`

## Step 1: VPS Initial Setup

### 1.1 Run VPS Setup Script

```bash
# Download and run the VPS setup script
curl -sSL https://raw.githubusercontent.com/marlinjai/MedusaJS/main/scripts/vps-setup.sh | bash
```

This script will:

- Update system packages
- Install Docker, fail2ban, ufw firewall
- Create deploy user with proper permissions
- Configure firewall (ports 22, 80, 443, 3000, 3001)
- Set up monitoring infrastructure
- Create project directories

### 1.2 Generate SSH Keys for GitHub Actions

```bash
# Generate SSH key pair for GitHub Actions deployment
sudo ./scripts/setup-github-ssh.sh

# This will:
# - Generate an SSH key pair for the deploy user
# - Add the public key to authorized_keys
# - Display the private key for GitHub Secrets
# - Show all required GitHub Secrets configuration
```

**Important:** Copy the SSH private key output and save it for the GitHub Secrets setup in Step 4.

## Step 2: SSL Certificate Setup

### 2.1 Generate SSL Certificates

```bash
# Run SSL setup script as root
sudo DOMAIN_NAME=basiscamp-berlin.de SSL_EMAIL=admin@basiscamp-berlin.de ./scripts/setup-ssl.sh
```

This will:

- Install certbot
- Generate wildcard SSL certificates for your domain and subdomains
- Set up automatic renewal
- Copy certificates to the project directory

### 2.2 Verify SSL Setup

```bash
# Check certificate status
sudo ./scripts/setup-ssl.sh verify

# Check automatic renewal timer
sudo systemctl status ssl-renewal.timer
```

## Step 3: Clone Repository and Setup

### 3.1 Clone Repository

```bash
# Switch to deploy user
sudo su - deploy

# Clone repository
git clone https://github.com/marlinjai/MedusaJS.git medusa
cd medusa/busbasisberlin
```

### 3.2 Setup Infrastructure

```bash
# Set required environment variables
export DOMAIN_NAME="basiscamp-berlin.de"
export SSL_CERT_NAME="fullchain"
export SSL_KEY_NAME="privkey"
export POSTGRES_PASSWORD="your-secure-postgres-password"
export REDIS_PASSWORD="your-secure-redis-password"

# Start infrastructure services
./infrastructure/setup-infrastructure.sh
```

## Step 4: GitHub Secrets Configuration

Configure the following secrets in your GitHub repository:

### 4.1 VPS Connection

```
VPS_HOST=your-vps-ip-address
VPS_USER=deploy
SSH_PRIVATE_KEY=your-ssh-private-key
```

**Note:** The SSH_PRIVATE_KEY was generated in Step 1.2. Copy the entire private key content including the `-----BEGIN` and `-----END` lines.

### 4.2 Domain & SSL

```
DOMAIN_NAME=basiscamp-berlin.de
SSL_CERT_NAME=fullchain
SSL_KEY_NAME=privkey
```

### 4.3 Database & Cache

```
POSTGRES_PASSWORD=your-secure-postgres-password
REDIS_PASSWORD=your-secure-redis-password
```

### 4.4 Application Secrets

```
JWT_SECRET=your-jwt-secret-key
COOKIE_SECRET=your-cookie-secret-key
```

### 4.5 Email Configuration

```
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@basiscamp-berlin.de
```

### 4.6 S3 Storage

```
S3_ACCESS_KEY_ID=your-s3-access-key
S3_SECRET_ACCESS_KEY=your-s3-secret-key
S3_REGION=your-s3-region
S3_BUCKET=your-s3-bucket
S3_ENDPOINT=your-s3-endpoint
S3_FILE_URL=your-s3-file-url
```

### 4.7 Company Information

```
COMPANY_NAME=Your Company Name
COMPANY_ADDRESS=Your Address
COMPANY_POSTAL_CODE=12345
COMPANY_CITY=Your City
COMPANY_EMAIL=contact@basiscamp-berlin.de
COMPANY_PHONE=+49-xxx-xxxxxxx
COMPANY_TAX_ID=DE123456789
COMPANY_BANK_INFO=Your Bank Info
PDF_FOOTER_TEXT=Your PDF Footer
EMAIL_SIGNATURE=Your Email Signature
EMAIL_FOOTER=Your Email Footer
```

## Step 5: First Deployment

### 5.1 Trigger Deployment

Push to the main branch or manually trigger the GitHub Actions workflow:

```bash
# Manual trigger via GitHub UI
# Go to Actions → Production Blue-Green Deployment → Run workflow
```

### 5.2 Monitor Deployment

The deployment process includes:

1. Pre-deployment checks
2. SSH connection setup
3. Infrastructure verification
4. Blue-green deployment
5. Health checks
6. Service verification

## Step 6: Post-Deployment Setup

### 6.1 Configure Monitoring Services

**Portainer Setup:**

1. Visit `https://portainer.basiscamp-berlin.de`
2. Create admin account within 5 minutes
3. Configure container monitoring

**Uptime Kuma Setup:**

1. Visit `https://uptime.basiscamp-berlin.de`
2. Create admin account
3. Add monitoring for:
   - Main application: `https://basiscamp-berlin.de/health`
   - Admin panel: `https://basiscamp-berlin.de/app`

### 6.2 Verify Services

```bash
# Check all services are running
docker ps

# Check service health
curl -f https://basiscamp-berlin.de/health
curl -f https://portainer.basiscamp-berlin.de
curl -f https://uptime.basiscamp-berlin.de
```

## Operational Procedures

### Blue-Green Deployment Process

1. **Automatic Deployment:** Push to main branch triggers deployment
2. **Health Checks:** New deployment is health-checked before switching
3. **Traffic Switch:** Nginx routes traffic to healthy deployment
4. **Cleanup:** Old deployment is stopped after successful switch
5. **Rollback:** Automatic rollback on deployment failure

### Manual Operations

```bash
# SSH into VPS
ssh deploy@your-vps-ip

# Check deployment status
cd /home/deploy/medusa/busbasisberlin
./scripts/deploy-blue-green.sh status

# Manual rollback
./scripts/deploy-blue-green.sh rollback

# View logs
docker compose -f infrastructure/docker-compose.infrastructure.yml logs -f
docker logs medusa_backend_server_blue
docker logs medusa_backend_server_green
```

### SSL Certificate Management

```bash
# Check certificate status
sudo ./scripts/setup-ssl.sh info

# Manual renewal
sudo ./scripts/setup-ssl.sh renew

# Test renewal process
sudo certbot renew --dry-run
```

### Monitoring and Maintenance

**Daily Checks:**

- Service health via Uptime Kuma
- Container status via Portainer
- SSL certificate expiry
- Disk space usage

**Weekly Maintenance:**

- Review application logs
- Check for security updates
- Verify backup processes
- Monitor resource usage

**Monthly Tasks:**

- Update system packages
- Review and rotate logs
- Security audit
- Performance optimization

## Troubleshooting

### Common Issues

**Deployment Fails:**

1. Check GitHub Actions logs
2. Verify SSH connectivity
3. Check VPS disk space
4. Verify environment variables

**SSL Certificate Issues:**

1. Check DNS propagation
2. Verify port 80/443 accessibility
3. Check certbot logs: `/var/log/letsencrypt/`
4. Manually renew: `sudo certbot renew --force-renewal`

**Service Connectivity:**

1. Check firewall: `sudo ufw status`
2. Verify Docker networks: `docker network ls`
3. Check container logs: `docker logs <container-name>`
4. Test internal connectivity: `docker exec <container> curl <service>`

**Database Issues:**

1. Check PostgreSQL logs: `docker logs medusa_postgres`
2. Verify database connectivity: `docker exec medusa_postgres pg_isready`
3. Check disk space for database volume

### Emergency Procedures

**Complete System Recovery:**

1. SSH into VPS
2. Stop all services: `docker stop $(docker ps -aq)`
3. Restart infrastructure: `./infrastructure/setup-infrastructure.sh`
4. Trigger fresh deployment from GitHub Actions

**Database Recovery:**

1. Stop application containers
2. Backup database: `docker exec medusa_postgres pg_dump -U medusa medusa > backup.sql`
3. Restore if needed: `docker exec -i medusa_postgres psql -U medusa medusa < backup.sql`

## Security Considerations

### Firewall Configuration

- Only necessary ports are open (22, 80, 443, 3000, 3001)
- fail2ban protects against brute force attacks
- SSH key authentication only

### SSL/TLS Security

- TLS 1.2+ only
- Strong cipher suites
- HSTS headers
- Automatic certificate renewal

### Container Security

- Non-root user in containers
- Resource limits applied
- Regular image updates
- Network isolation

### Access Control

- Separate deploy user with minimal privileges
- SSH key authentication
- Monitoring service authentication
- Database password protection

## Performance Optimization

### Resource Allocation

- PostgreSQL: 2GB RAM, optimized for concurrent connections
- Redis: 512MB RAM, optimized for caching
- Application containers: 1GB RAM each
- Nginx: Minimal resources, optimized for proxy

### Caching Strategy

- Redis for session storage
- Nginx static file caching
- Application-level caching
- CDN for static assets (S3)

### Monitoring Metrics

- Response times
- Error rates
- Resource utilization
- Database performance
- SSL certificate expiry

## Backup Strategy

### Automated Backups

- Database: Daily PostgreSQL dumps
- Application data: S3 synchronization
- Configuration: Git repository
- SSL certificates: Automatic renewal

### Recovery Procedures

- Database restore from dumps
- Application redeployment from Git
- SSL certificate regeneration
- Infrastructure recreation from scripts

---

## Support and Maintenance

For issues or questions:

1. Check this documentation
2. Review GitHub Actions logs
3. Check service logs via Portainer
4. Monitor service status via Uptime Kuma

This setup provides a production-ready, scalable, and maintainable MedusaJS deployment with zero-downtime deployments and comprehensive monitoring.
