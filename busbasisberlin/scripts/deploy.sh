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
    # First check what the state file says
    local file_state="blue"
    if [[ -f "$CURRENT_STATE_FILE" ]]; then
        file_state=$(cat "$CURRENT_STATE_FILE")
    fi

    # Check if containers for that deployment are actually running
    local blue_running=$(docker ps --filter "name=medusa_backend_server_blue" --filter "status=running" --quiet)
    local green_running=$(docker ps --filter "name=medusa_backend_server_green" --filter "status=running" --quiet)

    # Return the deployment that actually has running containers
    if [[ -n "$blue_running" ]]; then
        echo "blue"
    elif [[ -n "$green_running" ]]; then
        echo "green"
    else
        # No containers running - return file state but log warning
        log_warning "No deployment containers are currently running (file says: $file_state)"
        echo "$file_state"
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
    export STORE_CORS ADMIN_CORS AUTH_CORS
    export STRIPE_API_KEY STRIPE_WEBHOOK_SECRET
    export MEILISEARCH_HOST MEILISEARCH_API_KEY MEILISEARCH_MASTER_KEY MEILISEARCH_PRODUCT_INDEX_NAME

    docker compose -f docker-compose.base.yml -f "docker-compose.$target.yml" up -d --build --remove-orphans --force-recreate

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
    # Stop only the deployment-specific containers, not base services
    docker stop "medusa_backend_server_$deployment" "medusa_backend_worker_$deployment" 2>/dev/null || true
    docker rm "medusa_backend_server_$deployment" "medusa_backend_worker_$deployment" 2>/dev/null || true

    log_success "$deployment deployment stopped"
    return 0
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

# Function to generate Nginx configuration files
generate_nginx_configs() {
    local color=$1
    log_info "Generating nginx-$color.conf from template..."
    cd "$PROJECT_DIR/nginx"
    envsubst '${DOMAIN_NAME} ${SSL_CERT_NAME} ${SSL_KEY_NAME} ${STORE_CORS} ${ADMIN_CORS} ${AUTH_CORS} ${MEILISEARCH_HOST}' < nginx-$color.template > nginx-$color.conf
    cd "$PROJECT_DIR"
    return 0
}

# Function to analyze and fix current VPS state
analyze_and_fix_state() {
    log_info "Analyzing current VPS state..."

    # Check base services
    local postgres_running=$(docker ps --filter "name=medusa_postgres" --filter "status=running" --quiet)
    local redis_running=$(docker ps --filter "name=medusa_redis" --filter "status=running" --quiet)
    local nginx_running=$(docker ps --filter "name=medusa_nginx" --filter "status=running" --quiet)

    # Check deployment containers
    local blue_running=$(docker ps --filter "name=medusa_backend_server_blue" --filter "status=running" --quiet)
    local green_running=$(docker ps --filter "name=medusa_backend_server_green" --filter "status=running" --quiet)

    # Get file state vs actual state
    local file_state="blue"
    if [[ -f "$CURRENT_STATE_FILE" ]]; then
        file_state=$(cat "$CURRENT_STATE_FILE")
    fi

    log_info "State Analysis:"
    log_info "  File says: $file_state"
    log_info "  Blue containers running: $([ -n "$blue_running" ] && echo "YES" || echo "NO")"
    log_info "  Green containers running: $([ -n "$green_running" ] && echo "YES" || echo "NO")"
    log_info "  Base services: Postgres=$([ -n "$postgres_running" ] && echo "UP" || echo "DOWN") Redis=$([ -n "$redis_running" ] && echo "UP" || echo "DOWN") Nginx=$([ -n "$nginx_running" ] && echo "UP" || echo "DOWN")"

    # Determine corrective action
    if [[ -z "$postgres_running" || -z "$redis_running" || -z "$nginx_running" ]]; then
        log_warning "Base services are down - starting them first"
        start_base_services
    fi

    # Handle deployment container state
    if [[ -n "$blue_running" && -n "$green_running" ]]; then
        log_warning "Both deployments running - this shouldn't happen! Stopping older one based on file state"
        if [[ "$file_state" == "blue" ]]; then
            log_info "Keeping blue (current), stopping green"
            stop_deployment "green"
        else
            log_info "Keeping green (current), stopping blue"
            stop_deployment "blue"
        fi
    elif [[ -z "$blue_running" && -z "$green_running" ]]; then
        log_warning "No deployment containers running - starting $file_state deployment"
        start_deployment "$file_state"

        # Wait for health check
        if check_health "$file_state"; then
            switch_nginx "$file_state"
            log_success "Restored $file_state deployment successfully"
        else
            log_error "Failed to restore $file_state deployment"
            return 1
        fi
    elif [[ -n "$blue_running" && "$file_state" == "green" ]]; then
        log_warning "Blue is running but file says green - correcting state file"
        echo "blue" > "$CURRENT_STATE_FILE"
        switch_nginx "blue"
    elif [[ -n "$green_running" && "$file_state" == "blue" ]]; then
        log_warning "Green is running but file says blue - correcting state file"
        echo "green" > "$CURRENT_STATE_FILE"
        switch_nginx "green"
    fi

    # Always ensure nginx configs are correctly generated
    generate_nginx_configs "blue"
    generate_nginx_configs "green"

    return 0
}

