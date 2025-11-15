#!/bin/bash
# debug-deployment.sh
# Debugging script to investigate deployment issues on VPS

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

echo "=========================================="
echo "  Deployment Debugging Script"
echo "=========================================="
echo ""

# 1. Check environment variables
log_info "1. Checking environment variables..."
echo ""
echo "DOMAIN_NAME: ${DOMAIN_NAME:-NOT SET}"
echo "POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:+SET (hidden)}${POSTGRES_PASSWORD:-NOT SET}"
echo "JWT_SECRET: ${JWT_SECRET:+SET (hidden)}${JWT_SECRET:-NOT SET}"
echo "COOKIE_SECRET: ${COOKIE_SECRET:+SET (hidden)}${COOKIE_SECRET:-NOT SET}"
echo "RESEND_API_KEY: ${RESEND_API_KEY:+SET (hidden)}${RESEND_API_KEY:-NOT SET}"
echo "RESEND_FROM_EMAIL: ${RESEND_FROM_EMAIL:-NOT SET}"
echo ""

# 2. Check current directory and files
log_info "2. Checking current directory and project files..."
pwd
ls -la | head -20
echo ""

# 3. Check if scripts exist and are executable
log_info "3. Checking deployment scripts..."
if [ -f "scripts/deploy-with-domain.sh" ]; then
    log_success "deploy-with-domain.sh exists"
    ls -la scripts/deploy-with-domain.sh
else
    log_error "deploy-with-domain.sh NOT FOUND"
fi

if [ -f "scripts/deploy.sh" ]; then
    log_success "deploy.sh exists"
    ls -la scripts/deploy.sh
else
    log_error "deploy.sh NOT FOUND"
fi

if [ -f "scripts/setup-production-env.sh" ]; then
    log_success "setup-production-env.sh exists"
    ls -la scripts/setup-production-env.sh
else
    log_error "setup-production-env.sh NOT FOUND"
fi
echo ""

# 4. Check Docker status
log_info "4. Checking Docker status..."
docker ps -a | grep medusa || echo "No medusa containers found"
echo ""

# 5. Check disk space
log_info "5. Checking disk space..."
df -h
echo ""

# 6. Check Docker system info
log_info "6. Checking Docker system info..."
docker system df
echo ""

# 7. Test environment variable export manually
log_info "7. Testing environment variable export..."
export DOMAIN_NAME="${DOMAIN_NAME:-test-domain.com}"
echo "DOMAIN_NAME after export: $DOMAIN_NAME"
echo ""

# 8. Test script execution with verbose output
log_info "8. Testing setup-production-env.sh with verbose output..."
if [ -f "scripts/setup-production-env.sh" ]; then
    bash -x scripts/setup-production-env.sh 2>&1 | head -50 || echo "Script failed with exit code: $?"
else
    log_error "setup-production-env.sh not found"
fi
echo ""

# 9. Check recent Docker logs
log_info "9. Checking recent container logs..."
if docker ps -a | grep -q medusa_backend_server; then
    echo "=== Server logs (last 20 lines) ==="
    docker logs --tail 20 medusa_backend_server_green 2>&1 || docker logs --tail 20 medusa_backend_server_blue 2>&1 || echo "No logs available"
fi
echo ""

# 10. Check nginx configuration
log_info "10. Checking nginx configuration..."
if [ -f "nginx/nginx-green.conf" ]; then
    log_success "nginx-green.conf exists"
    head -20 nginx/nginx-green.conf
else
    log_warning "nginx-green.conf not found"
fi
echo ""

# 11. Test docker-compose syntax
log_info "11. Testing docker-compose file syntax..."
if [ -f "docker-compose.green.yml" ]; then
    docker compose -f docker-compose.base.yml -f docker-compose.green.yml config > /dev/null 2>&1 && log_success "docker-compose syntax OK" || log_error "docker-compose syntax ERROR"
else
    log_error "docker-compose.green.yml not found"
fi
echo ""

# 12. Check if DOMAIN_NAME is in docker-compose files
log_info "12. Checking DOMAIN_NAME usage in docker-compose files..."
if grep -q "\${DOMAIN_NAME}" docker-compose.green.yml 2>/dev/null; then
    log_success "DOMAIN_NAME variable found in docker-compose.green.yml"
    grep "\${DOMAIN_NAME}" docker-compose.green.yml | head -3
else
    log_warning "DOMAIN_NAME variable not found in docker-compose.green.yml"
fi
echo ""

log_info "Debugging complete!"
echo ""
echo "Next steps:"
echo "1. If DOMAIN_NAME is not set, check GitHub Secrets"
echo "2. If scripts fail, check file permissions: chmod +x scripts/*.sh"
echo "3. If Docker build fails, check: docker build --progress=plain -t test ."
echo "4. Check full deployment logs: ./scripts/deploy-with-domain.sh 2>&1 | tee deploy.log"

