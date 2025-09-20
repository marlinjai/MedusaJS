#!/bin/bash
# busbasisberlin/monitoring/setup-monitoring-access.sh
# Setup access methods for monitoring tools

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

# Get domain name
get_domain() {
    if [[ -z "$DOMAIN_NAME" ]]; then
        read -p "Enter your domain name (e.g., basiscamp-berlin.de): " DOMAIN_NAME
    fi
    echo "$DOMAIN_NAME"
}

# Setup direct port access
setup_direct_access() {
    local domain=$(get_domain)

    log_info "Setting up direct port access for monitoring tools..."

    # Open firewall ports
    log_info "Opening firewall ports..."
    sudo ufw allow 9443/tcp comment "Portainer HTTPS"
    sudo ufw allow 9000/tcp comment "Portainer HTTP"
    sudo ufw allow 3001/tcp comment "Uptime Kuma"
    sudo ufw allow 8080/tcp comment "Dozzle"
    sudo ufw allow 8081/tcp comment "Nginx Proxy Manager"

    log_success "Firewall ports opened successfully!"

    echo ""
    echo "📊 Direct Access URLs:"
    echo "┌─────────────────────────────────────────────────────────────┐"
    echo "│ 🐳 Portainer: http://$domain:9000 (or :9443 for HTTPS)    │"
    echo "│ 📈 Uptime Kuma: http://$domain:3001                        │"
    echo "│ 📋 Dozzle: http://$domain:8080                             │"
    echo "│ 🔧 Nginx Proxy Manager: http://$domain:8081                │"
    echo "└─────────────────────────────────────────────────────────────┘"
}

# Setup subdomain access with Nginx
setup_subdomain_access() {
    local domain=$(get_domain)

    log_info "Setting up subdomain access with Nginx reverse proxy..."

    # Copy monitoring sites configuration
    log_info "Installing Nginx configuration for monitoring subdomains..."
    sudo cp ../nginx/monitoring-sites.conf /etc/nginx/sites-available/
    sudo ln -sf /etc/nginx/sites-available/monitoring-sites.conf /etc/nginx/sites-enabled/

    # Test Nginx configuration
    log_info "Testing Nginx configuration..."
    sudo nginx -t

    if [[ $? -eq 0 ]]; then
        log_success "Nginx configuration is valid"

        # Reload Nginx
        log_info "Reloading Nginx..."
        sudo systemctl reload nginx

        log_success "Nginx reloaded successfully!"
    else
        log_error "Nginx configuration test failed"
        return 1
    fi

    # Setup SSL certificates for subdomains
    log_info "Setting up SSL certificates for monitoring subdomains..."

    subdomains=("portainer" "status" "logs" "admin")

    for subdomain in "${subdomains[@]}"; do
        log_info "Setting up SSL for $subdomain.$domain..."
        sudo certbot --nginx -d "$subdomain.$domain" --non-interactive --agree-tos --email "admin@$domain" || log_warning "SSL setup failed for $subdomain.$domain"
    done

    echo ""
    log_success "🎉 Subdomain access configured successfully!"
    echo ""
    echo "📊 Subdomain Access URLs:"
    echo "┌─────────────────────────────────────────────────────────────┐"
    echo "│ 🐳 Portainer: https://portainer.$domain                     │"
    echo "│ 📈 Uptime Kuma: https://status.$domain                      │"
    echo "│ 📋 Dozzle: https://logs.$domain                             │"
    echo "│ 🔧 Admin Panel: https://admin.$domain                       │"
    echo "└─────────────────────────────────────────────────────────────┘"
    echo ""

    log_warning "📝 DNS Setup Required:"
    echo "Add these A records to your DNS:"
    echo "- portainer.$domain → Your VPS IP"
    echo "- status.$domain → Your VPS IP"
    echo "- logs.$domain → Your VPS IP"
    echo "- admin.$domain → Your VPS IP"
}

# Setup authentication (optional)
setup_auth() {
    log_info "Setting up basic authentication for admin tools..."

    read -p "Enter username for admin access: " username
    read -s -p "Enter password: " password
    echo

    # Create htpasswd file
    sudo htpasswd -cb /etc/nginx/.htpasswd "$username" "$password"

    log_success "Authentication configured for user: $username"
    log_info "Uncomment auth_basic lines in monitoring-sites.conf to enable"
}

# Display current access status
show_access_status() {
    local domain=$(get_domain)

    echo ""
    log_info "🔍 Current Monitoring Access Status:"
    echo ""

    # Check if ports are open
    echo "🔥 Firewall Status:"
    sudo ufw status | grep -E "(9000|9443|3001|8080|8081)" || echo "No monitoring ports found in firewall rules"
    echo ""

    # Check if monitoring containers are running
    echo "🐳 Container Status:"
    containers=("portainer" "uptime-kuma" "dozzle" "nginx-proxy-manager")

    for container in "${containers[@]}"; do
        if docker ps --filter "name=$container" --filter "status=running" | grep -q "$container"; then
            echo "✅ $container is running"
        else
            echo "❌ $container is not running"
        fi
    done
    echo ""

    # Check Nginx configuration
    echo "🌐 Nginx Configuration:"
    if [[ -f /etc/nginx/sites-enabled/monitoring-sites.conf ]]; then
        echo "✅ Monitoring sites configuration is enabled"
    else
        echo "❌ Monitoring sites configuration not found"
    fi
}

# Main script logic
case "${1:-direct}" in
    "direct")
        setup_direct_access
        ;;
    "subdomain")
        setup_subdomain_access
        ;;
    "auth")
        setup_auth
        ;;
    "status")
        show_access_status
        ;;
    *)
        echo "Usage: $0 {direct|subdomain|auth|status}"
        echo ""
        echo "Access Methods:"
        echo "  direct    - Setup direct port access (default)"
        echo "  subdomain - Setup subdomain access with Nginx reverse proxy"
        echo "  auth      - Setup basic authentication"
        echo "  status    - Show current access status"
        echo ""
        echo "Examples:"
        echo "  $0 direct     # Quick setup with port access"
        echo "  $0 subdomain  # Professional setup with subdomains"
        exit 1
        ;;
esac
