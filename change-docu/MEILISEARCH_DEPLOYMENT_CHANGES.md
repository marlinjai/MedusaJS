# Meilisearch Deployment Configuration Changes

## Summary

Added complete Meilisearch environment variable support throughout the deployment pipeline to ensure Meilisearch works correctly in production.

## Changes Made

### 1. GitHub Actions Workflow

**File:** `.github/workflows/deploy.yml`

**Changes:**

- Added `MEILISEARCH_MASTER_KEY` to secrets list (line 59)
- Added all 4 Meilisearch variables to `envs` parameter (line 71)
- Added exports for all Meilisearch variables (lines 110-113)

**Environment variables added:**

```yaml
- MEILISEARCH_HOST
- MEILISEARCH_API_KEY
- MEILISEARCH_MASTER_KEY
- MEILISEARCH_PRODUCT_INDEX_NAME
```

### 2. Deploy with Domain Script

**File:** `busbasisberlin/scripts/deploy-with-domain.sh`

**Changes:**

- Added Meilisearch variables to env passthrough (lines 129-132)

**Added:**

```bash
MEILISEARCH_HOST="$MEILISEARCH_HOST" \
MEILISEARCH_API_KEY="$MEILISEARCH_API_KEY" \
MEILISEARCH_MASTER_KEY="$MEILISEARCH_MASTER_KEY" \
MEILISEARCH_PRODUCT_INDEX_NAME="$MEILISEARCH_PRODUCT_INDEX_NAME" \
```

### 3. Main Deploy Script

**File:** `busbasisberlin/scripts/deploy.sh`

**Changes made in 3 functions:**

#### a) `start_deployment()` function (line 154)

```bash
export MEILISEARCH_HOST MEILISEARCH_API_KEY MEILISEARCH_MASTER_KEY MEILISEARCH_PRODUCT_INDEX_NAME
```

#### b) `start_base_services()` function (line 284)

```bash
export MEILISEARCH_HOST MEILISEARCH_API_KEY MEILISEARCH_MASTER_KEY MEILISEARCH_PRODUCT_INDEX_NAME
```

#### c) `deploy()` function main export (line 331)

```bash
export MEILISEARCH_HOST MEILISEARCH_API_KEY MEILISEARCH_MASTER_KEY MEILISEARCH_PRODUCT_INDEX_NAME
```

### 4. Docker Compose - Blue Deployment

**File:** `busbasisberlin/docker-compose.blue.yml`

**Changes in 2 services:**

#### a) medusa-server-blue (lines 48-53)

```yaml
# Meilisearch configuration
- MEILISEARCH_HOST=${MEILISEARCH_HOST:-http://medusa_meilisearch:7700}
- MEILISEARCH_API_KEY=${MEILISEARCH_API_KEY}
- MEILISEARCH_MASTER_KEY=${MEILISEARCH_MASTER_KEY}
- MEILISEARCH_PRODUCT_INDEX=${MEILISEARCH_PRODUCT_INDEX_NAME:-products}
- MEILISEARCH_CATEGORY_INDEX=${MEILISEARCH_CATEGORY_INDEX_NAME:-categories}
```

#### b) medusa-worker-blue (lines 102-107)

```yaml
# Meilisearch configuration
- MEILISEARCH_HOST=${MEILISEARCH_HOST:-http://medusa_meilisearch:7700}
- MEILISEARCH_API_KEY=${MEILISEARCH_API_KEY}
- MEILISEARCH_MASTER_KEY=${MEILISEARCH_MASTER_KEY}
- MEILISEARCH_PRODUCT_INDEX=${MEILISEARCH_PRODUCT_INDEX_NAME:-products}
- MEILISEARCH_CATEGORY_INDEX=${MEILISEARCH_CATEGORY_INDEX_NAME:-categories}
```

### 5. Docker Compose - Green Deployment

**File:** `busbasisberlin/docker-compose.green.yml`

**Changes in 2 services:**

#### a) medusa-server-green (lines 48-53)

```yaml
# Meilisearch configuration
- MEILISEARCH_HOST=${MEILISEARCH_HOST:-http://medusa_meilisearch:7700}
- MEILISEARCH_API_KEY=${MEILISEARCH_API_KEY}
- MEILISEARCH_MASTER_KEY=${MEILISEARCH_MASTER_KEY}
- MEILISEARCH_PRODUCT_INDEX=${MEILISEARCH_PRODUCT_INDEX_NAME:-products}
- MEILISEARCH_CATEGORY_INDEX=${MEILISEARCH_CATEGORY_INDEX_NAME:-categories}
```

#### b) medusa-worker-green (lines 102-107)

