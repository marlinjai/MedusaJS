#!/bin/bash
# setup-backup-system.sh
# Sets up automated database backup system
# Installs AWS CLI, configures cron job, and sets up backup infrastructure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_SCRIPT="${SCRIPT_DIR}/backup-database.sh"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "This script must be run as root (use sudo)"
    exit 1
fi

log_info "Setting up automated database backup system..."

# Install AWS CLI if not present
log_info "Checking for AWS CLI..."
if ! command -v aws &> /dev/null; then
    log_info "Installing AWS CLI..."

    # Detect OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux installation
        if command -v apt-get &> /dev/null; then
            # Debian/Ubuntu
            apt-get update
            apt-get install -y unzip curl
            curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
            unzip -q /tmp/awscliv2.zip -d /tmp
            /tmp/aws/install
            rm -rf /tmp/aws /tmp/awscliv2.zip
        elif command -v yum &> /dev/null; then
            # RHEL/CentOS
            yum install -y unzip curl
            curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
            unzip -q /tmp/awscliv2.zip -d /tmp
            /tmp/aws/install
            rm -rf /tmp/aws /tmp/awscliv2.zip
        else
            log_error "Unsupported Linux distribution. Please install AWS CLI manually."
            exit 1
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS installation
        if command -v brew &> /dev/null; then
            brew install awscli
        else
            log_error "Homebrew not found. Please install AWS CLI manually: brew install awscli"
            exit 1
        fi
    else
        log_error "Unsupported operating system. Please install AWS CLI manually."
        exit 1
    fi

    log_success "AWS CLI installed successfully"
else
    log_success "AWS CLI already installed"
fi

# Verify AWS CLI installation
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI installation failed"
    exit 1
fi

# Make backup scripts executable
log_info "Making backup scripts executable..."
chmod +x "${SCRIPT_DIR}/backup-database.sh"
chmod +x "${SCRIPT_DIR}/restore-database.sh"
chmod +x "${SCRIPT_DIR}/verify-backup.sh"
log_success "Backup scripts are now executable"

# Create log directory
log_info "Creating log directory..."
mkdir -p /var/log/medusa
chown -R deploy:deploy /var/log/medusa 2>/dev/null || chown -R $(whoami):$(whoami) /var/log/medusa
log_success "Log directory created"

# Create temporary backup directory
log_info "Creating temporary backup directory..."
mkdir -p /tmp/medusa-backups
chmod 755 /tmp/medusa-backups
log_success "Temporary backup directory created"

# Set up log rotation for backup logs
log_info "Setting up log rotation..."
cat > /etc/logrotate.d/medusa-backups << 'EOF'
/var/log/medusa/backup.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 deploy deploy
    sharedscripts
    postrotate
        # Reload any services if needed
    endscript
}

/var/log/medusa/restore.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 deploy deploy
}

/var/log/medusa/verify.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 deploy deploy
}
EOF
log_success "Log rotation configured"

# Determine which user to run cron as
CRON_USER="deploy"
if ! id "$CRON_USER" &>/dev/null; then
    # Fall back to current user or root
    CRON_USER=$(whoami)
    if [[ "$CRON_USER" == "root" ]]; then
        log_warning "Running as root - consider creating a 'deploy' user for better security"
    fi
fi

log_info "Setting up cron job for user: $CRON_USER"

# Create wrapper script that loads environment variables
log_info "Creating backup wrapper script with environment loading..."
WRAPPER_SCRIPT="/usr/local/bin/medusa-backup-wrapper.sh"

# Find .env.production file
ENV_FILE="${PROJECT_DIR}/.env.production"
if [[ ! -f "$ENV_FILE" ]]; then
    ENV_FILE="${PROJECT_DIR}/.env"
fi

if [[ ! -f "$ENV_FILE" ]]; then
    log_warning "No .env.production or .env file found. Backup script will rely on system environment variables."
    ENV_FILE=""
fi

cat > "$WRAPPER_SCRIPT" << EOF
#!/bin/bash
# medusa-backup-wrapper.sh
# Wrapper script that loads environment variables and runs backup

# Load environment variables from .env file if it exists
if [[ -f "$ENV_FILE" ]]; then
    set -a
    source "$ENV_FILE"
    set +a
