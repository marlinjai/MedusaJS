#!/bin/bash
# cleanup-server.sh
# Emergency server cleanup script for when deployment gets stuck

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

log_info "🧹 Starting complete server cleanup..."

# Navigate to project directory
cd /home/deploy/medusa/busbasisberlin

# Stop all Docker containers
log_info "Stopping all Docker containers..."
docker stop $(docker ps -q) 2>/dev/null || true

# Remove all Docker containers
log_info "Removing all Docker containers..."
docker rm $(docker ps -aq) 2>/dev/null || true

# Remove all Docker networks (except default ones)
log_info "Cleaning up Docker networks..."
docker network ls --filter "name=busbasisberlin" --format "{{.Name}}" | xargs -r docker network rm 2>/dev/null || true

# Clean up Docker volumes (preserve data volumes)
log_info "Cleaning up unused Docker volumes..."
docker volume prune -f 2>/dev/null || true

# Clean up Docker images
log_info "Cleaning up unused Docker images..."
docker image prune -af 2>/dev/null || true

# Fix file permissions
log_info "Fixing file permissions..."
sudo chown -R deploy:deploy /home/deploy/medusa/busbasisberlin 2>/dev/null || true

# Clean Git repository
log_info "Cleaning Git repository..."
git clean -fd 2>/dev/null || sudo git clean -fd 2>/dev/null || true
git reset --hard HEAD 2>/dev/null || true

# Remove temporary files
log_info "Removing temporary files..."
rm -rf tmp/* 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true

# Clean up any leftover SSL files that might have permission issues
log_info "Cleaning up SSL files..."
sudo rm -rf nginx/ssl/*.pem 2>/dev/null || true

log_success "✅ Server cleanup completed!"
log_info "You can now run a fresh deployment."
