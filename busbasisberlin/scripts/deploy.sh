#!/bin/bash
# deploy.sh
# Blue-Green deployment script for MedusaJS
# Handles zero-downtime deployments by switching between blue and green environments

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CURRENT_STATE_FILE="$PROJECT_DIR/.current_deployment"
HEALTH_CHECK_TIMEOUT=120
HEALTH_CHECK_INTERVAL=5

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

# Function to get current deployment state
get_current_deployment() {
    if [[ -f "$CURRENT_STATE_FILE" ]]; then
        cat "$CURRENT_STATE_FILE"
    else
        echo "blue"  # Default to blue if no state file exists
    fi
}

# Function to get target deployment state
get_target_deployment() {
    local current=$(get_current_deployment)
    if [[ "$current" == "blue" ]]; then
        echo "green"
    else
        echo "blue"
    fi
}

# Function to check if containers are healthy
check_health() {
    local deployment=$1
    local max_attempts=$((HEALTH_CHECK_TIMEOUT / HEALTH_CHECK_INTERVAL))
    local attempt=1

    log_info "Checking health of $deployment deployment..."

    while [[ $attempt -le $max_attempts ]]; do
        local server_health=$(docker inspect --format='{{.State.Health.Status}}' "medusa_backend_server_$deployment" 2>/dev/null || echo "unhealthy")
        local worker_health=$(docker inspect --format='{{.State.Health.Status}}' "medusa_backend_worker_$deployment" 2>/dev/null || echo "unhealthy")

        if [[ "$server_health" == "healthy" && "$worker_health" == "healthy" ]]; then
            log_success "$deployment deployment is healthy"
            return 0
        fi

        log_info "Attempt $attempt/$max_attempts: Server: $server_health, Worker: $worker_health"
        sleep $HEALTH_CHECK_INTERVAL
        ((attempt++))
    done

    log_error "$deployment deployment failed health check after $HEALTH_CHECK_TIMEOUT seconds"
    return 1
}

# Function to switch nginx configuration
switch_nginx() {
    local target=$1
    log_info "Switching nginx to $target deployment..."

    # Copy the appropriate nginx config
    cp "$PROJECT_DIR/nginx/nginx-$target.conf" "$PROJECT_DIR/nginx/nginx.conf"

    # Wait for nginx container to be running
    local attempts=0
    local max_attempts=30
    while [[ $attempts -lt $max_attempts ]]; do
        if docker exec medusa_nginx nginx -s reload 2>/dev/null; then
            log_success "Nginx switched to $target deployment"
            return 0
        fi

        # If reload failed, check if container is restarting
        local container_state=$(docker inspect medusa_nginx --format '{{.State.Status}}' 2>/dev/null)
        if [[ "$container_state" == "restarting" ]]; then
            log_info "Nginx container is restarting, waiting..."
            sleep 2
            attempts=$((attempts + 1))
            continue
        elif [[ "$container_state" != "running" ]]; then
            log_warning "Nginx container not running, attempting to start..."
            docker start medusa_nginx
            sleep 2
            attempts=$((attempts + 1))
            continue
        fi

        # Container is running but reload failed, try again
        sleep 1
        attempts=$((attempts + 1))
    done

    log_error "Failed to switch nginx to $target deployment after $max_attempts attempts"
    return 1
}

# Function to start deployment
start_deployment() {
    local target=$1
    log_info "Starting $target deployment..."

    cd "$PROJECT_DIR"
    # Ensure environment variables are available to Docker Compose
    export POSTGRES_PASSWORD JWT_SECRET COOKIE_SECRET RESEND_API_KEY RESEND_FROM_EMAIL
    export S3_ACCESS_KEY_ID S3_SECRET_ACCESS_KEY S3_REGION S3_BUCKET S3_ENDPOINT S3_FILE_URL
    export COMPANY_NAME COMPANY_ADDRESS COMPANY_POSTAL_CODE COMPANY_CITY COMPANY_EMAIL
    export COMPANY_PHONE COMPANY_TAX_ID COMPANY_BANK_INFO PDF_FOOTER_TEXT EMAIL_SIGNATURE EMAIL_FOOTER
    export MEDUSA_BACKEND_URL DOMAIN_NAME NODE_ENV

    docker compose -f docker-compose.base.yml -f "docker-compose.$target.yml" up -d --build

    if [[ $? -eq 0 ]]; then
        log_success "$target deployment started"
        return 0
    else
        log_error "Failed to start $target deployment"
        return 1
    fi
}

