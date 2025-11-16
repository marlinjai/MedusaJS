#!/bin/bash
# fix-zombie-processes.sh
# Investigate and fix zombie processes on the server

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

log_info "🔍 Investigating zombie processes..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "This script must be run as root (use sudo)"
    exit 1
fi

# Count zombie processes
ZOMBIE_COUNT=$(ps aux | grep -c '[Z]' || echo "0")
log_info "Found $ZOMBIE_COUNT zombie process(es)"

if [ "$ZOMBIE_COUNT" -eq 0 ]; then
    log_success "No zombie processes found!"
    exit 0
fi

# Show zombie processes
log_info "Zombie process details:"
echo ""
ps -eo pid,ppid,stat,comm,args | grep -w Z | head -20
echo ""

# Check if zombies are Docker-related
DOCKER_ZOMBIES=$(ps aux | grep -w Z | grep -i docker | wc -l || echo "0")
if [ "$DOCKER_ZOMBIES" -gt 0 ]; then
    log_warning "Some zombies appear to be Docker-related"
    log_info "Docker-related zombies:"
    ps aux | grep -w Z | grep -i docker
    echo ""
fi

# Check Docker container status
log_info "Checking Docker container status..."
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.State}}" | head -20
echo ""

# Check for stopped containers
STOPPED_COUNT=$(docker ps -a --filter "status=exited" --format "{{.Names}}" | wc -l || echo "0")
if [ "$STOPPED_COUNT" -gt 0 ]; then
    log_warning "Found $STOPPED_COUNT stopped container(s)"
    log_info "Stopped containers:"
    docker ps -a --filter "status=exited" --format "{{.Names}}"
    echo ""
fi

# Interactive cleanup
log_info "Cleanup options:"
echo "1. Clean up stopped Docker containers (safe)"
echo "2. Restart Docker daemon (will temporarily stop containers)"
echo "3. Kill zombie parent processes (DANGEROUS - may affect running services)"
echo "4. Just show information (no cleanup)"
echo ""
read -p "Choose an option (1-4): " choice

case $choice in
    1)
        log_info "Cleaning up stopped Docker containers..."
        docker container prune -f
        log_success "Stopped containers cleaned up"
        ;;
    2)
        log_warning "Restarting Docker daemon - this will temporarily stop all containers!"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            log_info "Restarting Docker..."
            systemctl restart docker
            sleep 5
            log_info "Starting base services..."
            cd /opt/medusa-app/busbasisberlin 2>/dev/null || cd /opt/medusa-app/busbasisberlin
            docker compose -f docker-compose.base.yml up -d 2>/dev/null || true
            log_success "Docker restarted"
        else
            log_info "Cancelled"
        fi
        ;;
    3)
        log_error "Killing zombie parent processes is DANGEROUS!"
        log_warning "This may affect running services. Only proceed if you know what you're doing."
        read -p "Are you absolutely sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            log_info "Finding zombie parent processes..."
            ZOMBIE_PARENTS=$(ps -eo pid,ppid,stat,comm | grep -w Z | awk '{print $2}' | sort -u)
            for ppid in $ZOMBIE_PARENTS; do
                PARENT_CMD=$(ps -p $ppid -o comm= 2>/dev/null || echo "unknown")
                log_warning "Zombie parent PID: $ppid (command: $PARENT_CMD)"
            done
            read -p "Enter parent PID to kill (or 'cancel'): " kill_pid
            if [ "$kill_pid" != "cancel" ] && [ -n "$kill_pid" ]; then
                log_warning "Sending SIGCHLD to parent process $kill_pid..."
                kill -CHLD $kill_pid 2>/dev/null || log_error "Failed to send signal"
            fi
        else
            log_info "Cancelled"
        fi
        ;;
    4)
        log_info "Information only - no cleanup performed"
        ;;
    *)
        log_error "Invalid option"
        exit 1
        ;;
esac

# Check zombie count after cleanup
sleep 2
NEW_ZOMBIE_COUNT=$(ps aux | grep -c '[Z]' || echo "0")
log_info "Zombie processes after cleanup: $NEW_ZOMBIE_COUNT"

if [ "$NEW_ZOMBIE_COUNT" -lt "$ZOMBIE_COUNT" ]; then
    log_success "Reduced zombie processes from $ZOMBIE_COUNT to $NEW_ZOMBIE_COUNT"
elif [ "$NEW_ZOMBIE_COUNT" -eq 0 ]; then
    log_success "All zombie processes cleaned up!"
else
    log_warning "Zombie processes still present. They may be from running services."
    log_info "If zombies persist, they're likely from:"
    log_info "  - Docker containers (normal if containers are running)"
    log_info "  - System services (usually harmless)"
    log_info "  - Parent processes that need to be restarted"
fi

# Show final status
echo ""
log_info "Final system status:"
ps aux | grep -w Z | head -10 || log_success "No zombie processes found"

