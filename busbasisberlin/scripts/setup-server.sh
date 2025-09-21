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
if [ -n "$SUDO_USER" ]; then
    usermod -aG docker $SUDO_USER
    echo "✅ Added $SUDO_USER to docker group"
else
    echo "ℹ️ Running as root - skipping user group addition"
fi

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create project directory
echo "📁 Creating project directory..."
PROJECT_DIR="/opt/medusa-app"
mkdir -p $PROJECT_DIR
if [ -n "$SUDO_USER" ]; then
    chown $SUDO_USER:$SUDO_USER $PROJECT_DIR
else
    # Running as root, keep root ownership
    chown root:root $PROJECT_DIR
fi

# Clone repository if it doesn't exist
echo "📥 Cloning repository..."
if [ ! -d "$PROJECT_DIR/.git" ]; then
    cd $PROJECT_DIR
    git clone https://github.com/marlinjai/MedusaJS.git .
    if [ -n "$SUDO_USER" ]; then
        chown -R $SUDO_USER:$SUDO_USER $PROJECT_DIR
    else
        chown -R root:root $PROJECT_DIR
    fi
    echo "✅ Repository cloned successfully"
else
    echo "✅ Repository already exists"
fi

# Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x $PROJECT_DIR/busbasisberlin/scripts/*.sh

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
if [ -n "$SUDO_USER" ]; then
    USER_HOME="/home/$SUDO_USER"
    SSH_USER="$SUDO_USER"
else
    USER_HOME="/root"
    SSH_USER="root"
fi

# Ensure .ssh directory exists
mkdir -p "$USER_HOME/.ssh"
if [ -n "$SUDO_USER" ]; then
    chown $SUDO_USER:$SUDO_USER "$USER_HOME/.ssh"
fi

if [ ! -f "$USER_HOME/.ssh/id_rsa" ]; then
    if [ -n "$SUDO_USER" ]; then
        sudo -u $SUDO_USER ssh-keygen -t rsa -b 4096 -f "$USER_HOME/.ssh/id_rsa" -N ""
    else
        ssh-keygen -t rsa -b 4096 -f "$USER_HOME/.ssh/id_rsa" -N ""
    fi
    echo "✅ SSH key generated"
    echo "📋 Private key (add this to GitHub repository secrets as SSH_PRIVATE_KEY):"
    echo "=========================================="
    cat "$USER_HOME/.ssh/id_rsa"
    echo "=========================================="
else
    echo "✅ SSH key already exists"
    echo "📋 Private key (add this to GitHub repository secrets as SSH_PRIVATE_KEY):"
    echo "=========================================="
    cat "$USER_HOME/.ssh/id_rsa"
    echo "=========================================="
fi

# Create deployment user (optional)
echo "👤 Creating deployment user..."
useradd -m -s /bin/bash medusa-deploy || true
usermod -aG docker medusa-deploy

# Set up sudo access for deployment user
echo "medusa-deploy ALL=(ALL) NOPASSWD: /usr/local/bin/docker-compose, /usr/bin/docker" >> /etc/sudoers


echo "✅ Server setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Add the SSH public key to your GitHub repository secrets"
echo "2. Clone your repository to /opt/medusa-app"
echo "3. Configure GitHub secrets"
echo "4. Push to main branch to trigger deployment"
echo ""
echo "📖 See /opt/medusa-app/DEPLOYMENT_INSTRUCTIONS.md for detailed instructions"