#!/bin/bash
# clean-vps.sh
# Complete VPS cleanup script for fresh start

set -euo pipefail

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
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Confirmation prompt
confirm_cleanup() {
    echo ""
    warn "⚠️  DANGER: This will completely clean your VPS!"
    warn "This will remove:"
    warn "  - All Docker containers, images, volumes, and networks"
    warn "  - All project files and directories"
    warn "  - SSL certificates"
    warn "  - Deploy user and SSH keys"
    warn "  - Nginx configurations"
    warn "  - Systemd services"
    echo ""

    read -p "Are you absolutely sure you want to proceed? (type 'YES' to confirm): " confirmation

    if [[ "$confirmation" != "YES" ]]; then
        log "Cleanup cancelled. Exiting safely."
        exit 0
    fi

    log "Cleanup confirmed. Starting in 5 seconds..."
    sleep 5
}

# Stop and remove all Docker containers
cleanup_docker() {
    log "🐳 Cleaning up Docker..."

    # Stop all running containers
    if docker ps -q | grep -q .; then
        log "Stopping all Docker containers..."
        docker stop $(docker ps -q) || true
    fi

    # Remove all containers
    if docker ps -aq | grep -q .; then
        log "Removing all Docker containers..."
        docker rm -f $(docker ps -aq) || true
    fi

    # Remove all images
    if docker images -q | grep -q .; then
        log "Removing all Docker images..."
        docker rmi -f $(docker images -q) || true
    fi

    # Remove all volumes
    if docker volume ls -q | grep -q .; then
        log "Removing all Docker volumes..."
        docker volume rm $(docker volume ls -q) || true
    fi

    # Remove all networks (except default ones)
    if docker network ls --format "{{.Name}}" | grep -v -E "^(bridge|host|none)$" | grep -q .; then
        log "Removing custom Docker networks..."
        docker network ls --format "{{.Name}}" | grep -v -E "^(bridge|host|none)$" | xargs -r docker network rm || true
    fi

    # Clean up Docker system
    log "Performing Docker system cleanup..."
    docker system prune -af --volumes || true

    log "✅ Docker cleanup completed"
}

# Remove project directories
cleanup_project_files() {
    log "📁 Cleaning up project files..."

    local project_dirs=(
        "/home/deploy/medusa"
        "/home/deploy/ssl"
        "/opt/medusa"
        "/var/medusa"
    )

    for dir in "${project_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            log "Removing directory: $dir"
            rm -rf "$dir"
        fi
    done

    log "✅ Project files cleanup completed"
}

# Remove SSL certificates
cleanup_ssl() {
    log "🔒 Cleaning up SSL certificates..."

    # Remove Let's Encrypt certificates
    if [[ -d "/etc/letsencrypt" ]]; then
        log "Removing Let's Encrypt certificates..."
        rm -rf /etc/letsencrypt
    fi

    # Remove SSL renewal scripts and services
    local ssl_files=(
        "/usr/local/bin/renew-ssl-certs.sh"
        "/etc/systemd/system/ssl-renewal.service"
        "/etc/systemd/system/ssl-renewal.timer"
    )

    for file in "${ssl_files[@]}"; do
        if [[ -f "$file" ]]; then
            log "Removing SSL file: $file"
            rm -f "$file"
        fi
    done

    # Stop and disable SSL renewal timer
    systemctl stop ssl-renewal.timer 2>/dev/null || true
    systemctl disable ssl-renewal.timer 2>/dev/null || true
    systemctl daemon-reload

    log "✅ SSL cleanup completed"
}

# Remove deploy user
cleanup_deploy_user() {
    log "👤 Cleaning up deploy user..."

    # Stop any processes running as deploy user
    pkill -u deploy || true
    sleep 2

    # Remove deploy user and home directory
    if id "deploy" &>/dev/null; then
        log "Removing deploy user..."
        userdel -r deploy 2>/dev/null || true
    fi

    log "✅ Deploy user cleanup completed"
}

# Remove systemd services
cleanup_systemd_services() {
    log "⚙️ Cleaning up systemd services..."

    local services=(
        "medusa-monitoring.service"
        "ssl-renewal.service"
        "ssl-renewal.timer"
    )

    for service in "${services[@]}"; do
        if systemctl is-enabled "$service" &>/dev/null; then
            log "Stopping and disabling service: $service"
            systemctl stop "$service" || true
            systemctl disable "$service" || true
        fi

        if [[ -f "/etc/systemd/system/$service" ]]; then
            log "Removing service file: $service"
            rm -f "/etc/systemd/system/$service"
        fi
    done

    systemctl daemon-reload

    log "✅ Systemd services cleanup completed"
}

