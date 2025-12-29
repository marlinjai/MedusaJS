#!/bin/bash
# emergency-fix-green.sh
# Fix the running green deployment to use Redis password

set -e

echo "[INFO] Checking Redis container status..."
docker ps -a | grep medusa_redis

echo ""
echo "[INFO] Checking Redis configuration..."
docker exec medusa_redis redis-cli CONFIG GET requirepass 2>/dev/null || echo "Redis may not be accessible"

echo ""
echo "[INFO] Checking current green container environment..."
docker exec medusa_backend_server_green env | grep REDIS || echo "No REDIS env vars found"

echo ""
echo "[INFO] =========================================="
echo "[INFO] EMERGENCY FIX: Updating green deployment"
echo "[INFO] =========================================="
echo ""

cd /opt/medusa-app/busbasisberlin

# Check if .env.production exists and has REDIS_PASSWORD
if [ -f ".env.production" ]; then
    echo "[INFO] Checking .env.production for Redis password..."
    grep "REDIS_" .env.production || echo "No REDIS vars in .env.production"
else
    echo "[ERROR] .env.production not found!"
fi

echo ""
echo "[INFO] Restarting green containers to pick up new environment..."
docker-compose -f docker-compose.base.yml -f docker-compose.green.yml down
docker-compose -f docker-compose.base.yml -f docker-compose.green.yml up -d

echo ""
echo "[SUCCESS] Green containers restarted"
echo "[INFO] Check logs with: docker logs medusa_backend_server_green"

