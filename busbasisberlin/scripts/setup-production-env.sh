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
# Note: S3 variables are required for backup system
REQUIRED_VARS=(
    "DOMAIN_NAME"
    "POSTGRES_PASSWORD"
    "REDIS_PASSWORD"
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
# Log which variables are missing for debugging
missing_vars=()
for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var}" ]]; then
		missing_vars+=("$var")
    fi
done

if [[ ${#missing_vars[@]} -gt 0 ]]; then
	log_error "Required environment variables are not set:"
	for var in "${missing_vars[@]}"; do
		log_error "  - $var"
	done
	log_error ""
	log_error "This script requires all variables to be set. Please check:"
	log_error "1. GitHub Secrets are configured"
	log_error "2. Variables are passed in the workflow envs parameter"
	log_error "3. Variables are exported before this script runs"
	exit 1
fi

# Create production environment file from GitHub Secrets
ENV_FILE="$PROJECT_DIR/.env.production"

log_info "Creating production environment file: $ENV_FILE"

# Function to safely quote environment variable values
# This prevents bash from interpreting special characters as commands
quote_value() {
    local value="$1"
    # If value contains spaces, special chars, or starts with a number, quote it
    if [[ "$value" =~ [[:space:]] ]] || [[ "$value" =~ [^a-zA-Z0-9_./:@=+-] ]] || [[ "$value" =~ ^[0-9] ]]; then
        # Escape single quotes and wrap in single quotes
        echo "'${value//\'/\'\"\'\"\'}'"
    else
        echo "$value"
    fi
}

# Create production environment file from scratch
# All values are properly quoted to prevent bash interpretation errors
cat > "$ENV_FILE" << EOF
# Production Environment Configuration
# Generated on $(date)

# Basic Configuration
MEDUSA_ADMIN_ONBOARDING_TYPE=nextjs
NODE_ENV=production
MEDUSA_WORKER_MODE=server
DISABLE_MEDUSA_ADMIN=false

# Domain Configuration
DOMAIN_NAME=$(quote_value "$DOMAIN_NAME")

# CORS Configuration (Production domain)
STORE_CORS=$(quote_value "https://$DOMAIN_NAME/,https://docs.medusajs.com")
ADMIN_CORS=$(quote_value "https://$DOMAIN_NAME/,https://docs.medusajs.com")
AUTH_CORS=$(quote_value "https://$DOMAIN_NAME/,https://docs.medusajs.com")

# Backend URL (CRITICAL for admin authentication)
MEDUSA_BACKEND_URL=$(quote_value "https://$DOMAIN_NAME/")

# Redis Configuration (with password authentication)
# REDIS_PASSWORD is quoted for .env safety, REDIS_URL is quoted as a whole
REDIS_PASSWORD_QUOTED=$(quote_value "$REDIS_PASSWORD")
REDIS_URL_VALUE="redis://default:${REDIS_PASSWORD}@redis:6379"
REDIS_PASSWORD=$REDIS_PASSWORD_QUOTED
REDIS_URL=$(quote_value "$REDIS_URL_VALUE")

# Security Secrets
JWT_SECRET=$(quote_value "$JWT_SECRET")
COOKIE_SECRET=$(quote_value "$COOKIE_SECRET")

# Database Configuration
DATABASE_URL=$(quote_value "postgres://postgres:$POSTGRES_PASSWORD@localhost/medusa-busbasisberlin")
DB_NAME=medusa-busbasisberlin
POSTGRES_DB=medusa-store
POSTGRES_USER=postgres

# Supabase S3-Compatible Storage Configuration
S3_FILE_URL=$(quote_value "$S3_FILE_URL")
S3_ACCESS_KEY_ID=$(quote_value "$S3_ACCESS_KEY_ID")
S3_SECRET_ACCESS_KEY=$(quote_value "$S3_SECRET_ACCESS_KEY")
S3_REGION=$(quote_value "$S3_REGION")
S3_BUCKET=$(quote_value "$S3_BUCKET")
S3_ENDPOINT=$(quote_value "$S3_ENDPOINT")

# Email Configuration
RESEND_API_KEY=$(quote_value "$RESEND_API_KEY")
RESEND_FROM_EMAIL=$(quote_value "$RESEND_FROM_EMAIL")

# Company Information (for PDF generation and emails)
COMPANY_NAME=$(quote_value "$COMPANY_NAME")
COMPANY_ADDRESS=$(quote_value "$COMPANY_ADDRESS")
COMPANY_POSTAL_CODE=$(quote_value "$COMPANY_POSTAL_CODE")
COMPANY_CITY=$(quote_value "$COMPANY_CITY")
COMPANY_EMAIL=$(quote_value "$COMPANY_EMAIL")

# Additional Company Details
COMPANY_PHONE=$(quote_value "$COMPANY_PHONE")
COMPANY_TAX_ID=$(quote_value "$COMPANY_TAX_ID")
COMPANY_BANK_INFO=$(quote_value "$COMPANY_BANK_INFO")

# PDF Template Customization
# Logo URL wird aus COMPANY_LOGO_URL verwendet (siehe Company Information oben)
PDF_FOOTER_TEXT=$(quote_value "$PDF_FOOTER_TEXT")
PDF_TERMS_CONDITIONS=$(quote_value "https://$DOMAIN_NAME/terms")
PDF_PRIVACY_POLICY=$(quote_value "https://$DOMAIN_NAME/privacy")

# Email Template Customization
EMAIL_SIGNATURE=$(quote_value "$EMAIL_SIGNATURE")
EMAIL_FOOTER=$(quote_value "$EMAIL_FOOTER")

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
