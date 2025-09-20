#!/bin/bash
# setup-ssl.sh
# Automated SSL certificate setup with Let's Encrypt

set -euo pipefail

# Configuration
DOMAIN_NAME="${DOMAIN_NAME:-basiscamp-berlin.de}"
EMAIL="${SSL_EMAIL:-admin@${DOMAIN_NAME}}"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN_NAME}"
PROJECT_SSL_DIR="/home/deploy/medusa/busbasisberlin/nginx/ssl"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root for SSL certificate management"
    fi
}

# Install certbot if not present
install_certbot() {
    if ! command -v certbot &> /dev/null; then
        log "📦 Installing certbot..."
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
    else
        log "✅ Certbot already installed"
    fi
}

# Stop any services using ports 80/443
stop_conflicting_services() {
    log "🛑 Stopping services that might conflict with certbot..."

    # Stop nginx if running
    if systemctl is-active --quiet nginx; then
        systemctl stop nginx
        log "Stopped system nginx"
    fi

    # Stop any Docker containers using ports 80/443
    if docker ps --format "table {{.Names}}\t{{.Ports}}" | grep -E ":80->|:443->"; then
        warn "Found Docker containers using ports 80/443. Stopping them temporarily..."
        docker ps --format "{{.Names}}" | xargs -r docker stop || true
    fi
}

# Start services after certificate generation
start_services() {
    log "▶️ Starting services..."

    # Start nginx if it was running
    if systemctl is-enabled --quiet nginx 2>/dev/null; then
        systemctl start nginx || warn "Could not start system nginx"
    fi
}

# Generate SSL certificates
generate_certificates() {
    log "🔒 Generating SSL certificates for ${DOMAIN_NAME}..."

    # Create certificate for main domain and subdomains
    local domains=(
        "$DOMAIN_NAME"
        "portainer.${DOMAIN_NAME}"
        "uptime.${DOMAIN_NAME}"
    )

    local domain_args=""
    for domain in "${domains[@]}"; do
        domain_args="$domain_args -d $domain"
    done

    # Generate certificate using standalone mode
    if certbot certonly \
        --standalone \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL" \
        --expand \
        $domain_args; then
        log "✅ SSL certificates generated successfully"
    else
        error "Failed to generate SSL certificates"
    fi
}

