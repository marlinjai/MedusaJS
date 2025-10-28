#!/bin/bash
# Test nginx config generation locally

export DOMAIN_NAME="basiscamp-berlin.de"
export SSL_CERT_NAME="fullchain.pem"
export SSL_KEY_NAME="privkey.pem"
export STORE_CORS="https://medusa-js-busbasisberlin-storefront.vercel.app"
export ADMIN_CORS="https://localhost/,http://localhost:8000/,https://docs.medusajs.com,https://basiscamp-berlin.de"
export AUTH_CORS="https://localhost/,http://localhost:8000/,https://docs.medusajs.com"
export MEILISEARCH_HOST="http://medusa_meilisearch:7700"

echo "=== Generating nginx-green.conf from template ==="
envsubst '${DOMAIN_NAME} ${SSL_CERT_NAME} ${SSL_KEY_NAME} ${STORE_CORS} ${ADMIN_CORS} ${AUTH_CORS} ${MEILISEARCH_HOST}' < nginx-green.template > nginx-green-test.conf

echo "=== Checking for map directive ==="
grep -A 5 "map.*cors_origin" nginx-green-test.conf || echo "ERROR: No map directive found!"

echo ""
echo "=== Checking /search/ location CORS config ==="
grep -A 3 "location /search/" nginx-green-test.conf | grep "Access-Control-Allow-Origin" || echo "ERROR: No CORS header in /search/ location!"

echo ""
echo "=== Testing nginx config syntax ==="
docker run --rm -v "$(pwd)/nginx-green-test.conf:/etc/nginx/nginx.conf:ro" nginx:alpine nginx -t

rm nginx-green-test.conf
