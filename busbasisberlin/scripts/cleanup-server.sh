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
cd /opt/medusa-app/busbasisberlin

# Stop only application containers (preserve infrastructure)
log_info "Stopping application containers (preserving infrastructure)..."
docker stop medusa_backend_server_blue medusa_backend_worker_blue 2>/dev/null || true
docker stop medusa_backend_server_green medusa_backend_worker_green 2>/dev/null || true

# Remove only application containers
log_info "Removing application containers..."
docker rm medusa_backend_server_blue medusa_backend_worker_blue 2>/dev/null || true
docker rm medusa_backend_server_green medusa_backend_worker_green 2>/dev/null || true

# Clean up unused Docker networks (but preserve our shared network)
log_info "Cleaning up unused Docker networks..."
docker network prune -f 2>/dev/null || true

# Clean up unused Docker volumes (but preserve data volumes)
log_info "Cleaning up unused Docker volumes..."
docker volume prune -f 2>/dev/null || true

# Clean up Docker images
log_info "Cleaning up unused Docker images..."
docker image prune -af 2>/dev/null || true

# Fix file permissions
log_info "Fixing file permissions..."
sudo chown -R deploy:deploy /opt/medusa-app/busbasisberlin 2>/dev/null || true

# Clean Git repository
log_info "Cleaning Git repository..."
git clean -fd 2>/dev/null || sudo git clean -fd 2>/dev/null || true
git reset --hard HEAD 2>/dev/null || true

# Remove temporary files
log_info "Removing temporary files..."
rm -rf tmp/* 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true

# Fix SSL file permissions (but don't delete certificates)
log_info "Fixing SSL file permissions..."
sudo chown -R deploy:deploy nginx/ssl/ 2>/dev/null || true
sudo chmod 600 nginx/ssl/*.pem 2>/dev/null || true

log_success "✅ Server cleanup completed!"
log_info "You can now run a fresh deployment."