# Copy certificates to project directory
copy_certificates() {
    log "📋 Copying certificates to project directory..."

    # Create SSL directory if it doesn't exist
    mkdir -p "$PROJECT_SSL_DIR"

    # Copy certificates
    if [[ -f "${CERT_DIR}/fullchain.pem" && -f "${CERT_DIR}/privkey.pem" ]]; then
        cp "${CERT_DIR}/fullchain.pem" "${PROJECT_SSL_DIR}/fullchain.pem"
        cp "${CERT_DIR}/privkey.pem" "${PROJECT_SSL_DIR}/privkey.pem"

        # Set proper permissions
        chown deploy:deploy "${PROJECT_SSL_DIR}"/*.pem
        chmod 644 "${PROJECT_SSL_DIR}/fullchain.pem"
        chmod 600 "${PROJECT_SSL_DIR}/privkey.pem"

        log "✅ Certificates copied to project directory"
    else
        error "Certificate files not found in ${CERT_DIR}"
    fi
}

# Setup automatic renewal
setup_renewal() {
    log "🔄 Setting up automatic certificate renewal..."

    # Create renewal script
    cat > /usr/local/bin/renew-ssl-certs.sh << 'EOF'
#!/bin/bash
# Automatic SSL certificate renewal script

set -euo pipefail

DOMAIN_NAME="basiscamp-berlin.de"
PROJECT_SSL_DIR="/home/deploy/medusa/busbasisberlin/nginx/ssl"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN_NAME}"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Renew certificates
log "Checking for certificate renewal..."
if certbot renew --quiet --no-self-upgrade; then
    log "Certificate renewal check completed"

    # Copy updated certificates if they were renewed
    if [[ -f "${CERT_DIR}/fullchain.pem" && -f "${CERT_DIR}/privkey.pem" ]]; then
        cp "${CERT_DIR}/fullchain.pem" "${PROJECT_SSL_DIR}/fullchain.pem"
        cp "${CERT_DIR}/privkey.pem" "${PROJECT_SSL_DIR}/privkey.pem"

        # Set proper permissions
        chown deploy:deploy "${PROJECT_SSL_DIR}"/*.pem
        chmod 644 "${PROJECT_SSL_DIR}/fullchain.pem"
        chmod 600 "${PROJECT_SSL_DIR}/privkey.pem"

        # Reload nginx in Docker containers
        if docker ps --format "{{.Names}}" | grep -q nginx; then
            docker exec $(docker ps --format "{{.Names}}" | grep nginx | head -1) nginx -s reload || true
        fi

        log "Certificates updated and nginx reloaded"
    fi
else
    log "Certificate renewal failed"
    exit 1
fi
EOF

    chmod +x /usr/local/bin/renew-ssl-certs.sh

    # Create systemd service for renewal
    cat > /etc/systemd/system/ssl-renewal.service << EOF
[Unit]
Description=SSL Certificate Renewal
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/renew-ssl-certs.sh
User=root
EOF

    # Create systemd timer for automatic renewal
    cat > /etc/systemd/system/ssl-renewal.timer << EOF
[Unit]
Description=SSL Certificate Renewal Timer
Requires=ssl-renewal.service

[Timer]
OnCalendar=daily
RandomizedDelaySec=3600
Persistent=true

[Install]
WantedBy=timers.target
EOF

    # Enable and start the timer
    systemctl daemon-reload
    systemctl enable ssl-renewal.timer
    systemctl start ssl-renewal.timer

    log "✅ Automatic renewal configured"
}

# Verify certificates
verify_certificates() {
    log "🔍 Verifying SSL certificates..."

    local cert_file="${PROJECT_SSL_DIR}/fullchain.pem"
    local key_file="${PROJECT_SSL_DIR}/privkey.pem"

    if [[ -f "$cert_file" && -f "$key_file" ]]; then
        # Check certificate validity
        local expiry_date
        expiry_date=$(openssl x509 -in "$cert_file" -noout -enddate | cut -d= -f2)
        log "Certificate expires: $expiry_date"

        # Check if certificate matches private key
        local cert_hash
        local key_hash
        cert_hash=$(openssl x509 -in "$cert_file" -noout -modulus | openssl md5)
        key_hash=$(openssl rsa -in "$key_file" -noout -modulus | openssl md5)

        if [[ "$cert_hash" == "$key_hash" ]]; then
            log "✅ Certificate and private key match"
        else
            error "Certificate and private key do not match"
        fi

        # Check certificate domains
        log "Certificate domains:"
        openssl x509 -in "$cert_file" -noout -text | grep -A1 "Subject Alternative Name" | tail -1 | sed 's/DNS://g' | tr ',' '\n' | sed 's/^[[:space:]]*/  - /'

    else
        error "Certificate files not found"
    fi
}

# Display certificate information
show_certificate_info() {
    log "📋 SSL Certificate Information:"
    echo ""

    log "🔒 Certificate files:"
    log "   Fullchain: ${PROJECT_SSL_DIR}/fullchain.pem"
    log "   Private key: ${PROJECT_SSL_DIR}/privkey.pem"
    echo ""

    log "🔄 Automatic renewal:"
    log "   Service: ssl-renewal.service"
    log "   Timer: ssl-renewal.timer (daily)"
    log "   Script: /usr/local/bin/renew-ssl-certs.sh"
    echo ""

    log "🔍 Check renewal timer status:"
    log "   systemctl status ssl-renewal.timer"
    echo ""

    log "🧪 Test renewal:"
    log "   certbot renew --dry-run"
    echo ""
}

# Main function
main() {
    log "🚀 Starting SSL certificate setup..."

    check_root
    install_certbot
    stop_conflicting_services
    generate_certificates
    copy_certificates
    setup_renewal
    start_services
    verify_certificates
    show_certificate_info

    log "🎉 SSL certificate setup completed successfully!"
    log "🌐 Your domains are now secured with Let's Encrypt certificates"
    log "🔄 Certificates will be automatically renewed daily"
}

# Handle script arguments
case "${1:-setup}" in
    "setup")
        main
        ;;
    "renew")
        log "🔄 Manual certificate renewal..."
        /usr/local/bin/renew-ssl-certs.sh
        ;;
    "verify")
        verify_certificates
        ;;
    "info")
        show_certificate_info
        ;;
    *)
        echo "Usage: $0 [setup|renew|verify|info]"
        echo ""
        echo "Commands:"
        echo "  setup  - Initial SSL certificate setup (default)"
        echo "  renew  - Manual certificate renewal"
        echo "  verify - Verify existing certificates"
        echo "  info   - Show certificate information"
        exit 1
        ;;
esac