```yaml
# Meilisearch configuration
- MEILISEARCH_HOST=${MEILISEARCH_HOST:-http://medusa_meilisearch:7700}
- MEILISEARCH_API_KEY=${MEILISEARCH_API_KEY}
- MEILISEARCH_MASTER_KEY=${MEILISEARCH_MASTER_KEY}
- MEILISEARCH_PRODUCT_INDEX=${MEILISEARCH_PRODUCT_INDEX_NAME:-products}
- MEILISEARCH_CATEGORY_INDEX=${MEILISEARCH_CATEGORY_INDEX_NAME:-categories}
```

## Files NOT Modified (Already Correct)

### ✅ docker-compose.base.yml

Already has correct Meilisearch container configuration:

```yaml
meilisearch:
  image: getmeili/meilisearch:v1.10
  environment:
    MEILI_MASTER_KEY: ${MEILISEARCH_MASTER_KEY}
  ports:
    - '7700:7700'
```

### ✅ medusa-config.ts

Already has correct Meilisearch module configuration:

```typescript
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

### ✅ nginx templates

No changes needed - Meilisearch should NOT be exposed publicly for security.

## Environment Variable Mapping

### GitHub Secret → Container Environment

| GitHub Secret                    | Container Env Var                             | Default Value                    | Used By                        |
| -------------------------------- | --------------------------------------------- | -------------------------------- | ------------------------------ |
| `MEILISEARCH_HOST`               | `MEILISEARCH_HOST`                            | `http://medusa_meilisearch:7700` | Medusa server/worker           |
| `MEILISEARCH_API_KEY`            | `MEILISEARCH_API_KEY`                         | -                                | Medusa server/worker           |
| `MEILISEARCH_MASTER_KEY`         | `MEILI_MASTER_KEY` / `MEILISEARCH_MASTER_KEY` | -                                | Meilisearch container + Medusa |
| `MEILISEARCH_PRODUCT_INDEX_NAME` | `MEILISEARCH_PRODUCT_INDEX`                   | `products`                       | Medusa server/worker           |
| -                                | `MEILISEARCH_CATEGORY_INDEX`                  | `categories`                     | Medusa server/worker           |

## Complete Variable Flow

```
GitHub Repository Secrets
    ↓
GitHub Actions Workflow (deploy.yml)
    ↓ SSH with envs parameter
VPS Server Environment
    ↓ export in scripts
deploy-with-domain.sh
    ↓ env passthrough
deploy.sh
    ↓ export for Docker Compose
Docker Compose Files (base.yml, blue.yml, green.yml)
    ↓ Container environment variables
Running Containers (Meilisearch, Medusa Server, Medusa Worker)
    ↓ Process environment
Medusa Config & Application Code
```

## Testing Checklist

After deployment, verify:

- [ ] Meilisearch container is running

  ```bash
  docker ps | grep meilisearch
  ```

- [ ] Environment variables are set in Medusa containers

  ```bash
  docker exec medusa_backend_server_blue env | grep MEILISEARCH
  ```

- [ ] Medusa can connect to Meilisearch

  ```bash
  docker logs medusa_backend_server_blue | grep -i meilisearch
  ```

- [ ] Indexes are created

  ```bash
  docker exec medusa_meilisearch curl -H "Authorization: Bearer API_KEY" http://localhost:7700/indexes
  ```

- [ ] Search functionality works
  - Test from Admin panel: Settings → Meilisearch
  - Test from Storefront: Product search

## Required GitHub Secrets

Set these in GitHub repository settings before deployment:

```
MEILISEARCH_HOST=http://medusa_meilisearch:7700
MEILISEARCH_API_KEY=[get from Meilisearch after first deploy]
MEILISEARCH_MASTER_KEY=[16+ character secure random string]
MEILISEARCH_PRODUCT_INDEX_NAME=products
```

See `setup-deployment/GITHUB_SECRETS_MEILISEARCH.md` for detailed setup instructions.

## Why Nginx Was NOT Modified

**Security Best Practice:**

- Meilisearch should NOT be exposed directly to the internet
- All external access goes through Medusa API endpoints
- Internal Docker network communication only
- Reduces attack surface and protects search infrastructure

**Access Pattern:**

```
✅ Storefront → Medusa API → Meilisearch (internal)
❌ Storefront → Nginx → Meilisearch (direct - insecure)
```

## Impact on Blue-Green Deployment

Both blue and green deployments now have:

- Full Meilisearch configuration
- Proper environment variables
- Same search functionality
- Shared Meilisearch instance (persistent across deployments)

Meilisearch container runs in `docker-compose.base.yml` so it:

- Persists during blue-green switches
- Maintains indexes and data
- Is not stopped/started during deployments
- Ensures zero search downtime

## Documentation Created

1. **MEILISEARCH_PRODUCTION_SETUP.md** - Complete production setup guide
2. **GITHUB_SECRETS_MEILISEARCH.md** - Quick GitHub secrets setup
3. **MEILISEARCH_DEPLOYMENT_CHANGES.md** - This file (change summary)
