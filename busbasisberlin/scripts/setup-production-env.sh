#!/bin/bash
# setup-production-env.sh
# Creates production environment file with proper domain configuration

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

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

log_info "Setting up production environment configuration..."

# Required environment variables for production
REQUIRED_VARS=(
    "DOMAIN_NAME"
    "POSTGRES_PASSWORD"
    "JWT_SECRET"
    "COOKIE_SECRET"
    "RESEND_API_KEY"
    "RESEND_FROM_EMAIL"
    "S3_ACCESS_KEY_ID"
    "S3_SECRET_ACCESS_KEY"
    "S3_REGION"
    "S3_BUCKET"
    "S3_ENDPOINT"
    "S3_FILE_URL"
    "COMPANY_NAME"
    "COMPANY_ADDRESS"
    "COMPANY_POSTAL_CODE"
    "COMPANY_CITY"
    "COMPANY_EMAIL"
    "COMPANY_PHONE"
    "COMPANY_TAX_ID"
    "COMPANY_BANK_INFO"
    "PDF_FOOTER_TEXT"
    "EMAIL_SIGNATURE"
    "EMAIL_FOOTER"
)

# Check if all required variables are set
for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var}" ]]; then
        log_error "Required environment variable $var is not set"
        exit 1
    fi
done

# Create production environment file from GitHub Secrets
ENV_FILE="$PROJECT_DIR/.env.production"

log_info "Creating production environment file: $ENV_FILE"

# Create production environment file from scratch
cat > "$ENV_FILE" << EOF
# Production Environment Configuration
# Generated on $(date)

# Basic Configuration
MEDUSA_ADMIN_ONBOARDING_TYPE=nextjs
NODE_ENV=production
MEDUSA_WORKER_MODE=server
DISABLE_MEDUSA_ADMIN=false

# Domain Configuration
DOMAIN_NAME=$DOMAIN_NAME

# CORS Configuration (Production domain)
STORE_CORS=https://$DOMAIN_NAME/,https://docs.medusajs.com
ADMIN_CORS=https://$DOMAIN_NAME/,https://docs.medusajs.com
AUTH_CORS=https://$DOMAIN_NAME/,https://docs.medusajs.com

# Backend URL (CRITICAL for admin authentication)
MEDUSA_BACKEND_URL=https://$DOMAIN_NAME/

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Security Secrets
JWT_SECRET=$JWT_SECRET
COOKIE_SECRET=$COOKIE_SECRET

# Database Configuration
DATABASE_URL=postgres://postgres:$POSTGRES_PASSWORD@localhost/medusa-busbasisberlin
DB_NAME=medusa-busbasisberlin

# Supabase S3-Compatible Storage Configuration
S3_FILE_URL=$S3_FILE_URL
S3_ACCESS_KEY_ID=$S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY=$S3_SECRET_ACCESS_KEY
S3_REGION=$S3_REGION
S3_BUCKET=$S3_BUCKET
S3_ENDPOINT=$S3_ENDPOINT

# Email Configuration
RESEND_API_KEY=$RESEND_API_KEY
RESEND_FROM_EMAIL=$RESEND_FROM_EMAIL

# Company Information (for PDF generation and emails)
COMPANY_NAME=$COMPANY_NAME
COMPANY_ADDRESS=$COMPANY_ADDRESS
COMPANY_POSTAL_CODE=$COMPANY_POSTAL_CODE
COMPANY_CITY=$COMPANY_CITY
COMPANY_EMAIL=$COMPANY_EMAIL

# Additional Company Details
COMPANY_PHONE=$COMPANY_PHONE
COMPANY_WEBSITE=https://$DOMAIN_NAME
COMPANY_TAX_ID=$COMPANY_TAX_ID
COMPANY_BANK_INFO=$COMPANY_BANK_INFO

# PDF Template Customization
PDF_LOGO_URL=https://$DOMAIN_NAME/logo.png
PDF_FOOTER_TEXT=$PDF_FOOTER_TEXT
PDF_TERMS_CONDITIONS=https://$DOMAIN_NAME/terms
PDF_PRIVACY_POLICY=https://$DOMAIN_NAME/privacy

# Email Template Customization
EMAIL_SIGNATURE=$EMAIL_SIGNATURE
EMAIL_FOOTER=$EMAIL_FOOTER

# Storefront Configuration
MEDUSA_ADMIN_ONBOARDING_NEXTJS_DIRECTORY=busbasisberlin-storefront
EOF

log_success "Production environment file created successfully"

# Update docker-compose files to use production env
log_info "Updating docker-compose files to use production environment..."

# Update base compose file
if [[ -f "$PROJECT_DIR/docker-compose.base.yml" ]]; then
    # Create backup
    cp "$PROJECT_DIR/docker-compose.base.yml" "$PROJECT_DIR/docker-compose.base.yml.backup"

    # Update env_file references
    sed -i 's/\.env\.docker/.env.production/g' "$PROJECT_DIR/docker-compose.base.yml"
fi

# Update blue compose file
if [[ -f "$PROJECT_DIR/docker-compose.blue.yml" ]]; then
    cp "$PROJECT_DIR/docker-compose.blue.yml" "$PROJECT_DIR/docker-compose.blue.yml.backup"
    sed -i 's/\.env\.docker/.env.production/g' "$PROJECT_DIR/docker-compose.blue.yml"
fi

# Update green compose file
if [[ -f "$PROJECT_DIR/docker-compose.green.yml" ]]; then
    cp "$PROJECT_DIR/docker-compose.green.yml" "$PROJECT_DIR/docker-compose.green.yml.backup"
    sed -i 's/\.env\.docker/.env.production/g' "$PROJECT_DIR/docker-compose.green.yml"
fi

log_success "Docker compose files updated to use production environment"

# Set proper permissions
chmod 600 "$ENV_FILE"

log_success "Production environment setup completed!"
log_info "Environment file: $ENV_FILE"
log_info "Domain: $DOMAIN_NAME"
log_info "Backend URL: https://$DOMAIN_NAME/"

echo ""
echo "Next steps:"
echo "1. Verify the environment configuration"
echo "2. Run domain setup: ./scripts/setup-domain.sh"
echo "3. Deploy: ./scripts/deploy-with-domain.sh"
