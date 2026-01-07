---
description: "Deployment patterns: Redis troubleshooting, performance optimization, and blue-green deployment"
alwaysApply: false
---

# Medusa Deployment Patterns

## Redis Configuration (CRITICAL)

**✅ CORRECT Redis URL Format**:
```bash
# Use modern ACL format (not deprecated)
REDIS_URL=redis://default:PASSWORD@redis:6379

# NOT the deprecated format:
# REDIS_URL=redis://:PASSWORD@redis:6379  ❌
```

**✅ CORRECT Environment Variable Handling**:
```bash
# In setup-production-env.sh
# DON'T quote values that will be substituted into other strings
REDIS_PASSWORD=$REDIS_PASSWORD  # No quotes!
REDIS_URL=$(quote_value "redis://redis:6379/0?password=${REDIS_PASSWORD}")
```

**❌ AVOID: Quote Bug**:
```bash
# This creates quotes in the final URL!
REDIS_PASSWORD=$(quote_value "$REDIS_PASSWORD")  # ❌
REDIS_URL=redis://redis:6379/0?password=$REDIS_PASSWORD
# Result: password='secret' (quotes become part of password!)
```

## Deployment Chain Validation

**REQUIRED: Complete Variable Flow**:
```
GitHub Actions Secret
  ↓ (deploy.yml exports)
SSH Session
  ↓ (deploy-with-domain.sh passes)
deploy.sh exports
  ↓ (setup-production-env.sh uses)
.env.production file
  ↓ (docker-compose.yml reads)
Container Environment
  ↓
✅ Successful Connection
```

**Validation Commands**:
```bash
# Check each step of the chain
echo "REDIS_PASSWORD: ${REDIS_PASSWORD:+SET}"  # GitHub Actions
grep "REDIS_PASSWORD=" .env.production          # VPS file
docker exec container printenv REDIS_URL        # Container env
docker exec medusa_redis redis-cli -a "$PASS" ping  # Redis test
```

## Performance Optimization

**✅ Phase 1 (Applied - Low Risk)**:
```dockerfile
# Enable BuildKit
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Production dependencies only
RUN npm install --production

# Package manager consistency
COPY package.json package-lock.json ./
```

**✅ Phase 2 (Available - Medium Risk)**:
```dockerfile
# BuildKit cache mounts (saves 8+ minutes)
RUN --mount=type=cache,target=/root/.npm \
    npm install

# Explicit service building
docker compose build medusa-server-$target medusa-worker-$target
docker compose up -d --no-build medusa-server-$target medusa-worker-$target
```

**✅ Under-5 Strategy (Available - Aggressive)**:
```bash
# Parallel builds + npm ci
docker compose build --parallel \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    medusa-server-$target medusa-worker-$target

# npm ci instead of npm install
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit
```

## Health Check Patterns

**Container Health Checks**:
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-9000}/health || exit 1
```

**Deployment Validation**:
```bash
# Wait for health checks with timeout
timeout 300 bash -c 'while ! curl -f http://localhost:9000/health; do sleep 5; done'

# Verify all services
curl https://domain.de/health        # Backend
curl https://domain.de/app/health    # Admin
curl https://domain.de/search/health # Meilisearch
```

## Blue-Green Deployment

**Safe Deployment Pattern**:
```bash
# 1. Build new environment
docker compose -f docker-compose.base.yml -f docker-compose.$target.yml build

# 2. Start new environment
docker compose -f docker-compose.base.yml -f docker-compose.$target.yml up -d

# 3. Wait for health checks
wait_for_health_checks $target

# 4. Switch Nginx (atomic operation)
switch_nginx_to $target

# 5. Stop old environment
stop_old_environment $target
```

**Rollback Pattern**:
```bash
# Automatic rollback on health check failure
if ! health_check_passes $target; then
  echo "[ERROR] Health checks failed, rolling back..."
  switch_nginx_to $previous_target
  stop_failed_environment $target
  exit 1
fi
```

## Environment Variable Patterns

**✅ REQUIRED GitHub Secrets**:
```bash
# Core secrets (all required)
DOMAIN_NAME=your-domain.de
POSTGRES_PASSWORD=secure_password
REDIS_PASSWORD=secure_redis_password  # Critical!
JWT_SECRET=jwt_secret
COOKIE_SECRET=cookie_secret

# Integration secrets
STRIPE_API_KEY=sk_live_...
MEILISEARCH_MASTER_KEY=secure_key
RESEND_API_KEY=re_...

# Company information (for emails/PDFs)
COMPANY_NAME="Your Company"
COMPANY_EMAIL=info@domain.de
```

**Validation Script**:
```bash
# Verify all required secrets exist
required_vars=(
  "DOMAIN_NAME" "POSTGRES_PASSWORD" "REDIS_PASSWORD"
  "JWT_SECRET" "COOKIE_SECRET" "STRIPE_API_KEY"
)

for var in "${required_vars[@]}"; do
  if [[ -z "${!var}" ]]; then
    echo "ERROR: $var is not set"
    exit 1
  fi
done
```

## Docker Optimization

**✅ Multi-stage Build Pattern**:
```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /server
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm install
COPY . .
RUN npx medusa build

# Production stage
FROM node:20-alpine AS production
WORKDIR /server
COPY --from=builder /server/.medusa ./.medusa
WORKDIR /server/.medusa/server
RUN --mount=type=cache,target=/root/.npm npm install --production
```

**✅ Security Patterns**:
```dockerfile
# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S medusa -u 1001

# Change ownership and switch user
RUN chown -R medusa:nodejs /server
USER medusa
```

## Monitoring & Logging

**Deployment Monitoring**:
```bash
# Monitor deployment progress
echo "[INFO] Starting $target deployment..."
echo "[INFO] Build phase: $(date)"
echo "[INFO] Health checks: $(date)"
echo "[SUCCESS] Deployment complete: $(date)"

# Log important metrics
echo "[METRICS] Build time: ${build_duration}s"
echo "[METRICS] Health check time: ${health_duration}s"
```

**Error Logging**:
```bash
# Capture and log errors
if ! command_that_might_fail; then
  echo "[ERROR] Command failed at $(date)"
  echo "[ERROR] Last 50 lines of relevant logs:"
  docker logs container_name --tail 50
  exit 1
fi
```

## Common Deployment Issues

**Redis Connection Failures**:
1. Check REDIS_PASSWORD has no quotes in .env.production
2. Verify Redis URL format uses default:password@host
3. Test Redis auth: `docker exec medusa_redis redis-cli -a "$PASS" ping`

**Container Startup Failures**:
1. Check environment variables: `docker exec container env`
2. Check logs: `docker logs container --tail 100`
3. Verify health endpoints: `curl http://localhost:9000/health`

**Build Performance Issues**:
1. Enable BuildKit: `export DOCKER_BUILDKIT=1`
2. Use cache mounts for npm install
3. Consider parallel builds for multiple services

## Rollback Procedures

**Immediate Rollback**:
```bash
# Emergency rollback to previous deployment
ssh deploy@your-vps
cd /opt/medusa-app/busbasisberlin
./scripts/deploy.sh rollback
```

**Partial Rollback**:
```bash
# Rollback specific files
git checkout HEAD~1 -- Dockerfile scripts/deploy.sh
git commit -m "revert: rollback deployment optimization"
git push
```

This rule provides deployment troubleshooting and optimization patterns based on production experience.
