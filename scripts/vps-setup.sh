#!/bin/bash
# vps-setup.sh
# Complete VPS setup script for production-ready MedusaJS deployment
# Run as root: curl -sSL https://raw.githubusercontent.com/marlinjai/MedusaJS/main/scripts/vps-setup.sh | bash

set -euo pipefail

# Configuration
DOMAIN_NAME="${DOMAIN_NAME:-basiscamp-berlin.de}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
PROJECT_DIR="/home/${DEPLOY_USER}/medusa"
MONITORING_DIR="${PROJECT_DIR}/monitoring"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root"
fi

log "🚀 Starting VPS setup for production MedusaJS deployment"

# Update system
log "📦 Updating system packages..."
apt-get update && apt-get upgrade -y

# Install essential packages
log "🔧 Installing essential packages..."
apt-get install -y \
    curl \
    wget \
    git \
    htop \
    ufw \
    fail2ban \
    certbot \
    python3-certbot-nginx \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Install Docker
log "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
else
    log "Docker already installed"
fi

# Create deploy user
log "👤 Setting up deploy user..."
if ! id "$DEPLOY_USER" &>/dev/null; then
    useradd -m -s /bin/bash "$DEPLOY_USER"
    usermod -aG docker "$DEPLOY_USER"
    usermod -aG sudo "$DEPLOY_USER"
else
    log "Deploy user already exists"
fi

# Allow deploy user to run sudo without password
echo "${DEPLOY_USER} ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/${DEPLOY_USER}"
chmod 440 "/etc/sudoers.d/${DEPLOY_USER}"

# Setup SSH for deploy user
log "🔑 Setting up SSH access..."
mkdir -p "/home/${DEPLOY_USER}/.ssh"
chmod 700 "/home/${DEPLOY_USER}/.ssh"
touch "/home/${DEPLOY_USER}/.ssh/authorized_keys"
chmod 600 "/home/${DEPLOY_USER}/.ssh/authorized_keys"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh"

# Configure firewall
log "🔥 Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp  # Portainer
ufw allow 3001/tcp  # Uptime Kuma
ufw --force enable

# Configure fail2ban
log "🛡️ Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# Create project directories
log "📁 Creating project directories..."
mkdir -p "$PROJECT_DIR"
mkdir -p "$MONITORING_DIR"
mkdir -p "/home/${DEPLOY_USER}/ssl"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "/home/${DEPLOY_USER}"

# Setup SSL certificates
log "🔒 Setting up SSL certificates..."
if [ ! -f "/etc/letsencrypt/live/${DOMAIN_NAME}/fullchain.pem" ]; then
    warn "SSL certificates not found. Please run after DNS is configured:"
    warn "certbot certonly --standalone -d ${DOMAIN_NAME} -d portainer.${DOMAIN_NAME} -d uptime.${DOMAIN_NAME}"
    warn "Then copy certificates to /home/${DEPLOY_USER}/ssl/"
else
    log "SSL certificates found, copying to project directory..."
    cp "/etc/letsencrypt/live/${DOMAIN_NAME}/fullchain.pem" "/home/${DEPLOY_USER}/ssl/"
    cp "/etc/letsencrypt/live/${DOMAIN_NAME}/privkey.pem" "/home/${DEPLOY_USER}/ssl/"
    chown "${DEPLOY_USER}:${DEPLOY_USER}" "/home/${DEPLOY_USER}/ssl/"*
fi

# Create monitoring stack
log "📊 Setting up monitoring infrastructure..."
cat > "${MONITORING_DIR}/docker-compose.yml" << 'EOF'
# monitoring/docker-compose.yml
# Persistent monitoring infrastructure
version: '3.8'

services:
  # Portainer - Container Management
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: unless-stopped
    ports:
      - "3000:9000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    environment:
      - PORTAINER_HTTP_ENABLED=true
    networks:
      - monitoring

  # Uptime Kuma - Service Monitoring
  uptime-kuma:
    image: louislam/uptime-kuma:latest
    container_name: uptime-kuma
    restart: unless-stopped
    ports:
      - "3001:3001"
    volumes:
      - uptime_data:/app/data
    networks:
      - monitoring

  # Nginx - Reverse Proxy for Monitoring
  nginx-monitoring:
    image: nginx:alpine
    container_name: nginx-monitoring
    restart: unless-stopped
    ports:
      - "8080:80"
      - "8443:443"
    volumes:
      - ./nginx-monitoring.conf:/etc/nginx/nginx.conf:ro
      - /home/deploy/ssl:/etc/nginx/ssl:ro
    depends_on:
      - portainer
      - uptime-kuma
    networks:
      - monitoring

volumes:
  portainer_data:
  uptime_data:

networks:
  monitoring:
    driver: bridge
EOF

# Create monitoring nginx config
cat > "${MONITORING_DIR}/nginx-monitoring.conf" << 'EOF'
# nginx-monitoring.conf
# Reverse proxy for monitoring services with SSL
events {
    worker_connections 1024;
}

http {
    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;

    # MIME types
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Portainer
    server {
        listen 443 ssl;
        server_name portainer.DOMAIN_NAME;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        location / {
            proxy_pass http://portainer:9000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }

    # Uptime Kuma
    server {
        listen 443 ssl;
        server_name uptime.DOMAIN_NAME;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        location / {
            proxy_pass http://uptime-kuma:3001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }

    # HTTP redirects
    server {
        listen 80;
        server_name portainer.DOMAIN_NAME uptime.DOMAIN_NAME;
        return 301 https://$server_name$request_uri;
    }
}
EOF

# Replace DOMAIN_NAME placeholder
sed -i "s/DOMAIN_NAME/${DOMAIN_NAME}/g" "${MONITORING_DIR}/nginx-monitoring.conf"

chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "$MONITORING_DIR"

# Create systemd service for monitoring
log "⚙️ Creating monitoring service..."
cat > /etc/systemd/system/medusa-monitoring.service << EOF
[Unit]
Description=MedusaJS Monitoring Stack
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${MONITORING_DIR}
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0
User=${DEPLOY_USER}
Group=${DEPLOY_USER}

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable medusa-monitoring

log "✅ VPS setup completed successfully!"
log ""
log "📋 Next steps:"
log "1. Add your SSH public key to /home/${DEPLOY_USER}/.ssh/authorized_keys"
log "2. Configure DNS A records:"
log "   - ${DOMAIN_NAME} -> $(curl -s ifconfig.me)"
log "   - portainer.${DOMAIN_NAME} -> $(curl -s ifconfig.me)"
log "   - uptime.${DOMAIN_NAME} -> $(curl -s ifconfig.me)"
log "3. Run SSL certificate setup:"
log "   certbot certonly --standalone -d ${DOMAIN_NAME} -d portainer.${DOMAIN_NAME} -d uptime.${DOMAIN_NAME}"
log "4. Copy SSL certificates:"
log "   cp /etc/letsencrypt/live/${DOMAIN_NAME}/*.pem /home/${DEPLOY_USER}/ssl/"
log "5. Start monitoring stack:"
log "   systemctl start medusa-monitoring"
log "6. Clone your repository to ${PROJECT_DIR}"
log ""
log "🌐 Access URLs (after setup):"
log "   - Main app: https://${DOMAIN_NAME}"
log "   - Portainer: https://portainer.${DOMAIN_NAME}"
log "   - Uptime Kuma: https://uptime.${DOMAIN_NAME}"
