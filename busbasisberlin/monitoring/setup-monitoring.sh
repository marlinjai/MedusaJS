#!/bin/bash
# busbasisberlin/monitoring/setup-monitoring.sh
# Setup comprehensive monitoring stack for blue-green deployments

set -e

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

# Get domain name from environment or prompt
get_domain() {
    if [[ -z "$DOMAIN_NAME" ]]; then
        read -p "Enter your domain name (e.g., basiscamp-berlin.de): " DOMAIN_NAME
    fi
    echo "$DOMAIN_NAME"
}

# Main setup function
setup_monitoring() {
    local domain=$(get_domain)
    
    log_info "Setting up monitoring stack for domain: $domain"
    
    # Create monitoring directory if it doesn't exist
    mkdir -p monitoring
    cd monitoring
    
    # Start monitoring stack
    log_info "Starting monitoring services..."
    docker compose -f docker-compose.monitoring.yml up -d
    
    # Wait for services to be ready
    log_info "Waiting for services to start..."
    sleep 30
    
    # Display access information
    echo ""
    log_success "🎉 Monitoring stack deployed successfully!"
    echo ""
    echo "📊 Access your monitoring tools:"
    echo "┌─────────────────────────────────────────────────────────────┐"
    echo "│ 🐳 Portainer (Docker Management)                            │"
    echo "│    https://$domain:9443                                     │"
    echo "│    http://$domain:9000                                      │"
    echo "│                                                             │"
    echo "│ 📈 Uptime Kuma (Service Monitoring)                        │"
    echo "│    http://$domain:3001                                      │"
    echo "│                                                             │"
    echo "│ 📋 Dozzle (Docker Logs)                                    │"
    echo "│    http://$domain:8080                                      │"
    echo "│                                                             │"
    echo "│ 🔧 Nginx Proxy Manager (Optional)                          │"
    echo "│    http://$domain:8081                                      │"
    echo "└─────────────────────────────────────────────────────────────┘"
    echo ""
    
    # Setup instructions
    echo "🚀 Next Steps:"
    echo "1. Access Portainer and create admin account"
    echo "2. Configure Uptime Kuma to monitor your services:"
    echo "   - https://$domain (Storefront)"
    echo "   - https://$domain/app (Admin)"
    echo "   - https://$domain/health (API Health)"
    echo "3. Use Dozzle to monitor real-time container logs"
    echo ""
    
    # Firewall reminder
    log_warning "🔥 Firewall Reminder:"
    echo "Make sure these ports are open on your VPS:"
    echo "- 9443, 9000 (Portainer)"
    echo "- 3001 (Uptime Kuma)"
    echo "- 8080 (Dozzle)"
    echo "- 8081 (Nginx Proxy Manager)"
    echo ""
    echo "Run: sudo ufw allow 9443,9000,3001,8080,8081/tcp"
}

# Health check function
check_monitoring_health() {
    log_info "Checking monitoring services health..."
    
    services=("portainer" "uptime-kuma" "dozzle" "nginx-proxy-manager")
    
    for service in "${services[@]}"; do
        if docker ps --filter "name=$service" --filter "status=running" | grep -q "$service"; then
            log_success "$service is running"
        else
            log_error "$service is not running"
        fi
    done
}

# Stop monitoring function
stop_monitoring() {
    log_info "Stopping monitoring stack..."
    cd monitoring
    docker compose -f docker-compose.monitoring.yml down
    log_success "Monitoring stack stopped"
}

# Main script logic
case "${1:-setup}" in
    "setup")
        setup_monitoring
        ;;
    "health")
        check_monitoring_health
        ;;
    "stop")
        stop_monitoring
        ;;
    "restart")
        stop_monitoring
        sleep 5
        setup_monitoring
        ;;
    *)
        echo "Usage: $0 {setup|health|stop|restart}"
        echo ""
        echo "Commands:"
        echo "  setup   - Deploy monitoring stack (default)"
        echo "  health  - Check monitoring services health"
        echo "  stop    - Stop monitoring stack"
        echo "  restart - Restart monitoring stack"
        exit 1
        ;;
esac