# Reset firewall to defaults
reset_firewall() {
    log "🔥 Resetting firewall to defaults..."

    # Reset UFW to defaults
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw --force enable

    log "✅ Firewall reset completed"
}

# Clean up nginx
cleanup_nginx() {
    log "🌐 Cleaning up nginx..."

    # Stop nginx if running
    systemctl stop nginx 2>/dev/null || true

    # Remove custom nginx configurations
    local nginx_dirs=(
        "/etc/nginx/sites-available"
        "/etc/nginx/sites-enabled"
        "/etc/nginx/conf.d"
    )

    for dir in "${nginx_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            log "Cleaning nginx directory: $dir"
            find "$dir" -type f -name "*.conf" -delete || true
        fi
    done

    # Restore default nginx config if it exists
    if [[ -f "/etc/nginx/nginx.conf.backup" ]]; then
        mv /etc/nginx/nginx.conf.backup /etc/nginx/nginx.conf
    fi

    log "✅ Nginx cleanup completed"
}

# Clean up logs
cleanup_logs() {
    log "📝 Cleaning up logs..."

    # Clean up common log directories
    local log_dirs=(
        "/var/log/nginx"
        "/var/log/medusa"
        "/var/log/letsencrypt"
    )

    for dir in "${log_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            log "Cleaning logs in: $dir"
            find "$dir" -type f -name "*.log*" -delete || true
        fi
    done

    # Clean up systemd journal
    journalctl --vacuum-time=1d || true

    log "✅ Logs cleanup completed"
}

# Clean up temporary files
cleanup_temp_files() {
    log "🗑️ Cleaning up temporary files..."

    # Clean up common temp directories
    local temp_dirs=(
        "/tmp/medusa*"
        "/tmp/docker*"
        "/tmp/ssl*"
        "/var/tmp/medusa*"
    )

    for pattern in "${temp_dirs[@]}"; do
        if ls $pattern 1> /dev/null 2>&1; then
            log "Removing temp files: $pattern"
            rm -rf $pattern
        fi
    done

    log "✅ Temporary files cleanup completed"
}

# Show system status after cleanup
show_system_status() {
    log "📊 System status after cleanup:"
    echo ""

    info "Docker status:"
    docker ps -a || echo "No Docker containers"
    echo ""

    info "Disk usage:"
    df -h /
    echo ""

    info "Memory usage:"
    free -h
    echo ""

    info "Active services:"
    systemctl list-units --type=service --state=active | grep -E "(nginx|docker|ssh)" || echo "Core services only"
    echo ""

    info "Users:"
    cut -d: -f1 /etc/passwd | grep -E "(deploy|medusa)" || echo "No custom users found"
    echo ""
}

# Main cleanup function
main() {
    log "🚀 Starting complete VPS cleanup..."

    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
        exit 1
    fi

    confirm_cleanup

    log "🧹 Beginning cleanup process..."

    cleanup_docker
    cleanup_systemd_services
    cleanup_project_files
    cleanup_ssl
    cleanup_deploy_user
    cleanup_nginx
    reset_firewall
    cleanup_logs
    cleanup_temp_files

    show_system_status

    log "🎉 VPS cleanup completed successfully!"
    log "🚀 Your VPS is now ready for a fresh installation"
    echo ""
    log "Next steps:"
    log "1. Run the VPS setup script: curl -sSL https://raw.githubusercontent.com/marlinjai/MedusaJS/main/scripts/vps-setup.sh | bash"
    log "2. Generate SSH keys: sudo ./scripts/setup-github-ssh.sh"
    log "3. Setup SSL certificates: sudo ./scripts/setup-ssl.sh"
    log "4. Configure GitHub Secrets and deploy"
}

# Handle script arguments
case "${1:-cleanup}" in
    "cleanup"|"clean"|"reset")
        main
        ;;
    "docker-only")
        log "🐳 Docker-only cleanup..."
        cleanup_docker
        log "✅ Docker cleanup completed"
        ;;
    "files-only")
        log "📁 Files-only cleanup..."
        cleanup_project_files
        cleanup_temp_files
        log "✅ Files cleanup completed"
        ;;
    "ssl-only")
        log "🔒 SSL-only cleanup..."
        cleanup_ssl
        log "✅ SSL cleanup completed"
        ;;
    "status")
        show_system_status
        ;;
    *)
        echo "Usage: $0 [cleanup|docker-only|files-only|ssl-only|status]"
        echo ""
        echo "Commands:"
        echo "  cleanup     - Complete VPS cleanup (default)"
        echo "  docker-only - Clean up Docker containers, images, volumes only"
        echo "  files-only  - Clean up project files and temp files only"
        echo "  ssl-only    - Clean up SSL certificates and renewal scripts only"
        echo "  status      - Show current system status"
        exit 1
        ;;
esac
