#!/bin/bash
# fix-redis-slave.sh
# Automated script to detect and fix Redis slave misconfiguration
# This prevents the authentication failures caused by Redis being in read-only replica mode

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Check if Redis container exists
if ! docker ps -a | grep -q "medusa_redis"; then
    log_error "Redis container 'medusa_redis' not found"
    exit 1
fi

# Try with password if REDIS_PASSWORD is set
REDIS_AUTH=""
if [[ -n "${REDIS_PASSWORD:-}" ]]; then
    REDIS_AUTH="-a ${REDIS_PASSWORD}"
    log_info "Using Redis password authentication"
fi

log_info "Checking Redis replication status..."

# Get Redis role
REDIS_ROLE=$(docker exec medusa_redis redis-cli $REDIS_AUTH INFO replication 2>/dev/null | grep "^role:" | cut -d: -f2 | tr -d '\r\n' || echo "unknown")

log_info "Current Redis role: $REDIS_ROLE"

if [[ "$REDIS_ROLE" == "slave" ]]; then
    log_error "Redis is operating as a SLAVE (read-only replica)"

    # Get master configuration
    MASTER_CONFIG=$(docker exec medusa_redis redis-cli $REDIS_AUTH CONFIG GET replicaof 2>/dev/null | tail -1 | tr -d '\r\n' || echo "unknown")
    log_error "Configured master: $MASTER_CONFIG"

    log_warning "This will cause authentication and session storage failures"
    log_info "Promoting Redis from slave to master..."

    # Promote to master
    docker exec medusa_redis redis-cli $REDIS_AUTH REPLICAOF NO ONE

    # Verify the change
    sleep 2
    NEW_ROLE=$(docker exec medusa_redis redis-cli $REDIS_AUTH INFO replication 2>/dev/null | grep "^role:" | cut -d: -f2 | tr -d '\r\n' || echo "unknown")

    if [[ "$NEW_ROLE" == "master" ]]; then
        log_success "Successfully promoted Redis to master"
        log_success "Redis is now writable"

        # Test write operation
        if docker exec medusa_redis redis-cli $REDIS_AUTH SET fix_test "success" > /dev/null 2>&1; then
            log_success "Write test passed"
            docker exec medusa_redis redis-cli $REDIS_AUTH DEL fix_test > /dev/null 2>&1
        else
            log_warning "Write test failed - may need manual intervention"
        fi

        log_info "Restarting Medusa containers to re-establish connections..."
        docker restart medusa_backend_server_green medusa_backend_server_blue medusa_backend_worker_green medusa_backend_worker_blue 2>/dev/null || true

        log_success "Fix complete! Admin login should now work"
    else
        log_error "Failed to promote Redis to master - role is still: $NEW_ROLE"
        exit 1
    fi

elif [[ "$REDIS_ROLE" == "master" ]]; then
    log_success "Redis is already operating as master (writable)"

    # Still check for unwanted REPLICAOF config
    REPLICAOF_CONFIG=$(docker exec medusa_redis redis-cli $REDIS_AUTH CONFIG GET replicaof 2>/dev/null | tail -1 | tr -d '\r\n' || echo "")
    if [[ -n "$REPLICAOF_CONFIG" ]]; then
        log_warning "REPLICAOF config is set: $REPLICAOF_CONFIG"
        log_info "Clearing REPLICAOF configuration..."
        docker exec medusa_redis redis-cli $REDIS_AUTH REPLICAOF NO ONE
        log_success "REPLICAOF cleared"
    fi

    log_success "No action needed - Redis is healthy"
else
    log_error "Unknown Redis role: $REDIS_ROLE"
    log_error "Manual intervention required"
    exit 1
fi


