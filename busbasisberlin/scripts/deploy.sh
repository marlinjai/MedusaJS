#!/bin/bash
# deploy.sh
# Blue-Green deployment script for MedusaJS
# Handles zero-downtime deployments by switching between blue and green environments

# Don't use 'set -e' in deployment scripts - handle errors explicitly
# This allows graceful recovery and proper rollback logic
set -o pipefail  # Fail on pipe errors but allow conditional checks

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

    # Step 1: Ensure target backend container is running and healthy
    local backend_container="medusa_backend_server_${target}"
    local wait_count=0
    local max_wait=20

    log_info "Verifying $backend_container is running and healthy..."
    while true; do
        if docker ps --format "{{.Names}}" | grep -q "^${backend_container}$"; then
            # Container exists, check if healthy
            local health=$(docker inspect --format='{{.State.Health.Status}}' "$backend_container" 2>/dev/null || echo "none")
            if [[ "$health" == "healthy" ]] || [[ "$health" == "none" ]]; then
                log_success "$backend_container is ready"
                break
            fi
            log_info "$backend_container health: $health, waiting..."
        else
            if [[ $wait_count -ge $max_wait ]]; then
                log_error "Target backend container ${backend_container} does not exist after waiting!"
                return 1
            fi
            log_info "Waiting for ${backend_container} to exist... ($wait_count/$max_wait)"
        fi

        sleep 3
        wait_count=$((wait_count + 1))
    done

    # Step 2: Update nginx config file
    log_info "Updating nginx.conf to use $target deployment..."
    cp "$PROJECT_DIR/nginx/nginx-$target.conf" "$PROJECT_DIR/nginx/nginx.conf"

    # Step 3: Handle nginx container state recovery
    local container_state=$(docker inspect medusa_nginx --format '{{.State.Status}}' 2>/dev/null || echo "not-exists")
    log_info "Current nginx state: $container_state"

    # Stop nginx if it's in a bad state
    if [[ "$container_state" == "restarting" ]]; then
        log_warning "Nginx is in restart loop, stopping it..."
        docker stop medusa_nginx 2>/dev/null || true
        sleep 3
        container_state="exited"
    fi

    # Recreate nginx container to ensure it picks up the new config
    # Simple approach: stop, remove, and recreate with docker compose
    log_info "Recreating nginx container with $target config..."
    cd "$PROJECT_DIR"
    docker stop medusa_nginx 2>/dev/null || true
    docker rm medusa_nginx 2>/dev/null || true
    # Use service name 'nginx' not container name 'medusa_nginx'
    docker compose -f docker-compose.base.yml up -d nginx

    # Step 4: Wait for nginx to be healthy
    log_info "Waiting for nginx to become healthy..."
    local attempts=0
    local max_attempts=20
    sleep 2

    while [[ $attempts -lt $max_attempts ]]; do
        container_state=$(docker inspect medusa_nginx --format '{{.State.Status}}' 2>/dev/null || echo "not-exists")

        if [[ "$container_state" == "running" ]]; then
            # Verify nginx config is valid
            if docker exec medusa_nginx nginx -t 2>/dev/null; then
                log_success "Nginx is running with $target config!"
                return 0
            fi
        elif [[ "$container_state" == "restarting" ]]; then
            if [[ $attempts -eq 5 ]]; then
                log_error "Nginx stuck in restart loop! Logs:"
                docker logs --tail 30 medusa_nginx 2>&1 | tail -15
                return 1
            fi
            log_warning "Nginx restarting, waiting... (attempt $attempts/$max_attempts)"
        fi

        sleep 2
        attempts=$((attempts + 1))
    done

    log_error "Nginx failed to start after $max_attempts attempts"
    log_error "Final logs:"
    docker logs --tail 30 medusa_nginx 2>&1 | tail -15
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
    export VITE_MEDUSA_BACKEND_URL
    export STOREFRONT_URL

    # Only build and start the target deployment containers
    # Don't use --remove-orphans (would stop other deployment)
    # Don't use --force-recreate (would restart base services unnecessarily)
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

    # Check if previous deployment actually exists and is running
    local previous_container="medusa_backend_server_${previous}"
    if ! docker ps --format "{{.Names}}" | grep -q "^${previous_container}$"; then
        log_error "Cannot rollback - $previous deployment is not running!"
        log_error "No healthy deployment available. Manual intervention required."
        return 1
    fi

    # Switch nginx back to previous deployment
    if switch_nginx "$previous"; then
        echo "$previous" > "$CURRENT_STATE_FILE"
        log_success "Rollback to $previous completed successfully"
        return 0
    else
        log_error "Rollback to $previous failed"
        return 1
    fi
}

