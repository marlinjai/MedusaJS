#!/bin/bash
# diagnose-redis-issue.sh
# Comprehensive diagnostic for Redis connectivity issues

echo "=========================================="
echo "REDIS DIAGNOSTICS"
echo "=========================================="
echo ""

echo "1. REDIS CONTAINER STATUS"
echo "-------------------------"
docker ps -a --filter "name=medusa_redis" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "2. REDIS NETWORK"
echo "-------------------------"
docker inspect medusa_redis --format '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' 2>/dev/null || echo "Cannot inspect Redis"
echo ""

echo "3. REDIS PASSWORD CONFIGURATION"
echo "-------------------------"
docker exec medusa_redis redis-cli CONFIG GET requirepass 2>&1 || echo "Cannot query Redis config"
echo ""

echo "4. REDIS INFO (with password if needed)"
echo "-------------------------"
# Try without password first
if docker exec medusa_redis redis-cli PING 2>/dev/null | grep -q "PONG"; then
    echo "Redis responds WITHOUT password"
    docker exec medusa_redis redis-cli INFO server | head -10
else
    echo "Redis requires password, trying with password from env..."
    # Get password from docker-compose
    REDIS_PASS=$(grep "REDIS_PASSWORD=" /opt/medusa-app/busbasisberlin/.env.production 2>/dev/null | cut -d= -f2- | tr -d "'\"")
    if [ -n "$REDIS_PASS" ]; then
        docker exec medusa_redis redis-cli -a "$REDIS_PASS" PING 2>&1 || echo "Password auth failed"
    fi
fi
echo ""

echo "5. GREEN CONTAINER ENVIRONMENT"
echo "-------------------------"
echo "REDIS_URL:"
docker exec medusa_backend_server_green env 2>/dev/null | grep "REDIS_URL=" || echo "GREEN: No REDIS_URL found"
echo "REDIS_PASSWORD:"
docker exec medusa_backend_server_green env 2>/dev/null | grep "REDIS_PASSWORD=" || echo "GREEN: No REDIS_PASSWORD found"
echo ""

echo "6. BLUE CONTAINER ENVIRONMENT (if running)"
echo "-------------------------"
if docker ps --filter "name=medusa_backend_server_blue" --filter "status=running" | grep -q blue; then
    echo "REDIS_URL:"
    docker exec medusa_backend_server_blue env 2>/dev/null | grep "REDIS_URL=" || echo "BLUE: No REDIS_URL found"
    echo "REDIS_PASSWORD:"
    docker exec medusa_backend_server_blue env 2>/dev/null | grep "REDIS_PASSWORD=" || echo "BLUE: No REDIS_PASSWORD found"
else
    echo "Blue containers not running"
fi
echo ""

echo "7. NETWORK CONNECTIVITY TEST"
echo "-------------------------"
echo "From green container to redis:"
docker exec medusa_backend_server_green ping -c 2 redis 2>&1 || echo "Cannot ping redis from green"
echo ""

echo "8. .ENV.PRODUCTION FILE"
echo "-------------------------"
if [ -f "/opt/medusa-app/busbasisberlin/.env.production" ]; then
    echo "File exists, Redis vars:"
    grep "REDIS" /opt/medusa-app/busbasisberlin/.env.production || echo "No REDIS vars found"
else
    echo ".env.production not found!"
fi
echo ""

echo "9. DOCKER COMPOSE FILES CHECK"
echo "-------------------------"
echo "Base compose Redis config:"
grep -A 5 "redis:" /opt/medusa-app/busbasisberlin/docker-compose.base.yml | head -10
echo ""
echo "Green compose REDIS_URL:"
grep "REDIS_URL" /opt/medusa-app/busbasisberlin/docker-compose.green.yml
echo ""

echo "=========================================="
echo "DIAGNOSIS COMPLETE"
echo "=========================================="

