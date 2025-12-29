#!/bin/bash
# secure-redis.sh
# VPS firewall hardening script for Redis security
# Blocks external Redis access and malicious IPs

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

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root or with sudo"
   exit 1
fi

log_info "Starting Redis security hardening..."

# Known malicious IPs (from attack logs)
MALICIOUS_IPS=(
    "123.56.13.193"     # Chinese IP - attempted Redis master takeover
    "139.162.173.209"   # XPS attack attempts
)

# ============================================================================
# 1. Check UFW Status
# ============================================================================
log_info "Checking UFW firewall status..."

if ! command -v ufw &> /dev/null; then
    log_error "UFW not installed. Installing..."
    apt-get update && apt-get install -y ufw
fi

# Enable UFW if not already enabled
if ! ufw status | grep -q "Status: active"; then
    log_warning "UFW is not active. Enabling..."

    # Allow SSH before enabling to prevent lockout
    ufw allow 22/tcp comment 'SSH Access'
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'

    echo "y" | ufw enable
    log_success "UFW enabled"
else
    log_success "UFW is already active"
fi

# ============================================================================
# 2. Block Redis Port Externally
# ============================================================================
log_info "Configuring Redis port protection..."

# Check if Redis port is already blocked
if ! ufw status numbered | grep -q "6379"; then
    log_info "Adding rule to block external Redis access (port 6379)..."
    ufw deny 6379/tcp comment 'Block external Redis access'
    log_success "Redis port 6379 blocked from external access"
else
    log_success "Redis port 6379 already protected"
fi

# ============================================================================
# 3. Block Malicious IPs
# ============================================================================
log_info "Blocking known malicious IPs..."

for ip in "${MALICIOUS_IPS[@]}"; do
    log_info "Checking IP: $ip"

    if ufw status | grep -q "$ip"; then
        log_success "IP $ip already blocked"
    else
        log_info "Blocking IP: $ip"
        ufw deny from "$ip" comment "Malicious IP - Redis attack"
        log_success "Blocked IP: $ip"
    fi
done

# ============================================================================
# 4. Configure Rate Limiting (Optional)
# ============================================================================
log_info "Checking rate limiting for SSH..."

if ! ufw status | grep -q "LIMIT.*22/tcp"; then
    log_info "Adding rate limiting for SSH..."
    ufw limit 22/tcp comment 'Rate limit SSH'
    log_success "SSH rate limiting enabled"
else
    log_success "SSH rate limiting already configured"
fi

# ============================================================================
# 5. Docker Network Security
# ============================================================================
log_info "Verifying Docker network security..."

# Check if Redis container port is exposed
REDIS_PORTS=$(docker port medusa_redis 2>/dev/null || echo "")

if echo "$REDIS_PORTS" | grep -q "0.0.0.0:6379"; then
    log_error "Redis port 6379 is EXPOSED to 0.0.0.0 (all interfaces)"
    log_error "This is a security risk even with UFW blocking"
    log_warning "You need to update docker-compose.base.yml to remove port exposure"
    log_warning "After updating, run: docker-compose -f docker-compose.base.yml up -d redis"
else
    log_success "Redis port not exposed externally via Docker"
fi

# ============================================================================
# 6. Summary and Recommendations
# ============================================================================
echo ""
log_success "=== Security Hardening Complete ==="
echo ""

log_info "Current UFW Rules:"
ufw status numbered

echo ""
log_info "Security Checklist:"
echo "  ✓ UFW firewall active"
echo "  ✓ Redis port 6379 blocked externally"
echo "  ✓ Malicious IPs blocked"
echo "  ✓ SSH rate limiting enabled"

if echo "$REDIS_PORTS" | grep -q "0.0.0.0:6379"; then
    echo "  ✗ Redis still exposed via Docker (needs docker-compose update)"
else
    echo "  ✓ Redis not exposed via Docker"
fi

echo ""
log_info "To verify external access is blocked, run from a different machine:"
echo "  nmap -p 6379 <YOUR_VPS_IP>"
echo "  (should show: closed or filtered)"

echo ""
log_info "To check recent attack attempts:"
echo "  docker logs medusa_redis --tail 100 | grep -i security"

echo ""
log_success "Redis security hardening complete!"


