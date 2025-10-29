#!/bin/bash
# health-check.sh
# Comprehensive health check script for deployment validation

set -o pipefail

# Configuration
HEALTH_ENDPOINT="${1:-http://localhost:9000/health}"
MAX_RETRIES="${2:-30}"
RETRY_INTERVAL="${3:-2}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${YELLOW}[HEALTH]${NC} $1"; }
log_success() { echo -e "${GREEN}[HEALTHY]${NC} $1"; }
log_error() { echo -e "${RED}[UNHEALTHY]${NC} $1"; }

# Health check with retries
check_health() {
    local attempt=1
    
    while [ $attempt -le $MAX_RETRIES ]; do
        log_info "Health check attempt $attempt/$MAX_RETRIES..."
        
        # Check if endpoint responds
        response=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_ENDPOINT" 2>/dev/null)
        
        if [ "$response" = "200" ]; then
            log_success "Health check passed (HTTP $response)"
            return 0
        fi
        
        log_info "Response: HTTP $response, retrying in ${RETRY_INTERVAL}s..."
        sleep $RETRY_INTERVAL
        attempt=$((attempt + 1))
    done
    
    log_error "Health check failed after $MAX_RETRIES attempts"
    return 1
}

# Run health check
check_health
exit $?

