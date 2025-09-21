#!/bin/bash
# setup-ssl.sh
# Script to set up SSL certificates for the domain

set -e

# Configuration
DOMAIN_NAME="${DOMAIN_NAME:-yourdomain.com}"
SSL_CERT_NAME="${SSL_CERT_NAME:-fullchain}"
SSL_KEY_NAME="${SSL_KEY_NAME:-privkey}"

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

log_info "🔒 Setting up SSL certificates for domain: $DOMAIN_NAME"

# Create SSL directory if it doesn't exist
mkdir -p nginx/ssl

# Check if certificates already exist
cert_file="nginx/ssl/${SSL_CERT_NAME}.pem"
key_file="nginx/ssl/${SSL_KEY_NAME}.pem"

if [[ -f "$cert_file" && -f "$key_file" ]]; then
    log_success "SSL certificates already exist"
    log_info "Certificate: $cert_file"
    log_info "Private Key: $key_file"

    # Fix permissions
    sudo chown deploy:deploy "$cert_file" "$key_file" 2>/dev/null || true
    chmod 600 "$cert_file" "$key_file" 2>/dev/null || true

    log_success "SSL certificates are ready"
    exit 0
fi

log_warning "SSL certificates not found!"
log_info "You need to provide SSL certificates for HTTPS to work."
log_info ""
log_info "Options to get SSL certificates:"
log_info "1. Let's Encrypt (recommended for production):"
log_info "   sudo apt install certbot"
log_info "   sudo certbot certonly --standalone -d $DOMAIN_NAME"
log_info "   sudo cp /etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem $cert_file"
log_info "   sudo cp /etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem $key_file"
log_info ""
log_info "2. Upload your own certificates:"
log_info "   scp your-cert.pem user@server:$cert_file"
log_info "   scp your-key.pem user@server:$key_file"
log_info ""
log_info "3. For development/testing, create self-signed certificates:"
log_info "   openssl req -x509 -newkey rsa:4096 -keyout $key_file -out $cert_file -days 365 -nodes -subj '/CN=$DOMAIN_NAME'"
log_info ""

# For development, offer to create self-signed certificates
if [[ "${NODE_ENV:-}" != "production" ]]; then
    log_warning "Creating self-signed certificates for development..."
    log_warning "⚠️  These are NOT secure for production use!"

    openssl req -x509 -newkey rsa:4096 -keyout "$key_file" -out "$cert_file" -days 365 -nodes -subj "/CN=$DOMAIN_NAME" 2>/dev/null

    # Fix permissions
    sudo chown deploy:deploy "$cert_file" "$key_file" 2>/dev/null || true
    chmod 600 "$cert_file" "$key_file" 2>/dev/null || true

    log_success "Self-signed certificates created for development"
    log_warning "⚠️  Replace with proper certificates for production!"
else
    log_error "SSL certificates are required for production deployment"
    exit 1
fi
