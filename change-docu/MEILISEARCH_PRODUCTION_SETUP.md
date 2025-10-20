# Meilisearch Production Setup Guide

## Overview

This guide explains how Meilisearch is configured in production and what GitHub secrets need to be set for proper deployment.

## Architecture

### Container Communication

- **Meilisearch** runs as a standalone container (`medusa_meilisearch`) in `docker-compose.base.yml`
- **Medusa backend** (blue/green deployments) communicate with Meilisearch internally via Docker network
- **Meilisearch is NOT exposed publicly** through nginx for security reasons
- The **storefront** uses Medusa's API endpoints (not direct Meilisearch access)

### Network Flow

```
Storefront (Vercel)
    ↓ HTTPS
Nginx (VPS)
    ↓ Internal routing
Medusa Backend (Blue/Green)
    ↓ Internal Docker network (port 7700)
Meilisearch Container
```

## Required GitHub Secrets

You must set these secrets in your GitHub repository settings:

### 1. MEILISEARCH_HOST

**Value:** `http://medusa_meilisearch:7700`

**Explanation:**

- Internal Docker container name and port
- Medusa backend connects to Meilisearch using this internal address
- Do NOT use external domain here

### 2. MEILISEARCH_API_KEY

**Value:** Your Meilisearch API key (search key)

**How to get it:**

1. SSH into your VPS
2. Run: `docker exec medusa_meilisearch curl -X GET 'http://localhost:7700/keys' -H "Authorization: Bearer YOUR_MASTER_KEY"`
3. Look for the key with `actions: ["search"]`
4. Copy the `key` value

**Alternative:** Generate a new key:

```bash
docker exec medusa_meilisearch curl -X POST 'http://localhost:7700/keys' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer YOUR_MASTER_KEY" \
  --data-binary '{
    "description": "Medusa Search Key",
    "actions": ["search"],
    "indexes": ["products", "categories"],
    "expiresAt": null
  }'
```

### 3. MEILISEARCH_MASTER_KEY

**Value:** Your Meilisearch master key

**Explanation:**

- Used in `docker-compose.base.yml` as `MEILI_MASTER_KEY`
- Admin key with full access to Meilisearch
- Must be at least 16 characters
- Keep this secret secure!

**How to set initially:**

- First deployment: Set this to a secure random string (min 16 chars)
- Subsequent deployments: Use the same value to maintain access

### 4. MEILISEARCH_PRODUCT_INDEX_NAME

**Value:** `products`

**Explanation:**

- Name of the Meilisearch index for products
- Standard value is `products`
- Must match the index created by your sync workflows

## Environment Variable Flow

### 1. GitHub Actions → VPS

```yaml
# .github/workflows/deploy.yml
env:
  MEILISEARCH_HOST: ${{ secrets.MEILISEARCH_HOST }}
  MEILISEARCH_API_KEY: ${{ secrets.MEILISEARCH_API_KEY }}
  MEILISEARCH_MASTER_KEY: ${{ secrets.MEILISEARCH_MASTER_KEY }}
  MEILISEARCH_PRODUCT_INDEX_NAME: ${{ secrets.MEILISEARCH_PRODUCT_INDEX_NAME }}
# These are passed via SSH to the VPS
```

### 2. deploy-with-domain.sh

```bash
# Passes variables to deploy.sh
env MEILISEARCH_HOST="$MEILISEARCH_HOST" \
    MEILISEARCH_API_KEY="$MEILISEARCH_API_KEY" \
    MEILISEARCH_MASTER_KEY="$MEILISEARCH_MASTER_KEY" \
    MEILISEARCH_PRODUCT_INDEX_NAME="$MEILISEARCH_PRODUCT_INDEX_NAME" \
    ./scripts/deploy.sh deploy
```

### 3. deploy.sh

```bash
# Exports variables for Docker Compose
export MEILISEARCH_HOST MEILISEARCH_API_KEY MEILISEARCH_MASTER_KEY MEILISEARCH_PRODUCT_INDEX_NAME
```

### 4. Docker Compose Files

