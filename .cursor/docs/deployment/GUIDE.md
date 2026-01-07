# Complete Deployment Guide

**Last Updated**: January 7, 2026
**Status**: Consolidated from 10 deployment files

Complete guide for deploying BusBasisBerlin to production with performance optimizations and troubleshooting.

---

## Table of Contents

1. [Quick Deploy](#quick-deploy)
2. [Performance Optimization](#performance-optimization)
3. [Redis Troubleshooting](#redis-troubleshooting)
4. [Environment Setup](#environment-setup)

---

## Quick Deploy

### One-Command VPS Setup

**Step 1: Setup VPS**
```bash
# Copy and run setup script (handles everything!)
scp scripts/setup-server.sh root@YOUR_VPS_IP:/tmp/ && ssh root@YOUR_VPS_IP "chmod +x /tmp/setup-server.sh && /tmp/setup-server.sh"
```

This single command:
- ✅ Installs Docker & Docker Compose
- ✅ Creates deploy user with SSH access
- ✅ Sets up firewall rules
- ✅ Configures swap file
- ✅ Sets up log rotation

**Step 2: Configure GitHub Secrets**
```bash
cd setup-deployment
./set-github-secrets.sh
```

**Step 3: Deploy**
```bash
git push origin main
# Automatic deployment via GitHub Actions
```

**Live Application**: https://basiscamp-berlin.de

---

## Performance Optimization

### Current Status
- **Before optimizations**: 22 minutes 33 seconds
- **After Phase 1**: 19 minutes (13% improvement) ✅ APPLIED
- **Target Phase 2**: 10-12 minutes (45% improvement)
- **Target Under-5**: 4-5 minutes (75% improvement)

### Phase 1: Conservative Optimizations ✅ APPLIED

**BuildKit Enabled**:
```bash
# Added to deploy.sh
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
```

**Production Dependencies Only**:
```dockerfile
# Changed in Dockerfile
RUN npm install --production
```

**Package Manager Standardization**:
- Project standardized on npm (aligns with Medusa docs)
- Generated package-lock.json for reproducible builds
- Removed yarn.lock to eliminate confusion

**Results**: 22m 33s → 19m 00s (15% faster)

### Phase 2: Aggressive Optimizations (Available)

**BuildKit Cache Mounts** (saves 8+ minutes):
```dockerfile
# Before
RUN npm install

# After
RUN --mount=type=cache,target=/root/.npm \
    npm install
```

**Explicit Service Building**:
```bash
# Build only target services
docker compose build medusa-server-$target medusa-worker-$target

# Start without rebuilding
docker compose up -d --no-build medusa-server-$target medusa-worker-$target
```

**Expected Results**: 19m → 10-12m (45% faster)

### Under 5-Minute Strategy (Aggressive)

**Parallel Builds**:
```bash
docker compose build --parallel \
    medusa-server-$target medusa-worker-$target
```

**npm ci Instead of npm install**:
```dockerfile
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit
```

**BuildKit Inline Cache**:
```bash
docker compose build \
    --parallel \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    medusa-server-$target medusa-worker-$target
```

**Expected Results**: 19m → 4-5m (75% faster)

---

## Redis Troubleshooting

### Historical Issues (All Resolved ✅)

**Issue 1: Redis URL Format** (Dec 29, 2025)
- **Problem**: `redis://:PASSWORD@host` deprecated format
- **Solution**: Changed to `redis://default:PASSWORD@host`
- **Status**: ✅ Fixed

**Issue 2: Password Quote Bug** (Dec 29, 2025)
- **Problem**: `setup-production-env.sh` wrapped password in quotes
- **Root Cause**: Docker Compose included quotes literally in URL
- **Solution**: Remove quotes from REDIS_PASSWORD, quote entire URL
- **Status**: ✅ Fixed

**Issue 3: Missing Password in Scripts** (Dec 29, 2025)
- **Problem**: REDIS_PASSWORD not passed through deployment chain
- **Solution**: Added to deploy-with-domain.sh and deploy.sh exports
- **Status**: ✅ Fixed

### Current Redis Configuration ✅

**Environment Variables**:
```env
REDIS_PASSWORD=actual_password                    # No quotes!
REDIS_URL='redis://redis:6379/0?password=${REDIS_PASSWORD}'
```

**Docker Compose**:
```yaml
# docker-compose.base.yml
redis:
  command: redis-server --requirepass ${REDIS_PASSWORD}

# docker-compose.blue/green.yml
environment:
  - REDIS_URL=${REDIS_URL}
```

### Verification Commands

**Check Redis is working**:
```bash
# SSH to VPS
ssh deploy@your-vps
cd /opt/medusa-app/busbasisberlin

# Test Redis connection
REDIS_PASSWORD=$(grep REDIS_PASSWORD= .env.production | cut -d'=' -f2-)
docker exec medusa_redis redis-cli -a "$REDIS_PASSWORD" ping
# Should return: PONG
```

**Check container logs**:
```bash
docker logs medusa_backend_server_blue 2>&1 | grep -i redis
# Should show: Connection to Redis established
# Should NOT show: [ioredis] Unhandled error event
```

---

## Environment Setup

### GitHub Secrets (Complete List)

```bash
# Domain & SSL
DOMAIN_NAME=basiscamp-berlin.de
SSL_CERT_NAME=fullchain.pem
SSL_KEY_NAME=privkey.pem

# Database
POSTGRES_PASSWORD=secure_random_password

# Redis (Critical - see troubleshooting above)
REDIS_PASSWORD=secure_redis_password

# Medusa Core
JWT_SECRET=jwt_secret_key
COOKIE_SECRET=cookie_secret_key

# Email (Resend)
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=noreply@basiscamp-berlin.de

# Storage (Supabase)
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_REGION=eu-central-1
S3_BUCKET=your_bucket_name
S3_ENDPOINT=https://xxxxx.supabase.co/storage/v1

# Search (Meilisearch)
MEILISEARCH_HOST=http://medusa_meilisearch:7700
MEILISEARCH_MASTER_KEY=your_master_key
MEILISEARCH_API_KEY=your_api_key
MEILISEARCH_PRODUCT_INDEX_NAME=products

# Payment (Stripe)
STRIPE_API_KEY=sk_live_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# Company Information
COMPANY_NAME="Basis Camp Berlin"
COMPANY_EMAIL=info@basiscamp-berlin.de
# ... (full list in original files)
```

### Automated Setup

**Set all secrets at once**:
```bash
cd setup-deployment
./set-github-secrets.sh
```

**Deploy**:
```bash
git push origin main
# Triggers GitHub Actions deployment
```

### Vercel Environment Variables

**Required for storefront**:
```env
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://basiscamp-berlin.de
MEDUSA_BACKEND_URL=https://basiscamp-berlin.de
REVALIDATE_SECRET=supersecret
```

---

## Deployment Flow

### Blue-Green Strategy

**Architecture**:
- Two identical environments (blue/green)
- Only one active at a time
- Health checks before switching
- Automatic rollback on failure

**Timeline**:
```
1. Build Phase: ~19 minutes (with Phase 1 optimizations)
   - Docker image build with BuildKit
   - Production dependencies only
   - Multi-stage build optimization

2. Deploy Phase: ~2 minutes
   - Start new environment (blue or green)
   - Wait for health checks
   - Switch Nginx to new environment
   - Stop old environment

3. Rollback (if needed): ~1 minute
   - Automatic on health check failure
   - Manual via ./scripts/deploy.sh rollback
```

### Monitoring

**Health Check Endpoints**:
```bash
# Backend health
curl https://basiscamp-berlin.de/health

# Admin health
curl https://basiscamp-berlin.de/app/health

# Meilisearch health
curl https://basiscamp-berlin.de/search/health
```

**Deployment Status**:
```bash
# Check GitHub Actions
gh run list --limit 5

# Check server status
ssh deploy@basiscamp-berlin.de "docker ps"
```

---

## Troubleshooting

### Common Issues

**Deployment fails at health check**:
1. Check container logs: `docker logs medusa_backend_server_blue`
2. Verify environment variables: `docker exec medusa_backend_server_blue env`
3. Test Redis connection (see Redis troubleshooting above)
4. Check database connection: `docker exec medusa_backend_server_blue npx medusa db:status`

**Redis connection issues**:
- See complete Redis troubleshooting section above
- All historical issues documented and resolved

**Build time too long**:
- Consider Phase 2 optimizations (cache mounts)
- Monitor npm install time (should be ~11 minutes without cache)
- Check Docker BuildKit is enabled

**Admin login fails**:
- Verify JWT_SECRET and COOKIE_SECRET are set
- Check Redis connection (sessions stored in Redis)
- Verify CORS settings match actual domain

### Emergency Procedures

**Immediate Rollback**:
```bash
ssh deploy@your-vps
cd /opt/medusa-app/busbasisberlin
./scripts/deploy.sh rollback
```

**Reset Redis** (if corrupted):
```bash
docker stop medusa_redis
docker volume rm busbasisberlin_redis_data
docker compose up -d medusa_redis
```

**Reset Database** (emergency only):
```bash
# Backup first!
./scripts/backup-database.sh
# Then reset if absolutely necessary
```

---

This consolidated guide replaces all scattered deployment documentation and provides a single source of truth for production deployment.
