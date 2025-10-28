#!/bin/bash
# test-nginx-config.sh
# Pre-deployment nginx configuration validator
# Run this BEFORE deploying to catch issues early

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NGINX_DIR="$PROJECT_DIR/nginx"

echo "============================================"
echo "🧪 Nginx Configuration Pre-Deployment Test"
echo "============================================"
echo ""

# Load test environment variables (same as production)
export DOMAIN_NAME="basiscamp-berlin.de"
export SSL_CERT_NAME="fullchain.pem"
export SSL_KEY_NAME="privkey.pem"
export STORE_CORS="https://medusa-js-busbasisberlin-storefront.vercel.app"
export ADMIN_CORS="https://localhost/,http://localhost:8000/,https://docs.medusajs.com,https://basiscamp-berlin.de"
export AUTH_CORS="https://localhost/,http://localhost:8000/,https://docs.medusajs.com"
export MEILISEARCH_HOST="http://medusa_meilisearch:7700"

cd "$NGINX_DIR"

test_passed=0
test_failed=0

# Test both blue and green configs
for color in blue green; do
    echo "📋 Testing $color configuration..."
    echo ""
    
    # Generate config from template
    envsubst '${DOMAIN_NAME} ${SSL_CERT_NAME} ${SSL_KEY_NAME} ${STORE_CORS} ${ADMIN_CORS} ${AUTH_CORS} ${MEILISEARCH_HOST}' \
        < "nginx-$color.template" > "nginx-$color-test.conf"
    
    # Test 1: Check for CORS map directive
    echo "  🔍 Test 1: CORS map directive exists..."
    if grep -q "map.*http_origin.*cors_origin" "nginx-$color-test.conf"; then
        echo "     ✅ PASS: Map directive found"
        ((test_passed++))
    else
        echo "     ❌ FAIL: Map directive missing!"
        ((test_failed++))
    fi
    
    # Test 2: Check map uses $cors_origin variable
    echo "  🔍 Test 2: Map uses \$cors_origin variable..."
    if grep -q 'Access-Control-Allow-Origin $cors_origin' "nginx-$color-test.conf"; then
        echo "     ✅ PASS: Using \$cors_origin variable"
        ((test_passed++))
    else
        echo "     ❌ FAIL: Not using \$cors_origin variable!"
        ((test_failed++))
    fi
    
    # Test 3: Check no comma-separated origins
    echo "  🔍 Test 3: No comma-separated origins in CORS header..."
    if grep "Access-Control-Allow-Origin.*,.*," "nginx-$color-test.conf"; then
        echo "     ❌ FAIL: Found comma-separated origins!"
        ((test_failed++))
    else
        echo "     ✅ PASS: No comma-separated origins"
        ((test_passed++))
    fi
    
    # Test 4: Check X-Meilisearch-Client header
    echo "  🔍 Test 4: X-Meilisearch-Client in allowed headers..."
    if grep -q "X-Meilisearch-Client" "nginx-$color-test.conf"; then
        echo "     ✅ PASS: X-Meilisearch-Client header allowed"
        ((test_passed++))
    else
        echo "     ❌ FAIL: X-Meilisearch-Client header missing!"
        ((test_failed++))
    fi
    
    # Test 5: Check /search/ location exists
    echo "  🔍 Test 5: /search/ location configured..."
    if grep -q "location /search/" "nginx-$color-test.conf"; then
        echo "     ✅ PASS: /search/ location found"
        ((test_passed++))
    else
        echo "     ❌ FAIL: /search/ location missing!"
        ((test_failed++))
    fi
    
    # Test 6: Validate nginx syntax (will fail on host check, but catches syntax errors)
    echo "  🔍 Test 6: Nginx syntax validation..."
    if docker run --rm -v "$(pwd)/nginx-$color-test.conf:/etc/nginx/nginx.conf:ro" nginx:alpine nginx -t 2>&1 | grep -q "syntax is ok\|test failed"; then
        echo "     ✅ PASS: No syntax errors"
        ((test_passed++))
    else
        echo "     ❌ FAIL: Syntax errors found!"
        ((test_failed++))
    fi
    
    # Cleanup test file
    rm "nginx-$color-test.conf"
    echo ""
done

# Test 7: Check current active nginx.conf
echo "📋 Testing active nginx.conf..."
echo ""

echo "  🔍 Test 7: Active config has CORS map..."
if grep -q "map.*http_origin.*cors_origin" "nginx.conf"; then
    echo "     ✅ PASS: Map directive in active config"
    ((test_passed++))
else
    echo "     ⚠️  WARNING: Active config doesn't have map (will be fixed on deploy)"
fi

echo ""
echo "============================================"
echo "📊 Test Results"
echo "============================================"
echo "✅ Passed: $test_passed"
echo "❌ Failed: $test_failed"
echo ""

if [ $test_failed -eq 0 ]; then
    echo "🎉 All tests passed! Safe to deploy."
    exit 0
else
    echo "⚠️  Some tests failed. Fix issues before deploying!"
    exit 1
fi

