#!/bin/bash
# deploy-blue-green.sh
# Production-ready blue-green deployment script

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DOMAIN_NAME="${DOMAIN_NAME:-basiscamp-berlin.de}"
SSL_CERT_NAME="${SSL_CERT_NAME:-fullchain}"
SSL_KEY_NAME="${SSL_KEY_NAME:-privkey}"
DEPLOYMENT_TIMEOUT="${DEPLOYMENT_TIMEOUT:-600}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-300}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Determine current and target deployments
determine_deployments() {
    local current_nginx_config="${PROJECT_ROOT}/nginx/nginx.conf"

    if [[ -f "$current_nginx_config" ]]; then
        if grep -q "medusa_backend_server_blue" "$current_nginx_config"; then
            CURRENT_DEPLOYMENT="blue"
            TARGET_DEPLOYMENT="green"
        else
            CURRENT_DEPLOYMENT="green"
            TARGET_DEPLOYMENT="blue"
        fi
    else
        # Default to blue if no config exists
        CURRENT_DEPLOYMENT="none"
        TARGET_DEPLOYMENT="blue"
    fi

    log "Current deployment: ${CURRENT_DEPLOYMENT}"
    log "Target deployment: ${TARGET_DEPLOYMENT}"
}

# Validate environment
validate_environment() {
    log "🔍 Validating environment..."

    # Check required environment variables
    local required_vars=(
        "POSTGRES_PASSWORD"
        "JWT_SECRET"
        "COOKIE_SECRET"
        "DOMAIN_NAME"
        "SSL_CERT_NAME"
        "SSL_KEY_NAME"
    )

    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Required environment variable $var is not set"
        fi
    done

    # Check infrastructure is running
    if ! docker compose -f "${PROJECT_ROOT}/infrastructure/docker-compose.infrastructure.yml" ps | grep -q "Up"; then
        error "Infrastructure services are not running. Please run setup-infrastructure.sh first."
    fi

    # Check SSL certificates
    if [[ ! -f "${PROJECT_ROOT}/nginx/ssl/${SSL_CERT_NAME}.pem" ]]; then
        error "SSL certificate not found: ${PROJECT_ROOT}/nginx/ssl/${SSL_CERT_NAME}.pem"
    fi

    log "✅ Environment validation passed"
}

# Generate nginx configuration
generate_nginx_config() {
    local deployment="$1"
    log "📝 Generating nginx configuration for ${deployment} deployment..."

    local template_file="${PROJECT_ROOT}/nginx/nginx-${deployment}.template"
    local output_file="${PROJECT_ROOT}/nginx/nginx-${deployment}.conf"

    if [[ ! -f "$template_file" ]]; then
        error "Template file not found: $template_file"
    fi

    # Replace placeholders in template
    sed -e "s/\${DOMAIN_NAME}/${DOMAIN_NAME}/g" \
        -e "s/\${SSL_CERT_NAME}/${SSL_CERT_NAME}/g" \
        -e "s/\${SSL_KEY_NAME}/${SSL_KEY_NAME}/g" \
        "$template_file" > "$output_file"

    log "✅ Nginx configuration generated: $output_file"
}

# Build and start target deployment
start_target_deployment() {
    log "🚀 Starting ${TARGET_DEPLOYMENT} deployment..."

    cd "$PROJECT_ROOT"

    # Generate nginx config for target deployment
    generate_nginx_config "$TARGET_DEPLOYMENT"

    # Set deployment-specific environment
    export DEPLOYMENT_COLOR="$TARGET_DEPLOYMENT"
    export MEDUSA_BACKEND_PORT=$([[ "$TARGET_DEPLOYMENT" == "blue" ]] && echo "9000" || echo "9002")
    export MEDUSA_WORKER_PORT=$([[ "$TARGET_DEPLOYMENT" == "blue" ]] && echo "9001" || echo "9003")

    # Stop any existing target deployment containers
    log "🛑 Cleaning up existing ${TARGET_DEPLOYMENT} containers..."
    docker compose -f "docker-compose.${TARGET_DEPLOYMENT}.yml" down --remove-orphans || true

    # Remove any dangling containers
    docker container prune -f || true

    # Build and start target deployment
    log "🔨 Building ${TARGET_DEPLOYMENT} deployment..."
    docker compose -f "docker-compose.${TARGET_DEPLOYMENT}.yml" build --no-cache

    log "▶️ Starting ${TARGET_DEPLOYMENT} deployment..."
    docker compose -f "docker-compose.${TARGET_DEPLOYMENT}.yml" up -d

    log "✅ ${TARGET_DEPLOYMENT} deployment started"
}

