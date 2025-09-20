#!/bin/bash
# verify-deployment.sh
# Comprehensive deployment verification script

set -euo pipefail

# Configuration
DOMAIN_NAME="${DOMAIN_NAME:-basiscamp-berlin.de}"
TIMEOUT=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] INFO: $1${NC}"
}

# Test HTTP/HTTPS connectivity
test_url() {
    local url="$1"
    local description="$2"
    local expected_status="${3:-200}"

    info "Testing $description: $url"

    if curl -f -s -m "$TIMEOUT" -w "HTTP %{http_code} - %{time_total}s" "$url" > /dev/null; then
        log "✅ $description is accessible"
        return 0
    else
        error "❌ $description is not accessible"
        return 1
    fi
}

# Test SSL certificate
test_ssl() {
    local domain="$1"
    local description="$2"

    info "Testing SSL certificate for $description: $domain"

    if echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null; then
        local expiry
        expiry=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
        log "✅ SSL certificate valid until: $expiry"
        return 0
    else
        error "❌ SSL certificate test failed for $domain"
        return 1
    fi
}

# Test Docker services
test_docker_services() {
    info "Testing Docker services..."

    local services=(
        "medusa_postgres:PostgreSQL Database"
        "medusa_redis:Redis Cache"
        "medusa_nginx:Nginx Load Balancer"
        "medusa_portainer:Portainer"
        "medusa_uptime_kuma:Uptime Kuma"
    )

    for service_info in "${services[@]}"; do
        local container_name="${service_info%%:*}"
        local description="${service_info##*:}"

        if docker ps --format "{{.Names}}" | grep -q "^${container_name}$"; then
            local status
            status=$(docker inspect --format='{{.State.Status}}' "$container_name" 2>/dev/null || echo "not found")
            if [[ "$status" == "running" ]]; then
                log "✅ $description ($container_name) is running"
            else
                error "❌ $description ($container_name) status: $status"
            fi
        else
            error "❌ $description ($container_name) not found"
        fi
    done
}

# Test application deployment
test_application_deployment() {
    info "Testing application deployment..."

    # Check for blue or green deployment
    local blue_running=false
    local green_running=false

    if docker ps --format "{{.Names}}" | grep -q "medusa_backend_server_blue"; then
        blue_running=true
        log "✅ Blue deployment is running"
    fi

    if docker ps --format "{{.Names}}" | grep -q "medusa_backend_server_green"; then
        green_running=true
        log "✅ Green deployment is running"
    fi

    if [[ "$blue_running" == false && "$green_running" == false ]]; then
        error "❌ No application deployment is running"
        return 1
    fi

    # Check which deployment is active
    if [[ -f "/home/deploy/medusa/busbasisberlin/nginx/nginx.conf" ]]; then
        if grep -q "medusa_backend_server_blue" "/home/deploy/medusa/busbasisberlin/nginx/nginx.conf"; then
            log "✅ Blue deployment is currently active"
        elif grep -q "medusa_backend_server_green" "/home/deploy/medusa/busbasisberlin/nginx/nginx.conf"; then
            log "✅ Green deployment is currently active"
        else
            warn "⚠️ Could not determine active deployment"
        fi
    fi
}

