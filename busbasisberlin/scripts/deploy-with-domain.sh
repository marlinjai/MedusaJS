#!/bin/bash
# deploy-with-domain.sh
# Enhanced deployment script that handles domain configuration

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


# Function to generate nginx configurations
generate_nginx_configs() {
    log_info "Generating nginx configurations for domain: $DOMAIN_NAME"

    # Check if templates exist
    if [[ ! -f "nginx/nginx-blue.template" || ! -f "nginx/nginx-green.template" ]]; then
        log_error "Nginx template files not found!"
        return 1
    fi

    # Generate configurations
    export DOMAIN_NAME SSL_CERT_NAME SSL_KEY_NAME
    envsubst '${DOMAIN_NAME} ${SSL_CERT_NAME} ${SSL_KEY_NAME}' < nginx/nginx-blue.template > nginx/nginx-blue.conf
    envsubst '${DOMAIN_NAME} ${SSL_CERT_NAME} ${SSL_KEY_NAME}' < nginx/nginx-green.template > nginx/nginx-green.conf

    log_success "Nginx configurations generated"
}

# Function to verify SSL certificates
verify_ssl_certs() {
    local cert_file="nginx/ssl/${SSL_CERT_NAME}.pem"
    local key_file="nginx/ssl/${SSL_KEY_NAME}.pem"

    if [[ ! -f "$cert_file" ]]; then
        log_error "SSL certificate not found: $cert_file"
        return 1
    fi

    if [[ ! -f "$key_file" ]]; then
        log_error "SSL private key not found: $key_file"
        return 1
    fi

    log_success "SSL certificates verified"
}

# Check required environment variables
required_vars=(
    "POSTGRES_PASSWORD"
    "JWT_SECRET"
    "COOKIE_SECRET"
    "RESEND_API_KEY"
    "RESEND_FROM_EMAIL"
    "DOMAIN_NAME"
)

for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        log_error "$var is not set"
        exit 1
    fi
done

# Main deployment process
log_info "Starting deployment for domain: $DOMAIN_NAME"

# Generate nginx configurations
generate_nginx_configs

# Verify SSL certificates
verify_ssl_certs

# Deploy using the main deployment script
# Pass environment variables explicitly to the deployment script
env DOMAIN_NAME="$DOMAIN_NAME" \
    SSL_CERT_NAME="$SSL_CERT_NAME" \
    SSL_KEY_NAME="$SSL_KEY_NAME" \
    POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
    JWT_SECRET="$JWT_SECRET" \
    COOKIE_SECRET="$COOKIE_SECRET" \
    RESEND_API_KEY="$RESEND_API_KEY" \
    RESEND_FROM_EMAIL="$RESEND_FROM_EMAIL" \
    S3_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID" \
    S3_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY" \
    S3_REGION="$S3_REGION" \
    S3_BUCKET="$S3_BUCKET" \
    S3_ENDPOINT="$S3_ENDPOINT" \
    S3_FILE_URL="$S3_FILE_URL" \
    COMPANY_NAME="$COMPANY_NAME" \
    COMPANY_ADDRESS="$COMPANY_ADDRESS" \
    COMPANY_POSTAL_CODE="$COMPANY_POSTAL_CODE" \
    COMPANY_CITY="$COMPANY_CITY" \
    COMPANY_EMAIL="$COMPANY_EMAIL" \
    COMPANY_PHONE="$COMPANY_PHONE" \
    COMPANY_TAX_ID="$COMPANY_TAX_ID" \
    COMPANY_BANK_INFO="$COMPANY_BANK_INFO" \
    PDF_FOOTER_TEXT="$PDF_FOOTER_TEXT" \
    EMAIL_SIGNATURE="$EMAIL_SIGNATURE" \
    EMAIL_FOOTER="$EMAIL_FOOTER" \
    MEDUSA_BACKEND_URL="$MEDUSA_BACKEND_URL" \
    STRIPE_API_KEY="$STRIPE_API_KEY" \
    STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET" \
    MEILISEARCH_HOST="$MEILISEARCH_HOST" \
    MEILISEARCH_API_KEY="$MEILISEARCH_API_KEY" \
    MEILISEARCH_MASTER_KEY="$MEILISEARCH_MASTER_KEY" \
    MEILISEARCH_PRODUCT_INDEX_NAME="$MEILISEARCH_PRODUCT_INDEX_NAME" \
    ./scripts/deploy.sh deploy