# Function to generate Nginx configuration files
generate_nginx_configs() {
    local color=$1
    log_info "Generating nginx-$color.conf from template..."

    # Set default for STOREFRONT_URL if not provided
    if [ -z "$STOREFRONT_URL" ]; then
        log_warning "STOREFRONT_URL not set, using STORE_CORS or default"
        export STOREFRONT_URL="${STORE_CORS%%,*}"  # Use first value from STORE_CORS
    fi

    cd "$PROJECT_DIR/nginx"
    envsubst '${DOMAIN_NAME} ${SSL_CERT_NAME} ${SSL_KEY_NAME} ${STORE_CORS} ${STOREFRONT_URL} ${ADMIN_CORS} ${AUTH_CORS} ${MEILISEARCH_HOST}' < nginx-$color.template > nginx-$color.conf
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
        log_warning "No deployment containers running"
        log_info "Will start fresh deployment in deploy() - skipping recovery here"
        # Don't start anything here - let deploy() handle cold start properly
        # This prevents starting the same deployment twice
    elif [[ -n "$blue_running" && "$file_state" == "green" ]]; then
        log_warning "Blue is running but file says green - correcting state file"
        echo "blue" > "$CURRENT_STATE_FILE"
        # Don't switch nginx here - will be handled by deploy() if needed
    elif [[ -n "$green_running" && "$file_state" == "blue" ]]; then
        log_warning "Green is running but file says blue - correcting state file"
        echo "green" > "$CURRENT_STATE_FILE"
        # Don't switch nginx here - will be handled by deploy() if needed
    fi

    # Always ensure nginx configs are correctly generated
    generate_nginx_configs "blue"
    generate_nginx_configs "green"

    # Ensure nginx.conf matches the actually running deployment
    if [[ -f "$CURRENT_STATE_FILE" ]]; then
        local current_state=$(cat "$CURRENT_STATE_FILE")
        local nginx_needs_update=false

        # Check if nginx.conf matches current state
        if ! grep -q "medusa_backend_server_${current_state}" "$PROJECT_DIR/nginx/nginx.conf" 2>/dev/null; then
            log_info "nginx.conf doesn't match $current_state deployment, updating..."
            cp "$PROJECT_DIR/nginx/nginx-$current_state.conf" "$PROJECT_DIR/nginx/nginx.conf"
            nginx_needs_update=true
        fi

        # Only reload/restart nginx if config was updated and nginx is running
        if [[ "$nginx_needs_update" == "true" ]] && docker ps --format '{{.Names}}' | grep -q "^medusa_nginx$"; then
            log_info "Restarting nginx to apply updated config..."
            docker restart medusa_nginx 2>/dev/null || log_warning "Could not restart nginx"
        fi
    fi

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
    export VITE_MEDUSA_BACKEND_URL
    export STOREFRONT_URL

    # Don't use --remove-orphans - it stops blue/green deployment containers
    docker compose -f docker-compose.base.yml up -d

    # Wait for base services to be healthy
    log_info "Waiting for base services to be ready..."
    sleep 10

    # Check Meilisearch is running and healthy
    local meilisearch_running=$(docker ps --filter "name=medusa_meilisearch" --filter "status=running" --quiet)
    if [[ -z "$meilisearch_running" ]]; then
        log_error "Meilisearch container is not running"
        return 1
    fi

    log_success "All base services (postgres, redis, nginx, meilisearch) are running"

    return 0
}