# Function to start base services
start_base_services() {
    log_info "Starting base services..."
    cd "$PROJECT_DIR"

    # Export environment variables for base services
    export POSTGRES_PASSWORD JWT_SECRET COOKIE_SECRET RESEND_API_KEY RESEND_FROM_EMAIL
    export S3_ACCESS_KEY_ID S3_SECRET_ACCESS_KEY S3_REGION S3_BUCKET S3_ENDPOINT S3_FILE_URL
    export COMPANY_NAME COMPANY_ADDRESS COMPANY_POSTAL_CODE COMPANY_CITY COMPANY_EMAIL
    export COMPANY_PHONE COMPANY_TAX_ID COMPANY_BANK_INFO PDF_FOOTER_TEXT EMAIL_SIGNATURE EMAIL_FOOTER
    export MEDUSA_BACKEND_URL DOMAIN_NAME NODE_ENV
    export STORE_CORS ADMIN_CORS AUTH_CORS
    export STRIPE_API_KEY STRIPE_WEBHOOK_SECRET
    export MEILISEARCH_HOST MEILISEARCH_API_KEY MEILISEARCH_MASTER_KEY MEILISEARCH_PRODUCT_INDEX_NAME

    docker compose -f docker-compose.base.yml up -d --remove-orphans

    # Wait for base services to be healthy
    log_info "Waiting for base services to be ready..."
    sleep 10

    return 0
}

# Main deployment function
deploy() {
    # Always ensure nginx configs are correctly generated before any deployment actions
    generate_nginx_configs "blue"
    generate_nginx_configs "green"

    # First, analyze and fix any inconsistent state
    if ! analyze_and_fix_state; then
        log_error "Failed to analyze and fix VPS state"
        return 1
    fi

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
    export STRIPE_API_KEY STRIPE_WEBHOOK_SECRET
    export MEILISEARCH_HOST MEILISEARCH_API_KEY MEILISEARCH_MASTER_KEY MEILISEARCH_PRODUCT_INDEX_NAME

    docker compose -f docker-compose.base.yml up -d --remove-orphans

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
    echo "=== VPS Deployment Status ==="
    echo ""

    # Check file state
    local file_state="blue"
    if [[ -f "$CURRENT_STATE_FILE" ]]; then
        file_state=$(cat "$CURRENT_STATE_FILE")
    fi
    echo "📄 State File: $file_state"

    # Check actual running containers
    local blue_running=$(docker ps --filter "name=medusa_backend_server_blue" --filter "status=running" --quiet)
    local green_running=$(docker ps --filter "name=medusa_backend_server_green" --filter "status=running" --quiet)

    echo "🔵 Blue Deployment: $([ -n "$blue_running" ] && echo "RUNNING" || echo "STOPPED")"
    echo "🟢 Green Deployment: $([ -n "$green_running" ] && echo "RUNNING" || echo "STOPPED")"

    # Determine actual current deployment
    local actual_current=$(get_current_deployment)
    echo "✅ Actual Current: $actual_current"

    # Check base services
    echo ""
    echo "=== Base Services ==="
    local postgres_running=$(docker ps --filter "name=medusa_postgres" --filter "status=running" --quiet)
    local redis_running=$(docker ps --filter "name=medusa_redis" --filter "status=running" --quiet)
    local nginx_running=$(docker ps --filter "name=medusa_nginx" --filter "status=running" --quiet)

    echo "🐘 Postgres: $([ -n "$postgres_running" ] && echo "UP" || echo "DOWN")"
    echo "🔴 Redis: $([ -n "$redis_running" ] && echo "UP" || echo "DOWN")"
    echo "🌐 Nginx: $([ -n "$nginx_running" ] && echo "UP" || echo "DOWN")"

    # Show nginx config
    echo ""
    echo "=== Nginx Configuration ==="
    if [[ -f "$PROJECT_DIR/nginx/nginx.conf" ]]; then
        local nginx_target=$(grep -o "medusa_backend_server_[a-z]*" "$PROJECT_DIR/nginx/nginx.conf" | head -1 | sed 's/medusa_backend_server_//')
        echo "🔀 Nginx points to: $nginx_target"
    else
        echo "❌ No nginx.conf found"
    fi

    # Show all medusa containers
    echo ""
    echo "=== All Containers ==="
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(medusa|postgres|redis|nginx|portainer|uptime)"

    # Health check
    echo ""
    echo "=== Health Status ==="
    if [[ -n "$blue_running" ]]; then
        echo "🔵 Blue Health: $(curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/health 2>/dev/null || echo "UNREACHABLE")"
    fi
    if [[ -n "$green_running" ]]; then
        echo "🟢 Green Health: $(curl -s -o /dev/null -w "%{http_code}" http://localhost:9002/health 2>/dev/null || echo "UNREACHABLE")"
    fi
}

# Function to show help
show_help() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  deploy    - Perform blue-green deployment"
    echo "  rollback  - Rollback to previous deployment"
    echo "  status    - Show current deployment status"
    echo "  repair    - Analyze and fix inconsistent deployment state"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 deploy     # Deploy new version"
    echo "  $0 rollback   # Rollback to previous version"
    echo "  $0 status     # Check current status"
    echo "  $0 repair     # Fix inconsistent state"
}

# Function to repair inconsistent state
repair() {
    log_info "🔧 Repairing VPS deployment state..."

    if ! analyze_and_fix_state; then
        log_error "Failed to repair VPS state"
        return 1
    fi

    log_success "VPS state repair completed!"

    # Show final status
    echo ""
    status
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
    repair)
        repair
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
