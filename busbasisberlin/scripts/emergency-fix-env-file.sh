#!/bin/bash
# emergency-fix-env-file.sh
# Emergency script to fix the .env.production file directly on VPS
# This ensures the REDIS_PASSWORD has NO quotes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env.production"

log_info "========================================="
log_info "Emergency .env.production Fix"
log_info "========================================="
echo ""

# Check if file exists
if [[ ! -f "$ENV_FILE" ]]; then
    log_error ".env.production does not exist at: $ENV_FILE"
    exit 1
fi

log_info "Creating backup of current .env.production..."
cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
log_success "Backup created"

# Extract current REDIS_PASSWORD value (removing any quotes)
log_info "Extracting current REDIS_PASSWORD..."
CURRENT_REDIS_PASSWORD=$(grep "^REDIS_PASSWORD=" "$ENV_FILE" | head -1 | cut -d'=' -f2- | sed "s/^['\"]//; s/['\"]$//")

if [[ -z "$CURRENT_REDIS_PASSWORD" ]]; then
    log_error "Could not find REDIS_PASSWORD in .env.production"
    exit 1
fi

log_info "Current password (first 10 chars): ${CURRENT_REDIS_PASSWORD:0:10}..."

# Check if password currently has quotes
if grep "^REDIS_PASSWORD=" "$ENV_FILE" | grep -q "['\"]"; then
    log_warning "Password currently HAS quotes - this is the bug!"
else
    log_info "Password currently has no quotes - checking if issue is elsewhere"
fi

# Create new REDIS_URL with the password (no quotes)
NEW_REDIS_URL="redis://redis:6379/0?password=${CURRENT_REDIS_PASSWORD}"

log_info "New REDIS_URL (password masked): redis://redis:6379/0?password=***"

# Use sed to replace the lines in place
log_info "Updating .env.production..."

# Remove any quotes from REDIS_PASSWORD line
sed -i.tmp "s|^REDIS_PASSWORD=.*|REDIS_PASSWORD=${CURRENT_REDIS_PASSWORD}|" "$ENV_FILE"

# Update REDIS_URL with new format
sed -i.tmp "s|^REDIS_URL=.*|REDIS_URL='${NEW_REDIS_URL}'|" "$ENV_FILE"

# Remove temp file
rm -f "${ENV_FILE}.tmp"

log_success ".env.production updated!"

# Verify the changes
echo ""
log_info "Verification:"
log_info "REDIS_PASSWORD line:"
grep "^REDIS_PASSWORD=" "$ENV_FILE" | head -1 | sed 's/=.*/=***/'
log_info "REDIS_URL line:"
grep "^REDIS_URL=" "$ENV_FILE" | head -1 | sed 's/password=[^&'\''"]*/password=***/'

# Check for quotes
echo ""
if grep "^REDIS_PASSWORD=" "$ENV_FILE" | grep -q "['\"].*['\"]"; then
    log_error "REDIS_PASSWORD still has quotes! Manual intervention needed."
    exit 1
else
    log_success "REDIS_PASSWORD has NO quotes ✓"
fi

echo ""
log_success "========================================="
log_success "Fix completed successfully!"
log_success "========================================="
echo ""
log_info "Next steps:"
log_info "1. Restart blue/green containers:"
log_info "   docker-compose -f docker-compose.base.yml -f docker-compose.blue.yml restart"
log_info ""
log_info "2. Check logs for WRONGPASS errors:"
log_info "   docker logs medusa_backend_server_blue 2>&1 | grep -i wrongpass"
log_info ""
log_info "3. If errors persist, run diagnostics:"
log_info "   ./scripts/diagnose-redis-connection.sh"

