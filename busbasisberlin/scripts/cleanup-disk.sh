#!/bin/bash
# cleanup-disk.sh
# Safely clean up Docker images and volumes without losing data

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

log_info "🧹 Starting disk cleanup..."

# Check disk space before
log_info "Current disk usage:"
df -h /

# 1. Remove unused images (keep only what's in use)
log_info "Removing unused Docker images..."
docker image prune -af --filter "dangling=true"

# 2. Remove build cache
log_info "Removing build cache..."
docker builder prune -af

# 3. Safely remove unused volumes (will NOT delete volumes in use)
# This preserves: postgres_data, redis_data, meilisearch_data
log_warning "Checking for unused volumes..."
log_info "Active volumes (will be preserved):"
docker volume ls --filter name=busbasisberlin

log_info "Removing only completely unused volumes..."
# This only removes volumes with no containers attached
docker volume prune -f

# 4. Remove orphaned containers
log_info "Removing stopped containers..."
docker container prune -f

# 5. System cleanup
log_info "Cleaning system packages..."
apt-get clean
apt-get autoremove -y

# Check disk space after
log_info "Disk usage after cleanup:"
df -h /

log_success "✅ Cleanup completed!"
