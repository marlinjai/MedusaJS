# Environment Variables Flow Analysis

## 🔍 Complete Pipeline Analysis

### 1. GitHub Actions (deploy.yml) ✅
**Status**: CORRECT
- All Meilisearch variables are defined in `env` section (lines 55-59)
- All variables are passed in `envs` list (line 69)
- All variables are exported in the script (lines 108-112)

### 2. deploy-with-domain.sh Script ✅
**Status**: CORRECT
- Receives all environment variables from GitHub Actions
- Passes all Meilisearch variables to deploy.sh (lines 129-132)

### 3. deploy.sh Script ✅
**Status**: CORRECT
- Exports Meilisearch variables in multiple places:
  - Line 154: `export MEILISEARCH_HOST MEILISEARCH_API_KEY MEILISEARCH_PRODUCT_INDEX_NAME MEILI_ENV`
  - Line 306: Same export in start_base_services()
  - Line 353: Same export in deploy()

### 4. Docker Compose Files ❌
**Status**: CRITICAL ISSUES FOUND

#### 4.1 docker-compose.base.yml ✅
- Meilisearch service correctly configured with environment variables
- Uses `MEILISEARCH_MASTER_KEY` and `MEILI_ENV`

#### 4.2 docker-compose.blue.yml ❌
**CRITICAL ISSUE**: Meilisearch environment variables are MISSING from medusa-server-blue!

**Missing variables in medusa-server-blue (lines 17-45):**
- `MEILISEARCH_HOST`
- `MEILISEARCH_API_KEY`
- `MEILISEARCH_PRODUCT_INDEX_NAME`

**Present in medusa-worker-blue (lines 94-97)** ✅

#### 4.3 docker-compose.green.yml ❌
**CRITICAL ISSUE**: Meilisearch environment variables are MISSING from medusa-server-green!

**Missing variables in medusa-server-green (lines 17-45):**
- `MEILISEARCH_HOST`
- `MEILISEARCH_API_KEY`
- `MEILISEARCH_PRODUCT_INDEX_NAME`

**Present in medusa-worker-green (lines 94-97)** ✅

### 5. Dockerfile & Startup Script ✅
**Status**: CORRECT
- Dockerfile doesn't need specific Meilisearch handling
- Startup script is generic and correct

## 🚨 ROOT CAUSE IDENTIFIED

The deployment fails because **the Medusa server containers** (`medusa-server-blue` and `medusa-server-green`) are missing the Meilisearch environment variables, while the worker containers have them.

Since the Meilisearch module is loaded when the Medusa application starts, and the server containers are the ones that initialize the application modules, they need these environment variables.

## 🔧 Required Fixes

### Fix 1: Add Meilisearch variables to medusa-server-blue
In `docker-compose.blue.yml`, add to medusa-server-blue environment section (after line 45):

```yaml
# Meilisearch configuration
- MEILISEARCH_HOST=${MEILISEARCH_HOST}
- MEILISEARCH_API_KEY=${MEILISEARCH_API_KEY}
- MEILISEARCH_PRODUCT_INDEX_NAME=${MEILISEARCH_PRODUCT_INDEX_NAME}
```

### Fix 2: Add Meilisearch variables to medusa-server-green
In `docker-compose.green.yml`, add to medusa-server-green environment section (after line 45):

```yaml
# Meilisearch configuration
- MEILISEARCH_HOST=${MEILISEARCH_HOST}
- MEILISEARCH_API_KEY=${MEILISEARCH_API_KEY}
- MEILISEARCH_PRODUCT_INDEX_NAME=${MEILISEARCH_PRODUCT_INDEX_NAME}
```

## 📊 Environment Variable Matrix

| Variable | GitHub Actions | deploy-with-domain.sh | deploy.sh | base.yml | blue-server | blue-worker | green-server | green-worker |
|----------|----------------|----------------------|-----------|----------|-------------|-------------|--------------|--------------|
| MEILISEARCH_HOST | ✅ | ✅ | ✅ | N/A | ❌ | ✅ | ❌ | ✅ |
| MEILISEARCH_API_KEY | ✅ | ✅ | ✅ | N/A | ❌ | ✅ | ❌ | ✅ |
| MEILISEARCH_PRODUCT_INDEX_NAME | ✅ | ✅ | ✅ | N/A | ❌ | ✅ | ❌ | ✅ |
| MEILISEARCH_MASTER_KEY | ✅ | ✅ | ✅ | ✅ | N/A | N/A | N/A | N/A |
| MEILI_ENV | ✅ | ✅ | ✅ | ✅ | N/A | N/A | N/A | N/A |

**Legend:**
- ✅ Present and correct
- ❌ Missing (critical issue)
- N/A Not applicable for this component

## 🎯 Impact Analysis

The server containers are the ones that:
1. Initialize the Medusa application
2. Load all modules including the custom Meilisearch module
3. Handle API requests that might need search functionality

The worker containers handle background jobs and also need Meilisearch access for product indexing operations.

**Both server and worker containers need these variables**, but the server containers are where the initial module loading failure occurs, causing the deployment to crash.
