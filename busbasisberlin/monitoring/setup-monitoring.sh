#!/bin/bash
# busbasisberlin/monitoring/setup-monitoring.sh
# Deploy monitoring stack with subdomain SSL access

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

log_step "Setting up monitoring stack with SSL subdomains..."

# Step 1: Setup SSL certificates (requires root)
log_info "Setting up SSL certificates..."
if [[ $EUID -eq 0 ]]; then
    "$SCRIPT_DIR/setup-ssl-certs.sh"
else
    log_info "Running SSL setup as root..."
    sudo "$SCRIPT_DIR/setup-ssl-certs.sh"
fi

# Step 2: Deploy monitoring services
log_info "Deploying monitoring services..."
cd "$SCRIPT_DIR"
docker compose up -d

# Step 3: Wait for services to be ready
log_info "Waiting for monitoring services to start..."
sleep 10

# Step 4: Copy nginx configuration to main nginx container
log_info "Configuring nginx for subdomain access..."
NGINX_CONTAINER="medusa_nginx"

# Check if nginx container exists and is running
if docker ps --format '{{.Names}}' | grep -q "^${NGINX_CONTAINER}$"; then
    # Copy monitoring nginx config to the main nginx container
    docker cp "$SCRIPT_DIR/nginx-monitoring.conf" "${NGINX_CONTAINER}:/etc/nginx/conf.d/monitoring.conf"

    # Test nginx configuration
    if docker exec "$NGINX_CONTAINER" nginx -t; then
        # Reload nginx
        docker exec "$NGINX_CONTAINER" nginx -s reload
        log_success "Nginx configuration updated and reloaded"
    else
        log_error "Nginx configuration test failed"
        exit 1
    fi
else
    log_error "Nginx container ($NGINX_CONTAINER) not found or not running"
    log_info "Please ensure the main application is deployed first"
    exit 1
fi

# Step 5: Verify services are healthy
log_info "Verifying monitoring services..."

# Check Portainer
if curl -k -f https://localhost:9443/api/status >/dev/null 2>&1; then
    log_success "Portainer is healthy"
else
    log_error "Portainer health check failed"
fi

# Check Uptime Kuma
if curl -f http://localhost:3001 >/dev/null 2>&1; then
    log_success "Uptime Kuma is healthy"
else
    log_error "Uptime Kuma health check failed"
fi

log_success "Monitoring stack deployment completed!"
echo
echo "🎉 Monitoring Tools Access:"
echo "📊 Portainer (Docker Management): https://portainer.basiscamp-berlin.de"
echo "📈 Uptime Kuma (Service Monitoring): https://status.basiscamp-berlin.de"
echo
echo "🔒 SSL Status: Wildcard certificate active (*.basiscamp-berlin.de)"
echo "🌐 Main Application: https://basiscamp-berlin.de"
echo "⚙️  Admin Panel: https://basiscamp-berlin.de/app"
echo
echo "📝 Next Steps:"
echo "1. Complete Portainer setup at https://portainer.basiscamp-berlin.de"
echo "2. Configure Uptime Kuma monitoring at https://status.basiscamp-berlin.de"
echo "3. Set up monitoring alerts and dashboards"
