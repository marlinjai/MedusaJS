#!/bin/bash
# setup-domain.sh
# Script to configure nginx for your custom domain

set -e

# Configuration
DOMAIN_NAME="${1:-yourdomain.com}"
SSL_CERT_NAME="${2:-fullchain}"
SSL_KEY_NAME="${3:-privkey}"

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

# Function to show usage
show_usage() {
    echo "Usage: $0 <domain> [ssl_cert_name] [ssl_key_name]"
    echo ""
    echo "Examples:"
    echo "  $0 api.yourdomain.com"
    echo "  $0 api.yourdomain.com fullchain privkey"
    echo "  $0 api.yourdomain.com server server-key"
    echo ""
    echo "Default SSL certificate names:"
    echo "  Certificate: fullchain.pem (Let's Encrypt format)"
    echo "  Private Key: privkey.pem (Let's Encrypt format)"
}

# Validate input
if [[ -z "$DOMAIN_NAME" || "$DOMAIN_NAME" == "yourdomain.com" ]]; then
    log_error "Please provide your actual domain name"
    show_usage
    exit 1
fi

log_info "Setting up nginx configuration for domain: $DOMAIN_NAME"
log_info "SSL Certificate: ${SSL_CERT_NAME}.pem"
log_info "SSL Private Key: ${SSL_KEY_NAME}.pem"

# Check if template files exist
if [[ ! -f "nginx/nginx-blue.template" || ! -f "nginx/nginx-green.template" ]]; then
    log_error "Template files not found. Please ensure nginx-blue.template and nginx-green.template exist."
    exit 1
fi

# Generate blue configuration
log_info "Generating nginx-blue.conf..."
export DOMAIN_NAME SSL_CERT_NAME SSL_KEY_NAME
envsubst '${DOMAIN_NAME} ${SSL_CERT_NAME} ${SSL_KEY_NAME}' < nginx/nginx-blue.template > nginx/nginx-blue.conf

# Generate green configuration
log_info "Generating nginx-green.conf..."
envsubst '${DOMAIN_NAME} ${SSL_CERT_NAME} ${SSL_KEY_NAME}' < nginx/nginx-green.template > nginx/nginx-green.conf

log_success "Nginx configurations generated successfully!"

# Show next steps
echo ""
log_info "Next steps:"
echo "1. Set up DNS A record: $DOMAIN_NAME → Your VPS IP"
echo "2. Get SSL certificates:"
echo "   - Let's Encrypt: certbot certonly --standalone -d $DOMAIN_NAME"
echo "   - Copy certificates to nginx/ssl/ directory"
echo "3. Update your environment variables:"
echo "   - MEDUSA_BACKEND_URL=https://$DOMAIN_NAME"
echo "   - MEDUSA_ADMIN_URL=https://$DOMAIN_NAME/app"
echo "4. Deploy: npm run deploy"

# Verify SSL certificate paths
echo ""
log_warning "Make sure these SSL certificate files exist:"
echo "  nginx/ssl/${SSL_CERT_NAME}.pem"
echo "  nginx/ssl/${SSL_KEY_NAME}.pem"
