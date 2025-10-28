#!/bin/bash
# Test nginx config with single origin

export DOMAIN_NAME="basiscamp-berlin.de"
export SSL_CERT_NAME="fullchain.pem"
export SSL_KEY_NAME="privkey.pem"
export STORE_CORS="https://medusa-js-busbasisberlin-storefront.vercel.app,http://localhost:8000"
export STOREFRONT_URL="https://medusa-js-busbasisberlin-storefront.vercel.app"
export ADMIN_CORS="http://localhost:8000"
export AUTH_CORS="http://localhost:8000"
export MEILISEARCH_HOST="http://medusa_meilisearch:7700"

echo "=== Generating config with single STOREFRONT_URL ==="
envsubst '${DOMAIN_NAME} ${SSL_CERT_NAME} ${SSL_KEY_NAME} ${STORE_CORS} ${STOREFRONT_URL} ${ADMIN_CORS} ${AUTH_CORS} ${MEILISEARCH_HOST}' < nginx-green.template > nginx-test.conf

echo ""
echo "=== Checking /search/ CORS config ==="
grep -A 10 "location /search/" nginx-test.conf | grep -E "proxy_hide_header|Access-Control-Allow-Origin"

echo ""
echo "=== Full /search/ location block ==="
grep -A 25 "location /search/" nginx-test.conf | head -30

rm nginx-test.conf
