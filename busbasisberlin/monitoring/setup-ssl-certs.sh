#!/bin/bash
# busbasisberlin/monitoring/setup-ssl-certs.sh
# Copy wildcard SSL certificates to nginx ssl directory

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root (needed to access Let's Encrypt certs)
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root to access Let's Encrypt certificates"
   exit 1
fi

# Define paths
LETSENCRYPT_DIR="/etc/letsencrypt/live/basiscamp-berlin.de"
NGINX_SSL_DIR="/home/deploy/medusa/busbasisberlin/nginx/ssl"
CERT_NAME="basiscamp-berlin.de"

log_info "Setting up wildcard SSL certificates for monitoring subdomains..."

# Create nginx ssl directory if it doesn't exist
mkdir -p "$NGINX_SSL_DIR"

# Copy certificates
log_info "Copying wildcard certificate files..."

if [[ -f "$LETSENCRYPT_DIR/fullchain.pem" ]]; then
    cp "$LETSENCRYPT_DIR/fullchain.pem" "$NGINX_SSL_DIR/${CERT_NAME}.pem"
    log_success "Certificate copied: ${CERT_NAME}.pem"
else
    log_error "Certificate not found: $LETSENCRYPT_DIR/fullchain.pem"
    exit 1
fi

if [[ -f "$LETSENCRYPT_DIR/privkey.pem" ]]; then
    cp "$LETSENCRYPT_DIR/privkey.pem" "$NGINX_SSL_DIR/${CERT_NAME}-key.pem"
    log_success "Private key copied: ${CERT_NAME}-key.pem"
else
    log_error "Private key not found: $LETSENCRYPT_DIR/privkey.pem"
    exit 1
fi

# Set proper permissions
chown -R deploy:deploy "$NGINX_SSL_DIR"
chmod 644 "$NGINX_SSL_DIR/${CERT_NAME}.pem"
chmod 600 "$NGINX_SSL_DIR/${CERT_NAME}-key.pem"

log_success "SSL certificates set up successfully!"
log_info "Certificate: $NGINX_SSL_DIR/${CERT_NAME}.pem"
log_info "Private key: $NGINX_SSL_DIR/${CERT_NAME}-key.pem"
log_info "Wildcard certificate supports: *.basiscamp-berlin.de"