```yaml
# docker-compose.base.yml (Meilisearch container)
environment:
  MEILI_MASTER_KEY: ${MEILISEARCH_MASTER_KEY}

# docker-compose.blue/green.yml (Medusa containers)
environment:
  - MEILISEARCH_HOST=${MEILISEARCH_HOST:-http://medusa_meilisearch:7700}
  - MEILISEARCH_API_KEY=${MEILISEARCH_API_KEY}
  - MEILISEARCH_MASTER_KEY=${MEILISEARCH_MASTER_KEY}
  - MEILISEARCH_PRODUCT_INDEX=${MEILISEARCH_PRODUCT_INDEX_NAME:-products}
  - MEILISEARCH_CATEGORY_INDEX=${MEILISEARCH_CATEGORY_INDEX_NAME:-categories}
```

### 5. Medusa Config

```typescript
// medusa-config.ts
if (process.env.MEILISEARCH_HOST && process.env.MEILISEARCH_API_KEY) {
	modules.push({
		resolve: './src/modules/meilisearch',
		options: {
			host: process.env.MEILISEARCH_HOST,
			apiKey: process.env.MEILISEARCH_API_KEY,
			productIndexName: process.env.MEILISEARCH_PRODUCT_INDEX || 'products',
			categoryIndexName: process.env.MEILISEARCH_CATEGORY_INDEX || 'categories',
		},
	});
}
```

## Security Considerations

### Why Meilisearch Is NOT Exposed via Nginx

1. **Security Risk**: Direct public access to Meilisearch is a security risk
2. **API Key Management**: Harder to control and rotate keys
3. **Rate Limiting**: No built-in protection against abuse
4. **Best Practice**: All external requests should go through your Medusa API

### Proper Access Pattern

✅ **Correct:**

```
Storefront → Medusa API (/store/search) → Meilisearch (internal)
Admin Panel → Medusa API (/admin/meilisearch/*) → Meilisearch (internal)
```

❌ **Incorrect:**

```
Storefront → Nginx → Meilisearch (direct public access)
```

## Testing the Setup

### 1. Verify Meilisearch Container

```bash
docker ps | grep meilisearch
docker logs medusa_meilisearch
```

### 2. Check Health

```bash
docker exec medusa_meilisearch curl http://localhost:7700/health
```

### 3. Test from Medusa Container

```bash
docker exec medusa_backend_server_blue curl -H "Authorization: Bearer YOUR_API_KEY" http://medusa_meilisearch:7700/indexes
```

### 4. Check Medusa Logs

```bash
docker logs medusa_backend_server_blue | grep -i meilisearch
```

## Troubleshooting

### Issue: Medusa can't connect to Meilisearch

**Solution:** Check `MEILISEARCH_HOST` is set to `http://medusa_meilisearch:7700` (internal container name)

### Issue: "Invalid API key" errors

**Solution:** Ensure `MEILISEARCH_API_KEY` matches a key in Meilisearch with search permissions

### Issue: Meilisearch indexes are empty

**Solution:**

1. Check if sync workflows are enabled
2. Manually trigger sync: POST to `/admin/meilisearch/sync`
3. Check job logs: `docker logs medusa_backend_worker_blue`

### Issue: "MEILI_MASTER_KEY is too short" error

**Solution:** Master key must be at least 16 characters long

## Initial Setup Checklist

- [ ] Set `MEILISEARCH_HOST` secret in GitHub
- [ ] Set `MEILISEARCH_API_KEY` secret in GitHub
- [ ] Set `MEILISEARCH_MASTER_KEY` secret in GitHub (min 16 chars)
- [ ] Set `MEILISEARCH_PRODUCT_INDEX_NAME` secret in GitHub
- [ ] Deploy to VPS
- [ ] Verify Meilisearch container is running
- [ ] Test internal connectivity from Medusa
- [ ] Trigger initial product sync
- [ ] Test search functionality from storefront

## API Endpoints (via Medusa)

Your storefront should use these Medusa API endpoints:

- **Search Products**: `GET /store/products?q=search_term`
- **Get Categories**: `GET /store/product-categories`

Admin endpoints for Meilisearch management:

- **Sync Products**: `POST /admin/meilisearch/sync`
- **Check Indexes**: `GET /admin/meilisearch/indexes`
- **Search (Admin)**: `POST /admin/meilisearch/search`

## Summary

✅ **Meilisearch runs internally** in Docker network
✅ **No public nginx route** needed for Meilisearch
✅ **Environment variables** flow: GitHub → SSH → deploy scripts → Docker Compose → containers
✅ **Security**: All external access goes through Medusa API
✅ **4 GitHub secrets** required for full functionality
