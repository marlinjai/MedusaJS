#!/bin/bash
# setup-infrastructure.sh
# Sets up persistent infrastructure services

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DOMAIN_NAME="${DOMAIN_NAME:-basiscamp-berlin.de}"
SSL_CERT_NAME="${SSL_CERT_NAME:-fullchain}"
SSL_KEY_NAME="${SSL_KEY_NAME:-privkey}"

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

# Validate environment
validate_environment() {
    log "🔍 Validating environment..."

    # Check required environment variables
    local required_vars=(
        "POSTGRES_PASSWORD"
        "DOMAIN_NAME"
        "SSL_CERT_NAME"
        "SSL_KEY_NAME"
    )

    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Required environment variable $var is not set"
        fi
    done

    # Check SSL certificates exist
    if [[ ! -f "${PROJECT_ROOT}/nginx/ssl/${SSL_CERT_NAME}.pem" ]]; then
        error "SSL certificate not found: ${PROJECT_ROOT}/nginx/ssl/${SSL_CERT_NAME}.pem"
    fi

    if [[ ! -f "${PROJECT_ROOT}/nginx/ssl/${SSL_KEY_NAME}.pem" ]]; then
        error "SSL private key not found: ${PROJECT_ROOT}/nginx/ssl/${SSL_KEY_NAME}.pem"
    fi

    log "✅ Environment validation passed"
}

# Generate configuration files
generate_configs() {
    log "📝 Generating configuration files..."

    # Generate monitoring nginx config from template
    local monitoring_config="${SCRIPT_DIR}/nginx-monitoring.conf"
    local monitoring_config_final="${SCRIPT_DIR}/nginx-monitoring-final.conf"

    # Replace placeholders in monitoring config
    sed -e "s/\${DOMAIN_NAME}/${DOMAIN_NAME}/g" \
        -e "s/\${SSL_CERT_NAME}/${SSL_CERT_NAME}/g" \
        -e "s/\${SSL_KEY_NAME}/${SSL_KEY_NAME}/g" \
        "$monitoring_config" > "$monitoring_config_final"

    log "✅ Configuration files generated"
}

# Setup infrastructure
setup_infrastructure() {
    log "🏗️ Setting up infrastructure services..."

    cd "$SCRIPT_DIR"

    # Stop any existing infrastructure
    log "🛑 Stopping existing infrastructure..."
    docker compose -f docker-compose.infrastructure.yml down --remove-orphans || true

    # Clean up any orphaned containers
    docker container prune -f || true

    # Start infrastructure services
    log "🚀 Starting infrastructure services..."
    docker compose -f docker-compose.infrastructure.yml up -d

    # Wait for services to be healthy
    log "⏳ Waiting for services to be healthy..."
    local max_attempts=30
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        log "Health check attempt $attempt/$max_attempts..."

        # Check PostgreSQL
        if docker compose -f docker-compose.infrastructure.yml exec -T postgres pg_isready -U medusa -d medusa > /dev/null 2>&1; then
            log "✅ PostgreSQL is healthy"
        else
            warn "PostgreSQL not ready yet..."
        fi

        # Check Redis
        if docker compose -f docker-compose.infrastructure.yml exec -T redis redis-cli ping > /dev/null 2>&1; then
            log "✅ Redis is healthy"
        else
            warn "Redis not ready yet..."
        fi

        # Check if all services are healthy
        local unhealthy_services
        unhealthy_services=$(docker compose -f docker-compose.infrastructure.yml ps --format json | jq -r '.[] | select(.Health != "healthy" and .Health != "") | .Name' 2>/dev/null || echo "")

        if [[ -z "$unhealthy_services" ]]; then
            log "✅ All infrastructure services are healthy"
            break
        fi

        if [[ $attempt -eq $max_attempts ]]; then
            error "Infrastructure services failed to become healthy after $max_attempts attempts"
        fi

        sleep 10
        ((attempt++))
    done
}

# Display service information
show_service_info() {
    log "📊 Infrastructure service information:"
    echo ""

    # Show running containers
    docker compose -f docker-compose.infrastructure.yml ps
    echo ""

    # Show service URLs
    log "🌐 Service URLs:"
    log "   PostgreSQL: localhost:5432 (medusa/medusa)"
    log "   Redis: localhost:6379"
    log "   Portainer: https://portainer.${DOMAIN_NAME}"
    log "   Uptime Kuma: https://uptime.${DOMAIN_NAME}"
    echo ""

    # Show logs command
    log "📝 To view logs:"
    log "   docker compose -f infrastructure/docker-compose.infrastructure.yml logs -f [service_name]"
    echo ""
}

# Main execution
main() {
    log "🚀 Starting infrastructure setup..."

    validate_environment
    generate_configs
    setup_infrastructure
    show_service_info

    log "✅ Infrastructure setup completed successfully!"
    log "🎯 Next steps:"
    log "   1. Configure monitoring services via web interfaces"
    log "   2. Deploy application using blue-green deployment"
    log "   3. Monitor services via Portainer and Uptime Kuma"
}

# Run main function
main "$@"