# Function to stop deployment
stop_deployment() {
    local deployment=$1
    log_info "Stopping $deployment deployment..."

    cd "$PROJECT_DIR"
    docker compose -f "docker-compose.$deployment.yml" down

    if [[ $? -eq 0 ]]; then
        log_success "$deployment deployment stopped"
        return 0
    else
        log_error "Failed to stop $deployment deployment"
        return 1
    fi
}

# Function to rollback deployment
rollback() {
    local current=$(get_current_deployment)
    local previous

    if [[ "$current" == "blue" ]]; then
        previous="green"
    else
        previous="blue"
    fi

    log_warning "Rolling back to $previous deployment..."

    # Switch nginx back
    if switch_nginx "$previous"; then
        echo "$previous" > "$CURRENT_STATE_FILE"
        log_success "Rollback completed successfully"
        return 0
    else
        log_error "Rollback failed"
        return 1
    fi
}

# Main deployment function
deploy() {
    local current=$(get_current_deployment)
    local target=$(get_target_deployment)

    log_info "Starting blue-green deployment..."
    log_info "Current deployment: $current"
    log_info "Target deployment: $target"

    # Ensure base services are running (cold start handling)
    log_info "Ensuring base services (postgres, redis, nginx) are running..."
    cd "$PROJECT_DIR"

    # Check if this is a cold start (no containers running)
    if ! docker ps --format "{{.Names}}" | grep -q "medusa_"; then
        log_info "Cold start detected - initializing all base services..."
        # Generate initial nginx config if none exists
        if [[ ! -f "nginx/nginx.conf" ]]; then
            log_info "Creating initial nginx configuration..."
            cp "nginx/nginx-$target.conf" "nginx/nginx.conf"
        fi
    fi

    # Ensure environment variables are available to Docker Compose
    export POSTGRES_PASSWORD JWT_SECRET COOKIE_SECRET RESEND_API_KEY RESEND_FROM_EMAIL
    export S3_ACCESS_KEY_ID S3_SECRET_ACCESS_KEY S3_REGION S3_BUCKET S3_ENDPOINT S3_FILE_URL
    export COMPANY_NAME COMPANY_ADDRESS COMPANY_POSTAL_CODE COMPANY_CITY COMPANY_EMAIL
    export COMPANY_PHONE COMPANY_TAX_ID COMPANY_BANK_INFO PDF_FOOTER_TEXT EMAIL_SIGNATURE EMAIL_FOOTER
    export MEDUSA_BACKEND_URL DOMAIN_NAME NODE_ENV

    docker compose -f docker-compose.base.yml up -d

    # Start target deployment
    if ! start_deployment "$target"; then
        log_error "Failed to start target deployment"
        exit 1
    fi

    # Wait for target deployment to be healthy
    if ! check_health "$target"; then
        log_error "Target deployment failed health checks"
        log_info "Cleaning up failed deployment..."
        stop_deployment "$target"
        exit 1
    fi

    # Switch nginx to target deployment
    if ! switch_nginx "$target"; then
        log_error "Failed to switch nginx to target deployment"
        log_info "Rolling back..."
        rollback
        stop_deployment "$target"
        exit 1
    fi

    # Update current deployment state
    echo "$target" > "$CURRENT_STATE_FILE"

    # Stop old deployment
    log_info "Stopping old $current deployment..."
    stop_deployment "$current"

    log_success "Deployment completed successfully!"
    log_success "Active deployment: $target"
}

# Function to show current status
status() {
    local current=$(get_current_deployment)
    echo "Current deployment: $current"

    # Show container status
    echo ""
    echo "Container Status:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(medusa|postgres|redis|nginx)"
}

# Function to show help
show_help() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  deploy    - Perform blue-green deployment"
    echo "  rollback  - Rollback to previous deployment"
    echo "  status    - Show current deployment status"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 deploy     # Deploy new version"
    echo "  $0 rollback   # Rollback to previous version"
    echo "  $0 status     # Check current status"
}

# Main script logic
case "${1:-}" in
    deploy)
        deploy
        ;;
    rollback)
        rollback
        ;;
    status)
        status
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: ${1:-}"
        echo ""
        show_help
        exit 1
        ;;
esac