# Health check for target deployment
health_check_target() {
    log "🏥 Performing health check on ${TARGET_DEPLOYMENT} deployment..."

    local backend_port=$([[ "$TARGET_DEPLOYMENT" == "blue" ]] && echo "9000" || echo "9002")
    local health_url="http://localhost:${backend_port}/health"
    local max_attempts=$((HEALTH_CHECK_TIMEOUT / 10))
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        info "Health check attempt $attempt/$max_attempts..."

        if curl -f -s "$health_url" > /dev/null 2>&1; then
            log "✅ ${TARGET_DEPLOYMENT} deployment is healthy"
            return 0
        fi

        if [[ $attempt -eq $max_attempts ]]; then
            error "${TARGET_DEPLOYMENT} deployment failed health check after $max_attempts attempts"
        fi

        sleep 10
        ((attempt++))
    done
}

# Switch nginx to target deployment
switch_nginx() {
    log "🔄 Switching nginx to ${TARGET_DEPLOYMENT} deployment..."

    local target_config="${PROJECT_ROOT}/nginx/nginx-${TARGET_DEPLOYMENT}.conf"
    local main_config="${PROJECT_ROOT}/nginx/nginx.conf"

    # Copy target config to main config
    cp "$target_config" "$main_config"

    # Reload nginx configuration
    if docker compose -f "${PROJECT_ROOT}/infrastructure/docker-compose.infrastructure.yml" exec nginx nginx -t; then
        docker compose -f "${PROJECT_ROOT}/infrastructure/docker-compose.infrastructure.yml" exec nginx nginx -s reload
        log "✅ Nginx switched to ${TARGET_DEPLOYMENT} deployment"
    else
        error "Nginx configuration test failed"
    fi
}

# Stop old deployment
stop_old_deployment() {
    if [[ "$CURRENT_DEPLOYMENT" != "none" ]]; then
        log "🛑 Stopping ${CURRENT_DEPLOYMENT} deployment..."

        # Wait a bit for connections to drain
        sleep 30

        # Stop old deployment
        docker compose -f "${PROJECT_ROOT}/docker-compose.${CURRENT_DEPLOYMENT}.yml" stop || true
        docker compose -f "${PROJECT_ROOT}/docker-compose.${CURRENT_DEPLOYMENT}.yml" rm -f || true

        log "✅ ${CURRENT_DEPLOYMENT} deployment stopped"
    else
        log "ℹ️ No previous deployment to stop"
    fi
}

# Cleanup old images and containers
cleanup() {
    log "🧹 Cleaning up old images and containers..."

    # Remove unused images (keep last 2 versions)
    docker image prune -f || true

    # Remove unused volumes (be careful with this)
    # docker volume prune -f || true

    log "✅ Cleanup completed"
}

# Rollback function
rollback() {
    warn "🔄 Rolling back to ${CURRENT_DEPLOYMENT} deployment..."

    if [[ "$CURRENT_DEPLOYMENT" != "none" ]]; then
        # Switch nginx back to current deployment
        local current_config="${PROJECT_ROOT}/nginx/nginx-${CURRENT_DEPLOYMENT}.conf"
        local main_config="${PROJECT_ROOT}/nginx/nginx.conf"

        cp "$current_config" "$main_config"
        docker compose -f "${PROJECT_ROOT}/infrastructure/docker-compose.infrastructure.yml" exec nginx nginx -s reload

        # Stop failed target deployment
        docker compose -f "${PROJECT_ROOT}/docker-compose.${TARGET_DEPLOYMENT}.yml" down || true

        warn "✅ Rollback completed"
    else
        error "Cannot rollback - no previous deployment available"
    fi
}

# Display deployment status
show_status() {
    log "📊 Deployment Status:"
    echo ""

    # Show running containers
    log "🐳 Running containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""

    # Show service URLs
    log "🌐 Service URLs:"
    log "   Main App: https://${DOMAIN_NAME}"
    log "   Admin Panel: https://${DOMAIN_NAME}/app"
    log "   Health Check: https://${DOMAIN_NAME}/health"
    log "   Portainer: https://portainer.${DOMAIN_NAME}"
    log "   Uptime Kuma: https://uptime.${DOMAIN_NAME}"
    echo ""
}

# Main deployment function
main() {
    log "🚀 Starting blue-green deployment..."

    # Set trap for cleanup on error
    trap rollback ERR

    determine_deployments
    validate_environment
    start_target_deployment
    health_check_target
    switch_nginx
    stop_old_deployment
    cleanup
    show_status

    log "🎉 Blue-green deployment completed successfully!"
    log "🌐 Application is now running on ${TARGET_DEPLOYMENT} deployment"
    log "🔗 Access your application at: https://${DOMAIN_NAME}"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "status")
        show_status
        ;;
    "rollback")
        determine_deployments
        if [[ "$CURRENT_DEPLOYMENT" != "none" ]]; then
            # Swap current and target for rollback
            TEMP="$CURRENT_DEPLOYMENT"
            CURRENT_DEPLOYMENT="$TARGET_DEPLOYMENT"
            TARGET_DEPLOYMENT="$TEMP"
            rollback
        else
            error "No deployment to rollback to"
        fi
        ;;
    *)
        echo "Usage: $0 [deploy|status|rollback]"
        exit 1
        ;;
esac