# Function to cleanup disk space
cleanup_disk() {
    log_info "Running disk cleanup to free space..."

    # Remove unused images and build cache
    docker image prune -af 2>/dev/null || true
    docker builder prune -af 2>/dev/null || true

    # Remove unused volumes (safe - only removes volumes with no containers attached)
    # This preserves: busbasisberlin_postgres_data, busbasisberlin_redis_data, etc.
    docker volume prune -f 2>/dev/null || true

    # Clean system
    apt-get clean 2>/dev/null || true

    log_success "Disk cleanup completed"
}

# Main deployment function
deploy() {
    # Deployment lock to prevent concurrent deployments
    local LOCK_FILE="/tmp/medusa-deploy.lock"
    if [ -f "$LOCK_FILE" ]; then
        log_error "Deployment already running (lock file exists)"
        log_error "If this is a stale lock, remove: $LOCK_FILE"
        return 1
    fi
    trap "rm -f $LOCK_FILE" EXIT RETURN
    touch $LOCK_FILE
    
    # Track deployment start time
    local DEPLOYMENT_START=$(date +%s)
    local DEPLOYMENT_ID="$(date +%Y%m%d_%H%M%S)"
    
    log_info "=== Deployment $DEPLOYMENT_ID started ==="
    
    # Always ensure nginx configs are correctly generated before any deployment actions
    generate_nginx_configs "blue"
    generate_nginx_configs "green"

    # Cleanup disk if it's getting full
    cleanup_disk

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
    log_info "Ensuring base services (postgres, redis, nginx, meilisearch) are running..."
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
    export VITE_MEDUSA_BACKEND_URL
    export STOREFRONT_URL
    # Don't use --remove-orphans - it stops blue/green deployment containers
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

    # Run smoke tests to verify deployment
    log_info "Running post-deployment smoke tests..."
    local smoke_test_failed=false
    
    # Test 1: Health endpoint
    if ! curl -f -s -o /dev/null http://localhost:9000/health 2>/dev/null && \
       ! curl -f -s -o /dev/null http://localhost:9002/health 2>/dev/null; then
        log_warning "Smoke test failed: Health endpoint not responding"
        smoke_test_failed=true
    else
        log_success "Smoke test passed: Health endpoint OK"
    fi
    
    # Test 2: Database connectivity (via health endpoint that checks DB)
    if curl -s http://localhost:9000/health 2>/dev/null | grep -q "error\|fail" || \
       curl -s http://localhost:9002/health 2>/dev/null | grep -q "error\|fail"; then
        log_warning "Smoke test warning: Health endpoint reports issues"
    fi
    
    # Calculate deployment duration
    local DEPLOYMENT_END=$(date +%s)
    local DURATION=$((DEPLOYMENT_END - DEPLOYMENT_START))
    
    # Log deployment metrics
    local LOG_DIR="/var/log/medusa"
    sudo mkdir -p "$LOG_DIR" 2>/dev/null || true
    if [ -w "$LOG_DIR" ] || sudo test -w "$LOG_DIR" 2>/dev/null; then
        echo "$(date +%s)|$DEPLOYMENT_ID|$target|success|${DURATION}s|$GITHUB_SHA" | sudo tee -a "$LOG_DIR/deploy-history.log" > /dev/null 2>&1 || true
    fi
    
    log_success "Deployment completed successfully!"
    log_success "Active deployment: $target"
    log_success "Deployment duration: ${DURATION}s"
    
    if [ "$smoke_test_failed" = true ]; then
        log_warning "Deployment succeeded but smoke tests failed - manual verification recommended"
    fi
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
