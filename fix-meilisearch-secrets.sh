#!/bin/bash
# fix-meilisearch-secrets.sh
# Script to set missing Meilisearch GitHub secrets

echo "Setting Meilisearch GitHub secrets..."

# Set Meilisearch secrets
gh secret set MEILISEARCH_HOST --body "http://meilisearch:7700"
gh secret set MEILISEARCH_API_KEY --body "7468d808d63e0ed8bb4bee15ab7828006d4180a324ed555e667eab1238be9f32"
gh secret set MEILISEARCH_MASTER_KEY --body "38cccf5526ffb056d2776e5079eaad0ec4e2694d9ac584ffcd01c7f1c0855b91"
gh secret set MEILISEARCH_PRODUCT_INDEX_NAME --body "products"
gh secret set MEILI_ENV --body "production"

echo "✅ Meilisearch secrets have been set!"
echo ""
echo "🔧 Next steps:"
echo "1. The deployment should automatically retry or you can trigger a new deployment"
echo "2. Monitor the deployment logs to ensure Meilisearch starts correctly"
echo ""
echo "📋 Set secrets:"
echo "- MEILISEARCH_HOST: http://meilisearch:7700"
echo "- MEILISEARCH_API_KEY: [HIDDEN]"
echo "- MEILISEARCH_MASTER_KEY: [HIDDEN]"
echo "- MEILISEARCH_PRODUCT_INDEX_NAME: products"
echo "- MEILI_ENV: production"