# Test database connectivity
test_database() {
    info "Testing database connectivity..."

    if docker exec medusa_postgres pg_isready -U medusa -d medusa > /dev/null 2>&1; then
        log "✅ PostgreSQL database is ready"

        # Test connection count
        local connections
        connections=$(docker exec medusa_postgres psql -U medusa -d medusa -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ')
        log "📊 Active database connections: $connections"
    else
        error "❌ PostgreSQL database is not ready"
    fi
}

# Test Redis connectivity
test_redis() {
    info "Testing Redis connectivity..."

    if docker exec medusa_redis redis-cli ping > /dev/null 2>&1; then
        log "✅ Redis is responding"

        # Test Redis info
        local memory_usage
        memory_usage=$(docker exec medusa_redis redis-cli info memory | grep "used_memory_human" | cut -d: -f2 | tr -d '\r')
        log "📊 Redis memory usage: $memory_usage"
    else
        error "❌ Redis is not responding"
    fi
}

# Test system resources
test_system_resources() {
    info "Testing system resources..."

    # Check disk space
    local disk_usage
    disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [[ $disk_usage -lt 80 ]]; then
        log "✅ Disk usage: ${disk_usage}% (healthy)"
    else
        warn "⚠️ Disk usage: ${disk_usage}% (high)"
    fi

    # Check memory usage
    local memory_usage
    memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    if [[ $memory_usage -lt 80 ]]; then
        log "✅ Memory usage: ${memory_usage}% (healthy)"
    else
        warn "⚠️ Memory usage: ${memory_usage}% (high)"
    fi

    # Check load average
    local load_avg
    load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    log "📊 Load average: $load_avg"
}

# Generate deployment report
generate_report() {
    local timestamp
    timestamp=$(date +'%Y-%m-%d %H:%M:%S')

    echo ""
    log "📋 Deployment Verification Report - $timestamp"
    echo "=============================================="

    # Service URLs
    echo ""
    log "🌐 Service URLs:"
    echo "   Main App: https://$DOMAIN_NAME"
    echo "   Admin Panel: https://$DOMAIN_NAME/app"
    echo "   Health Check: https://$DOMAIN_NAME/health"
    echo "   Portainer: https://portainer.$DOMAIN_NAME"
    echo "   Uptime Kuma: https://uptime.$DOMAIN_NAME"

    # Container status
    echo ""
    log "🐳 Container Status:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(medusa_|NAMES)"

    # Resource usage
    echo ""
    log "📊 Resource Usage:"
    echo "   Disk: $(df -h / | awk 'NR==2 {print $5}') used"
    echo "   Memory: $(free -h | grep Mem | awk '{print $3 "/" $2}')"
    echo "   Load: $(uptime | awk -F'load average:' '{print $2}')"

    echo ""
    log "✅ Verification completed"
}

# Main verification function
main() {
    log "🚀 Starting deployment verification..."
    echo ""

    local failed_tests=0

    # Test infrastructure services
    log "🏗️ Testing infrastructure services..."
    test_docker_services || ((failed_tests++))
    echo ""

    # Test application deployment
    log "🎯 Testing application deployment..."
    test_application_deployment || ((failed_tests++))
    echo ""

    # Test database and cache
    log "💾 Testing database and cache..."
    test_database || ((failed_tests++))
    test_redis || ((failed_tests++))
    echo ""

    # Test web services
    log "🌐 Testing web services..."
    test_url "https://$DOMAIN_NAME/health" "Main Application Health" || ((failed_tests++))
    test_url "https://$DOMAIN_NAME/app" "Admin Panel" || ((failed_tests++))
    test_url "https://portainer.$DOMAIN_NAME" "Portainer" || ((failed_tests++))
    test_url "https://uptime.$DOMAIN_NAME" "Uptime Kuma" || ((failed_tests++))
    echo ""

    # Test SSL certificates
    log "🔒 Testing SSL certificates..."
    test_ssl "$DOMAIN_NAME" "Main Domain" || ((failed_tests++))
    test_ssl "portainer.$DOMAIN_NAME" "Portainer Subdomain" || ((failed_tests++))
    test_ssl "uptime.$DOMAIN_NAME" "Uptime Kuma Subdomain" || ((failed_tests++))
    echo ""

    # Test system resources
    log "⚙️ Testing system resources..."
    test_system_resources
    echo ""

    # Generate report
    generate_report

    # Final result
    if [[ $failed_tests -eq 0 ]]; then
        log "🎉 All tests passed! Deployment is healthy."
        exit 0
    else
        error "❌ $failed_tests test(s) failed. Please check the issues above."
        exit 1
    fi
}

# Handle script arguments
case "${1:-verify}" in
    "verify"|"test"|"check")
        main
        ;;
    "quick")
        log "🚀 Quick verification..."
        test_url "https://$DOMAIN_NAME/health" "Main Application"
        test_url "https://portainer.$DOMAIN_NAME" "Portainer"
        test_url "https://uptime.$DOMAIN_NAME" "Uptime Kuma"
        log "✅ Quick verification completed"
        ;;
    "ssl")
        log "🔒 SSL certificate verification..."
        test_ssl "$DOMAIN_NAME" "Main Domain"
        test_ssl "portainer.$DOMAIN_NAME" "Portainer"
        test_ssl "uptime.$DOMAIN_NAME" "Uptime Kuma"
        ;;
    "docker")
        log "🐳 Docker services verification..."
        test_docker_services
        test_application_deployment
        ;;
    *)
        echo "Usage: $0 [verify|quick|ssl|docker]"
        echo ""
        echo "Commands:"
        echo "  verify - Full deployment verification (default)"
        echo "  quick  - Quick health check of web services"
        echo "  ssl    - SSL certificate verification only"
        echo "  docker - Docker services verification only"
        exit 1
        ;;
esac
