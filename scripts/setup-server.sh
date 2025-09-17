#!/bin/bash

# One-time server setup script for Medusa Docker deployment
# This script should be run ONCE on your VPS to prepare it for automated deployments

set -e

echo "🚀 Setting up VPS for automated Medusa deployment..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)"
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install required packages
echo "📦 Installing required packages..."
apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Add user to docker group
echo "👤 Adding user to docker group..."
usermod -aG docker $SUDO_USER

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create project directory
echo "📁 Creating project directory..."
PROJECT_DIR="/opt/medusa-app"
mkdir -p $PROJECT_DIR
chown $SUDO_USER:$SUDO_USER $PROJECT_DIR

# Configure firewall (optional)
echo "🔥 Configuring firewall..."
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Create systemd service for auto-start (optional)
echo "⚙️ Creating systemd service..."
cat > /etc/systemd/system/medusa-docker.service << 'EOF'
[Unit]
Description=Medusa Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/medusa-app
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Enable service
systemctl enable medusa-docker.service

# Create log directory
echo "📝 Creating log directory..."
mkdir -p /var/log/medusa
chown $SUDO_USER:$SUDO_USER /var/log/medusa

# Create backup directory
echo "💾 Creating backup directory..."
mkdir -p /opt/medusa-backups
chown $SUDO_USER:$SUDO_USER /opt/medusa-backups

# Set up log rotation
echo "📋 Setting up log rotation..."
cat > /etc/logrotate.d/medusa << 'EOF'
/var/log/medusa/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 medusa medusa
}
EOF

# Create monitoring script
echo "📊 Creating monitoring script..."
cat > /opt/medusa-app/monitor.sh << 'EOF'
#!/bin/bash

# Simple monitoring script for Medusa deployment

LOG_FILE="/var/log/medusa/monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Check if containers are running
if ! docker-compose ps | grep -q "Up"; then
    echo "[$DATE] ERROR: Some containers are not running" >> $LOG_FILE
    # You can add notification here (email, Slack, etc.)
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "[$DATE] WARNING: Disk usage is ${DISK_USAGE}%" >> $LOG_FILE
fi

# Check memory usage
MEM_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEM_USAGE -gt 80 ]; then
    echo "[$DATE] WARNING: Memory usage is ${MEM_USAGE}%" >> $LOG_FILE
fi

echo "[$DATE] Health check completed" >> $LOG_FILE
EOF

chmod +x /opt/medusa-app/monitor.sh

# Set up cron job for monitoring
echo "⏰ Setting up monitoring cron job..."
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/medusa-app/monitor.sh") | crontab -

# Create backup script
echo "💾 Creating backup script..."
cat > /opt/medusa-app/backup.sh << 'EOF'
#!/bin/bash

# Backup script for Medusa deployment

BACKUP_DIR="/opt/medusa-backups"
DATE=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILE="medusa_backup_$DATE.sql"

echo "Creating backup: $BACKUP_FILE"

# Create database backup
docker-compose exec -T postgres pg_dump -U medusa medusa > $BACKUP_DIR/$BACKUP_FILE

# Compress backup
gzip $BACKUP_DIR/$BACKUP_FILE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "medusa_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
EOF

chmod +x /opt/medusa-app/backup.sh

# Set up daily backup cron job
echo "⏰ Setting up backup cron job..."
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/medusa-app/backup.sh") | crontab -

# Create SSH key for GitHub Actions
echo "🔑 Setting up SSH key for GitHub Actions..."
if [ ! -f /home/$SUDO_USER/.ssh/id_rsa ]; then
    sudo -u $SUDO_USER ssh-keygen -t rsa -b 4096 -f /home/$SUDO_USER/.ssh/id_rsa -N ""
    echo "✅ SSH key generated"
    echo "📋 Public key (add this to GitHub repository secrets as SSH_PRIVATE_KEY):"
    echo "=========================================="
    cat /home/$SUDO_USER/.ssh/id_rsa
    echo "=========================================="
else
    echo "✅ SSH key already exists"
fi

# Create deployment user (optional)
echo "👤 Creating deployment user..."
useradd -m -s /bin/bash medusa-deploy || true
usermod -aG docker medusa-deploy

# Set up sudo access for deployment user
echo "medusa-deploy ALL=(ALL) NOPASSWD: /usr/local/bin/docker-compose, /usr/bin/docker" >> /etc/sudoers

# Create deployment instructions
echo "📋 Creating deployment instructions..."
cat > /opt/medusa-app/DEPLOYMENT_INSTRUCTIONS.md << 'EOF'
# VPS Setup Complete! 🎉

## Next Steps:

### 1. Add GitHub Secrets
Go to your GitHub repository → Settings → Secrets and add:

**Required Secrets:**
- `HOST`: Your VPS IP address
- `SSH_USER`: Your VPS username (or medusa-deploy)
- `SSH_PRIVATE_KEY`: The SSH private key (see above)
- `PROJECT_PATH`: /opt/medusa-app

**Environment Secrets:**
- `POSTGRES_PASSWORD`: Secure PostgreSQL password
- `REDIS_PASSWORD`: Secure Redis password
- `JWT_SECRET`: Secure JWT secret
- `COOKIE_SECRET`: Secure cookie secret
- `S3_ACCESS_KEY_ID`: Your S3 access key
- `S3_SECRET_ACCESS_KEY`: Your S3 secret key
- `S3_BUCKET`: Your S3 bucket name
- `S3_REGION`: Your S3 region
- `S3_ENDPOINT`: Your S3 endpoint
- `RESEND_API_KEY`: Your Resend API key
- `RESEND_FROM_EMAIL`: Your sender email

**CORS Settings:**
- `STORE_CORS`: Your storefront URL
- `ADMIN_CORS`: Your admin URL
- `AUTH_CORS`: Your auth URLs
- `MEDUSA_BACKEND_URL`: Your backend URL
- `NEXT_PUBLIC_MEDUSA_BACKEND_URL`: Your backend URL

### 2. Clone Repository
```bash
cd /opt/medusa-app
git clone YOUR_REPOSITORY_URL .
```

### 3. Test Deployment
Push to main branch or manually trigger GitHub Actions workflow.

### 4. Monitor Deployment
- Check logs: `docker-compose logs -f`
- Monitor health: `curl http://localhost/health`
- View backups: `ls /opt/medusa-backups`

### 5. Useful Commands
```bash
# View all logs
docker-compose logs -f

# Restart services
docker-compose restart

# View resource usage
docker stats

# Create manual backup
./backup.sh

# Check monitoring logs
tail -f /var/log/medusa/monitor.log
```

## Security Notes:
- Change default passwords
- Configure SSL certificates
- Set up firewall rules
- Regular security updates
- Monitor access logs
EOF

echo "✅ Server setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Add the SSH public key to your GitHub repository secrets"
echo "2. Clone your repository to /opt/medusa-app"
echo "3. Configure GitHub secrets"
echo "4. Push to main branch to trigger deployment"
echo ""
echo "📖 See /opt/medusa-app/DEPLOYMENT_INSTRUCTIONS.md for detailed instructions"