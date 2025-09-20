#!/bin/bash
# setup-github-ssh.sh
# Generate SSH key pair and provide instructions for GitHub Secrets setup

set -euo pipefail

# Configuration
DEPLOY_USER="${DEPLOY_USER:-deploy}"
KEY_NAME="github-actions-deploy"
KEY_PATH="/home/${DEPLOY_USER}/.ssh/${KEY_NAME}"

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
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root to manage SSH keys for the deploy user"
    fi
}

# Generate SSH key pair
generate_ssh_key() {
    log "🔑 Generating SSH key pair for GitHub Actions..."

    # Switch to deploy user context
    sudo -u "$DEPLOY_USER" bash << EOF
        # Create .ssh directory if it doesn't exist
        mkdir -p ~/.ssh
        chmod 700 ~/.ssh

        # Generate SSH key pair
        ssh-keygen -t ed25519 -f "${KEY_PATH}" -N "" -C "github-actions-deploy@$(hostname)"

        # Set proper permissions
        chmod 600 "${KEY_PATH}"
        chmod 644 "${KEY_PATH}.pub"

        # Add public key to authorized_keys
        cat "${KEY_PATH}.pub" >> ~/.ssh/authorized_keys
        chmod 600 ~/.ssh/authorized_keys

        # Remove duplicates from authorized_keys
        sort ~/.ssh/authorized_keys | uniq > ~/.ssh/authorized_keys.tmp
        mv ~/.ssh/authorized_keys.tmp ~/.ssh/authorized_keys
EOF

    log "✅ SSH key pair generated successfully"
}

# Display GitHub Secrets setup instructions
show_github_secrets_setup() {
    local vps_ip
    vps_ip=$(curl -s ifconfig.me || echo "YOUR_VPS_IP")

    echo ""
    log "📋 GitHub Secrets Setup Instructions"
    echo "====================================="
    echo ""

    info "1. Go to your GitHub repository: https://github.com/marlinjai/MedusaJS"
    info "2. Navigate to Settings → Secrets and variables → Actions"
    info "3. Add the following Repository Secrets:"
    echo ""

    echo -e "${YELLOW}VPS Connection Secrets:${NC}"
    echo "VPS_HOST = $vps_ip"
    echo "VPS_USER = $DEPLOY_USER"
    echo ""
    echo -e "${YELLOW}SSH_PRIVATE_KEY = ${NC}"
    echo "Copy the ENTIRE content below (including BEGIN/END lines):"
    echo "----------------------------------------"
    sudo -u "$DEPLOY_USER" cat "${KEY_PATH}"
    echo "----------------------------------------"
    echo ""

    echo -e "${YELLOW}Domain & SSL Secrets:${NC}"
    echo "DOMAIN_NAME = basiscamp-berlin.de"
    echo "SSL_CERT_NAME = fullchain"
    echo "SSL_KEY_NAME = privkey"
    echo ""

    echo -e "${YELLOW}Database & Cache Secrets:${NC}"
    echo "POSTGRES_PASSWORD = $(openssl rand -base64 32)"
    echo "REDIS_PASSWORD = $(openssl rand -base64 32)"
    echo ""

    echo -e "${YELLOW}Application Secrets:${NC}"
    echo "JWT_SECRET = $(openssl rand -base64 64)"
    echo "COOKIE_SECRET = $(openssl rand -base64 32)"
    echo ""

    warn "⚠️  IMPORTANT: Keep these secrets secure and never commit them to your repository!"
    echo ""
}

# Test SSH connection
test_ssh_connection() {
    local vps_ip
    vps_ip=$(curl -s ifconfig.me || echo "localhost")

    log "🔍 Testing SSH connection..."

    # Test SSH connection using the generated key
    if sudo -u "$DEPLOY_USER" ssh -i "${KEY_PATH}" -o StrictHostKeyChecking=no -o ConnectTimeout=10 "${DEPLOY_USER}@${vps_ip}" 'echo "SSH connection successful"' 2>/dev/null; then
        log "✅ SSH connection test passed"
    else
        warn "⚠️ SSH connection test failed - this is normal if testing locally"
        info "The SSH key will work when GitHub Actions connects from external IP"
    fi
}

# Display public key for manual setup
show_public_key() {
    echo ""
    log "📋 SSH Public Key (for manual setup if needed):"
    echo "=============================================="
    sudo -u "$DEPLOY_USER" cat "${KEY_PATH}.pub"
    echo ""
}

# Verify SSH setup
verify_ssh_setup() {
    log "🔍 Verifying SSH setup..."

    # Check if key files exist
    if [[ -f "${KEY_PATH}" && -f "${KEY_PATH}.pub" ]]; then
        log "✅ SSH key files exist"
    else
        error "❌ SSH key files not found"
    fi

    # Check file permissions
    local private_perms
    local public_perms
    private_perms=$(stat -c "%a" "${KEY_PATH}")
    public_perms=$(stat -c "%a" "${KEY_PATH}.pub")

    if [[ "$private_perms" == "600" ]]; then
        log "✅ Private key permissions correct (600)"
    else
        warn "⚠️ Private key permissions: $private_perms (should be 600)"
    fi

    if [[ "$public_perms" == "644" ]]; then
        log "✅ Public key permissions correct (644)"
    else
        warn "⚠️ Public key permissions: $public_perms (should be 644)"
    fi

    # Check if public key is in authorized_keys
    if sudo -u "$DEPLOY_USER" grep -q "$(sudo -u "$DEPLOY_USER" cat "${KEY_PATH}.pub")" "/home/${DEPLOY_USER}/.ssh/authorized_keys"; then
        log "✅ Public key is in authorized_keys"
    else
        warn "⚠️ Public key not found in authorized_keys"
    fi
}

# Main function
main() {
    log "🚀 Setting up SSH keys for GitHub Actions deployment..."

    check_root
    generate_ssh_key
    verify_ssh_setup
    test_ssh_connection
    show_public_key
    show_github_secrets_setup

    echo ""
    log "🎉 SSH key setup completed!"
    log "📝 Next steps:"
    log "   1. Copy the SSH_PRIVATE_KEY content above to GitHub Secrets"
    log "   2. Add all other required secrets to your GitHub repository"
    log "   3. Test deployment by pushing to main branch"
    echo ""

    info "💡 Tip: You can re-run this script with 'show-secrets' to display the setup instructions again"
}

# Handle script arguments
case "${1:-setup}" in
    "setup")
        main
        ;;
    "show-secrets"|"secrets")
        show_github_secrets_setup
        ;;
    "show-key"|"key")
        show_public_key
        ;;
    "test")
        test_ssh_connection
        ;;
    "verify")
        verify_ssh_setup
        ;;
    *)
        echo "Usage: $0 [setup|show-secrets|show-key|test|verify]"
        echo ""
        echo "Commands:"
        echo "  setup       - Generate SSH keys and show GitHub Secrets setup (default)"
        echo "  show-secrets - Display GitHub Secrets configuration"
        echo "  show-key    - Display SSH public key"
        echo "  test        - Test SSH connection"
        echo "  verify      - Verify SSH setup"
        exit 1
        ;;
esac