fi

# Run backup script
"$BACKUP_SCRIPT" >> /var/log/medusa/backup.log 2>&1
EOF

chmod +x "$WRAPPER_SCRIPT"
log_success "Backup wrapper script created: $WRAPPER_SCRIPT"

# Set up cron job (daily at 2 AM)
log_info "Setting up daily backup cron job (2 AM)..."
CRON_JOB="0 2 * * * $WRAPPER_SCRIPT"

# Check if cron job already exists
if crontab -u "$CRON_USER" -l 2>/dev/null | grep -q "$WRAPPER_SCRIPT"; then
    log_warning "Cron job already exists for $CRON_USER"
    log_info "Removing existing cron job..."
    crontab -u "$CRON_USER" -l 2>/dev/null | grep -v "$WRAPPER_SCRIPT" | crontab -u "$CRON_USER" - 2>/dev/null || true
fi

# Add new cron job
(crontab -u "$CRON_USER" -l 2>/dev/null; echo "$CRON_JOB") | crontab -u "$CRON_USER" -
log_success "Cron job configured for daily backups at 2 AM"

# Verify cron job was added
if crontab -u "$CRON_USER" -l 2>/dev/null | grep -q "$WRAPPER_SCRIPT"; then
    log_success "Cron job verified"
    log_info "Current cron jobs for $CRON_USER:"
    crontab -u "$CRON_USER" -l 2>/dev/null | grep -E "(backup|medusa)" || true
else
    log_error "Failed to add cron job"
    exit 1
fi

# Create systemd service as alternative (optional, for better logging and control)
log_info "Creating systemd service for backup (optional)..."
cat > /etc/systemd/system/medusa-backup.service << 'EOF'
[Unit]
Description=Medusa Database Backup
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
User=deploy
Group=deploy
EnvironmentFile=/opt/medusa-app/busbasisberlin/.env.production
ExecStart=/opt/medusa-app/busbasisberlin/scripts/backup-database.sh
StandardOutput=append:/var/log/medusa/backup.log
StandardError=append:/var/log/medusa/backup.log
EOF

cat > /etc/systemd/system/medusa-backup.timer << 'EOF'
[Unit]
Description=Daily Medusa Database Backup
Requires=medusa-backup.service

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Reload systemd and enable timer (but don't fail if systemd is not available)
if systemctl daemon-reload 2>/dev/null; then
    systemctl enable medusa-backup.timer 2>/dev/null || true
    log_info "Systemd timer created (optional - cron job is primary)"
else
    log_info "Systemd not available - using cron only"
fi

# Test backup script (dry run check)
log_info "Testing backup script configuration..."
if [[ -f "$BACKUP_SCRIPT" ]]; then
    # Check if script is executable and has correct shebang
    if head -n 1 "$BACKUP_SCRIPT" | grep -q "#!/bin/bash"; then
        log_success "Backup script is properly configured"
    else
        log_warning "Backup script may have issues (check shebang)"
    fi
else
    log_error "Backup script not found: $BACKUP_SCRIPT"
    exit 1
fi

# Summary
log_success "Backup system setup completed successfully!"
echo ""
log_info "Summary:"
echo "  - AWS CLI: $(command -v aws || echo 'Not found')"
echo "  - Backup script: $BACKUP_SCRIPT"
echo "  - Wrapper script: $WRAPPER_SCRIPT"
echo "  - Cron user: $CRON_USER"
echo "  - Backup schedule: Daily at 2:00 AM"
echo "  - Log directory: /var/log/medusa"
echo "  - Retention: 30 days"
echo ""
log_info "Next steps:"
echo "  1. Ensure S3 environment variables are set in .env.production:"
echo "     - S3_ACCESS_KEY_ID"
echo "     - S3_SECRET_ACCESS_KEY"
echo "     - S3_BUCKET"
echo "     - S3_ENDPOINT"
echo "     - S3_REGION"
echo "  2. Test backup manually: $BACKUP_SCRIPT"
echo "  3. Check logs: tail -f /var/log/medusa/backup.log"
echo "  4. Verify backups: ${SCRIPT_DIR}/verify-backup.sh --latest"
echo ""

