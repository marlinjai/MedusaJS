#!/bin/bash
# health-check.sh
# Comprehensive health check script for MedusaJS deployment
# Validates all services are running and responding correctly

set -e

# Configuration
HEALTH_ENDPOINT="https://localhost/health"
MAX_RETRIES=10
RETRY_INTERVAL=5

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

# Function to check container health
check_container_health() {
    local container_name=$1
    local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "not_found")

    case $health_status in
        "healthy")
            log_success "$container_name: healthy"
            return 0
            ;;
        "unhealthy")
            log_error "$container_name: unhealthy"
            return 1
            ;;
        "starting")
            log_warning "$container_name: still starting up"
            return 1
            ;;
        "not_found")
            log_error "$container_name: container not found"
            return 1
            ;;
        *)
            log_warning "$container_name: unknown status ($health_status)"
            return 1
            ;;
    esac
}

# Function to check HTTP endpoint
check_http_endpoint() {
    local url=$1
    local description=$2

    log_info "Checking $description at $url..."

    local response=$(curl -k -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

    if [[ "$response" == "200" ]]; then
        log_success "$description: HTTP $response"
        return 0
    else
        log_error "$description: HTTP $response"
        return 1
    fi
}

# Function to check database connectivity
check_database() {
    log_info "Checking database connectivity..."

    local db_check=$(docker exec medusa_postgres pg_isready -U postgres 2>/dev/null || echo "failed")

    if [[ "$db_check" == *"accepting connections"* ]]; then
        log_success "Database: accepting connections"
        return 0
    else
        log_error "Database: not accepting connections"
        return 1
    fi
}

# Function to check Redis connectivity
check_redis() {
    log_info "Checking Redis connectivity..."

    local redis_check=$(docker exec medusa_redis redis-cli ping 2>/dev/null || echo "failed")

    if [[ "$redis_check" == "PONG" ]]; then
        log_success "Redis: responding to ping"
        return 0
    else
        log_error "Redis: not responding to ping"
        return 1
    fi
}

# Function to get current deployment
get_current_deployment() {
    local current_state_file="../.current_deployment"
    if [[ -f "$current_state_file" ]]; then
        cat "$current_state_file"
    else
        echo "blue"  # Default to blue
    fi
}

# Main health check function
perform_health_check() {
    local overall_health=0
    local current_deployment=$(get_current_deployment)

    log_info "Starting comprehensive health check..."
    log_info "Current deployment: $current_deployment"
    echo ""

    # Check base services
    log_info "=== Base Services ==="
    check_container_health "medusa_postgres" || overall_health=1
    check_container_health "medusa_redis" || overall_health=1
    check_container_health "medusa_nginx" || overall_health=1
    echo ""

    # Check current deployment containers
    log_info "=== Current Deployment ($current_deployment) ==="
    check_container_health "medusa_backend_server_$current_deployment" || overall_health=1
    check_container_health "medusa_backend_worker_$current_deployment" || overall_health=1
    echo ""

    # Check service connectivity
    log_info "=== Service Connectivity ==="
    check_database || overall_health=1
    check_redis || overall_health=1
    echo ""

    # Check HTTP endpoints
    log_info "=== HTTP Endpoints ==="
    check_http_endpoint "$HEALTH_ENDPOINT" "Health endpoint" || overall_health=1
    echo ""

    # Overall result
    if [[ $overall_health -eq 0 ]]; then
        log_success "All health checks passed!"
        return 0
    else
        log_error "Some health checks failed!"
        return 1
    fi
}

# Function to wait for healthy state
wait_for_healthy() {
    local retries=0

    log_info "Waiting for all services to become healthy..."

    while [[ $retries -lt $MAX_RETRIES ]]; do
        if perform_health_check > /dev/null 2>&1; then
            log_success "All services are healthy!"
            return 0
        fi

        ((retries++))
        log_info "Attempt $retries/$MAX_RETRIES failed, retrying in $RETRY_INTERVAL seconds..."
        sleep $RETRY_INTERVAL
    done

    log_error "Services did not become healthy within the timeout period"
    return 1
}

# Function to show container status
show_status() {
    echo "Container Status:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(medusa|postgres|redis|nginx)" || echo "No containers found"
}

# Function to show help
show_help() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  check     - Perform comprehensive health check (default)"
    echo "  wait      - Wait for all services to become healthy"
    echo "  status    - Show container status"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 check     # Run health check once"
    echo "  $0 wait      # Wait for services to be healthy"
    echo "  $0 status    # Show container status"
}

# Main script logic
case "${1:-check}" in
    check)
        perform_health_check
        ;;
    wait)
        wait_for_healthy
        ;;
    status)
        show_status
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
