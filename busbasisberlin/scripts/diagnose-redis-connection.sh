#!/bin/bash
# diagnose-redis-connection.sh
# Comprehensive Redis connection diagnostics for deployment troubleshooting

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

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_info "========================================="
log_info "Redis Connection Diagnostics"
log_info "========================================="
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Step 1: Check if .env.production exists
log_info "Step 1: Checking .env.production file..."
if [[ -f "$PROJECT_DIR/.env.production" ]]; then
    log_success ".env.production exists"
    
    # Extract Redis configuration
    if grep -q "REDIS_PASSWORD=" "$PROJECT_DIR/.env.production"; then
        REDIS_PASSWORD_LINE=$(grep "REDIS_PASSWORD=" "$PROJECT_DIR/.env.production" | head -1)
        log_info "REDIS_PASSWORD line: ${REDIS_PASSWORD_LINE:0:30}..."
        
        # Check if it has quotes
        if [[ "$REDIS_PASSWORD_LINE" =~ REDIS_PASSWORD=[\'\"] ]]; then
            log_warning "REDIS_PASSWORD has quotes! This will break Docker Compose substitution"
        else
            log_success "REDIS_PASSWORD format looks correct (no quotes)"
        fi
    else
        log_error "REDIS_PASSWORD not found in .env.production"
    fi
    
    if grep -q "REDIS_URL=" "$PROJECT_DIR/.env.production"; then
        REDIS_URL_LINE=$(grep "REDIS_URL=" "$PROJECT_DIR/.env.production" | head -1)
        log_info "REDIS_URL line: ${REDIS_URL_LINE:0:60}..."
        
        # Check format
        if [[ "$REDIS_URL_LINE" =~ redis://redis:6379/0\?password= ]]; then
            log_success "REDIS_URL uses correct query parameter format"
        else
            log_warning "REDIS_URL may not use query parameter format"
        fi
    else
        log_error "REDIS_URL not found in .env.production"
    fi
else
    log_error ".env.production does not exist"
    log_error "This is why the deployment is failing - no environment file!"
fi
echo ""

# Step 2: Check Redis container
log_info "Step 2: Checking Redis container status..."
if docker ps --format '{{.Names}}' | grep -q "medusa_redis"; then
    log_success "Redis container is running"
    
    # Check if it requires auth
    log_info "Testing Redis authentication..."
    
    # Try without password first
    if docker exec medusa_redis redis-cli ping 2>&1 | grep -q "NOAUTH"; then
        log_success "Redis requires authentication (correct)"
    elif docker exec medusa_redis redis-cli ping 2>&1 | grep -q "PONG"; then
        log_warning "Redis does NOT require authentication (security issue!)"
    else
        log_error "Redis ping failed"
    fi
    
    # Try with password from env
    if [[ -f "$PROJECT_DIR/.env.production" ]]; then
        # Source the env file to get REDIS_PASSWORD
        # Remove quotes if present
        REDIS_PASSWORD=$(grep "REDIS_PASSWORD=" "$PROJECT_DIR/.env.production" | head -1 | cut -d'=' -f2- | sed "s/^['\"]//; s/['\"]$//")
        
        if [[ -n "$REDIS_PASSWORD" ]]; then
            log_info "Testing Redis with password from .env.production..."
            if docker exec medusa_redis redis-cli -a "$REDIS_PASSWORD" ping 2>&1 | grep -q "PONG"; then
                log_success "Redis authentication successful with .env.production password"
            else
                log_error "Redis authentication FAILED with .env.production password"
                log_error "This means the password in .env.production is wrong or has formatting issues"
            fi
        fi
    fi
else
    log_error "Redis container is NOT running"
    log_error "Check: docker ps -a | grep redis"
fi
echo ""

# Step 3: Check blue/green containers
log_info "Step 3: Checking Medusa container status..."

for color in blue green; do
    if docker ps --format '{{.Names}}' | grep -q "medusa_backend_server_${color}"; then
        log_info "Server container (${color}) is running"
        
        # Check environment variables inside container
        log_info "Checking REDIS_URL inside ${color} server container..."
        CONTAINER_REDIS_URL=$(docker exec "medusa_backend_server_${color}" printenv REDIS_URL 2>/dev/null || echo "NOT_SET")
        
        if [[ "$CONTAINER_REDIS_URL" == "NOT_SET" ]]; then
            log_error "REDIS_URL not set in ${color} server container!"
        else
            # Mask the password for security
            MASKED_URL=$(echo "$CONTAINER_REDIS_URL" | sed 's/password=[^&]*/password=***/')
            log_info "REDIS_URL in ${color} server: $MASKED_URL"
            
            # Check format
            if [[ "$CONTAINER_REDIS_URL" =~ redis://redis:6379/0\?password= ]]; then
                log_success "REDIS_URL format is correct (query parameter)"
            else
                log_warning "REDIS_URL format may be incorrect"
            fi
            
            # Check for quotes in password
            if [[ "$CONTAINER_REDIS_URL" =~ password=[\'\" ]]; then
                log_error "REDIS_URL contains quotes in password! This will cause authentication failure"
            fi
        fi
    else
        log_info "Server container (${color}) is NOT running"
    fi
done
echo ""

# Step 4: Network connectivity
log_info "Step 4: Checking network connectivity..."

# Check if network exists
if docker network ls | grep -q "busbasisberlin_medusa_network"; then
    log_success "Docker network 'busbasisberlin_medusa_network' exists"
    
    # Try to ping Redis from a blue/green container if running
    for color in blue green; do
        if docker ps --format '{{.Names}}' | grep -q "medusa_backend_server_${color}"; then
            log_info "Testing Redis connectivity from ${color} server container..."
            
            if docker exec "medusa_backend_server_${color}" sh -c "nc -zv redis 6379" 2>&1 | grep -q "succeeded"; then
                log_success "Network connection to Redis successful from ${color}"
            else
                log_error "Cannot reach Redis from ${color} server container"
            fi
            break
        fi
    done
else
    log_error "Docker network 'busbasisberlin_medusa_network' does NOT exist"
fi
echo ""

# Step 5: Check logs for specific errors
log_info "Step 5: Analyzing container logs for Redis errors..."

for color in blue green; do
    if docker ps --format '{{.Names}}' | grep -q "medusa_backend_server_${color}"; then
        log_info "Checking ${color} server logs for Redis errors..."
        
        # Look for specific error patterns
        LOGS=$(docker logs "medusa_backend_server_${color}" 2>&1 | tail -50)
        
        if echo "$LOGS" | grep -q "ECONNREFUSED"; then
            log_error "${color}: ECONNREFUSED - Cannot connect to Redis"
            log_error "Possible causes:"
            log_error "  1. Redis URL hostname is wrong (should be 'redis')"
            log_error "  2. Network connectivity issue"
            log_error "  3. Redis container not running"
        fi
        
        if echo "$LOGS" | grep -q "NOAUTH"; then
            log_error "${color}: NOAUTH - Redis requires password but none provided"
            log_error "Possible causes:"
            log_error "  1. REDIS_URL missing password parameter"
            log_error "  2. Docker Compose not substituting REDIS_PASSWORD correctly"
        fi
        
        if echo "$LOGS" | grep -q "WRONGPASS"; then
            log_error "${color}: WRONGPASS - Password is incorrect or malformed"
            log_error "Possible causes:"
            log_error "  1. Password has quotes embedded: password='secret' instead of password=secret"
            log_error "  2. Password has special characters not properly URL-encoded"
            log_error "  3. REDIS_PASSWORD in .env.production doesn't match Redis server password"
        fi
        
        if echo "$LOGS" | grep -q "getaddrinfo EAI_AGAIN"; then
            log_error "${color}: DNS resolution failure"
            log_error "Possible causes:"
            log_error "  1. Hostname in REDIS_URL is being parsed incorrectly"
            log_error "  2. Network DNS resolution issue"
        fi
        
        if echo "$LOGS" | grep -q "DeprecationWarning.*URL.*invalid"; then
            log_warning "${color}: Node.js URL parser deprecation warning"
            log_warning "This indicates URL format issues but shouldn't prevent connection"
        fi
    fi
done
echo ""

# Summary
log_info "========================================="
log_info "Diagnostic Summary"
log_info "========================================="
log_info "1. Check the output above for any RED [ERROR] messages"
log_info "2. Most common issues:"
log_info "   - REDIS_PASSWORD has quotes in .env.production"
log_info "   - .env.production not created before deployment"
log_info "   - REDIS_URL format incorrect (should be: redis://redis:6379/0?password=\${REDIS_PASSWORD})"
log_info "3. Next steps:"
log_info "   - Fix any issues identified above"
log_info "   - Recreate .env.production with correct format"
log_info "   - Restart affected containers"
echo ""

