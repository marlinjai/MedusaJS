#!/bin/bash
# debug-auth.sh
# Script to debug authentication issues

echo "=== AUTHENTICATION DEBUG REPORT ==="
echo "Timestamp: $(date)"
echo ""

echo "1. Environment Variables:"
echo "   MEDUSA_BACKEND_URL: ${MEDUSA_BACKEND_URL}"
echo "   NODE_ENV: ${NODE_ENV}"
echo ""

echo "2. CORS Configuration:"
echo "   STORE_CORS: ${STORE_CORS}"
echo "   ADMIN_CORS: ${ADMIN_CORS}"
echo "   AUTH_CORS: ${AUTH_CORS}"
echo ""

echo "3. Cookie Configuration (from code):"
grep -A 10 "cookieOptions" /app/medusa-config.ts || echo "Could not read medusa-config.ts"
echo ""

echo "4. Recent Auth-Related Logs (last 50 lines):"
docker logs medusa_backend_server_green --tail 50 2>&1 | grep -i "auth\|session\|cookie\|cors" || echo "No auth logs found"
echo ""

echo "5. Container Health:"
docker ps | grep medusa
echo ""

echo "6. Test Admin Auth Endpoint:"
curl -v -X POST https://basiscamp-berlin.de/auth/user/emailpass \
  -H "Content-Type: application/json" \
  -H "Origin: https://basiscamp-berlin.de" \
  -d '{"email":"test@test.com","password":"test"}' \
  2>&1 | grep -i "set-cookie\|access-control"
echo ""

echo "=== END DEBUG REPORT ==="

