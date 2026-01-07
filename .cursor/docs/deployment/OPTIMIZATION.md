# Deployment Performance Optimization Guide

**Last Updated**: January 7, 2026
**Status**: Consolidated from 4 optimization documents

This guide consolidates all deployment optimization strategies, from conservative improvements to aggressive speed optimizations.

---

## Table of Contents

1. [Current Performance](#current-performance)
2. [Phase 1: Conservative Optimizations](#phase-1-conservative-optimizations)
3. [Phase 2: Aggressive Optimizations](#phase-2-aggressive-optimizations)
4. [Under 5-Minute Strategy](#under-5-minute-strategy)
5. [Risk Assessment](#risk-assessment)
6. [Implementation Timeline](#implementation-timeline)

---

## Current Performance

### Baseline Metrics

- **Before any optimizations**: 22 minutes 33 seconds
- **After Phase 1**: 19 minutes (13% improvement)
- **Target Phase 2**: 10-12 minutes (45% improvement)
- **Target Under-5**: 4-5 minutes (75% improvement)

### Time Breakdown Analysis

```
Current Deployment (22m 33s):
├─ Docker build: 20m 00s
│  ├─ npm install (builder): 11m 00s     ← 49% of total time!
│  ├─ npm install (production): 4m 00s   ← Required by Medusa
│  ├─ medusa build: 1m 00s
│  └─ other: 4m 00s
├─ Health checks: 1m 30s
└─ Nginx switch: 10s
```

**Key Finding**: npm install consumes 67% of deployment time (15 out of 22 minutes).

---

## Phase 1: Conservative Optimizations

**Status**: ✅ APPROVED FOR PRODUCTION
**Risk Level**: Very Low
**Expected Savings**: 3-4 minutes (15% reduction)

### Optimization 1: Enable BuildKit ✅

```bash
# Added to deploy.sh
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
```

**Benefits**:

- Modern Docker build system
- Better layer caching
- Parallel build capabilities
- 30-60 seconds saved

**Risk**: None (backward compatible)

### Optimization 2: Production Dependencies Only ✅

```dockerfile
# Changed in Dockerfile
RUN npm install --production
```

**Benefits**:

- 2-3 minutes faster install
- Smaller image size (~200-300MB saved)
- No dev dependencies in production

**Risk**: Very Low (standard practice)

### Optimization 3: Package Manager Standardization

```dockerfile
# Add to Dockerfile
COPY package.json package-lock.json ./
```

**Current State**: Project has yarn.lock but uses npm in production
**Solution**: Standardize on npm (aligns with Medusa documentation)

**Actions**:

1. Generate package-lock.json: `npm install`
2. Remove yarn.lock: `git rm yarn.lock`
3. Update Dockerfile to use package-lock.json

**Benefits**:

- Consistent package manager
- Better cache hits
- Aligns with Medusa best practices

---

## Phase 2: Aggressive Optimizations

**Status**: MEDIUM RISK - Requires Testing
**Risk Level**: Low-Medium
**Expected Savings**: 7-9 minutes (47% reduction)

### Optimization 1: BuildKit Cache Mounts

**The Problem**: npm install downloads 2768+ packages every deployment

**Solution**: Persistent cache between builds

```dockerfile
# Before
RUN npm install

# After
RUN --mount=type=cache,target=/root/.npm \
    npm install
```

**Expected Impact**:

- First build: Same time (cache empty)
- Subsequent builds: 11m → 2-3m (77% faster!)

### Optimization 2: Explicit Service Building

**Current**: Builds all services in compose files

```bash
docker compose -f docker-compose.base.yml -f "docker-compose.$target.yml" up -d --build
```

**Optimized**: Build only target services

```bash
# Build only target services
docker compose build medusa-server-$target medusa-worker-$target

# Start without rebuilding
docker compose up -d --no-build medusa-server-$target medusa-worker-$target
```

**Benefits**:

- Doesn't rebuild unused services
- Cleaner build logs
- Faster startup

**Risk**: Changes deployment flow (requires validation)

---

## Under 5-Minute Strategy

**Status**: AGGRESSIVE OPTIMIZATION
**Target**: 4-5 minutes (75% faster than original)
**Risk Level**: Low (uses standard practices)

### Key Changes

#### 1. Parallel Builds

```bash
# Build server and worker simultaneously
docker compose build --parallel \
    medusa-server-$target medusa-worker-$target
```

**Time Saved**: ~50% of build time (parallel vs sequential)

#### 2. npm ci Instead of npm install

```dockerfile
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit
```

**Benefits**:

- `npm ci` is 2-10x faster than `npm install`
- `--prefer-offline` uses cache first
- `--no-audit` skips security audit (saves 30-60 seconds)

**Time Saved**: 2-3 minutes per install (4-6 minutes total)

#### 3. BuildKit Inline Cache

```bash
docker compose build \
    --parallel \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    medusa-server-$target medusa-worker-$target
```

**Benefits**:

- Better layer reuse between builds
- Faster rebuilds when only source changes

**Time Saved**: 1-2 minutes on subsequent builds

### Expected Results

```
Under-5 Optimized (4m 30s):
├─ npm ci (builder):          1m 30s  ← 85% faster!
├─ npm ci (production):       0m 30s  ← 87% faster!
├─ medusa build:              1m 00s  (same)
├─ Docker parallel build:     1m 00s  ← 75% faster!
├─ Health checks:             1m 00s  (same)
└─ Other:                     0m 30s
```

---

## Risk Assessment

### Low Risk Optimizations

| Change            | Risk     | Rollback | Validation        |
| ----------------- | -------- | -------- | ----------------- |
| BuildKit Enable   | None     | Easy     | Build succeeds    |
| --production flag | Very Low | Easy     | Container starts  |
| package-lock.json | Low      | Easy     | npm install works |

### Medium Risk Optimizations

| Change          | Risk       | Rollback | Validation               |
| --------------- | ---------- | -------- | ------------------------ |
| Cache mounts    | Low-Medium | Moderate | Clear cache if issues    |
| Explicit builds | Medium     | Easy     | Services start correctly |
| Parallel builds | Low        | Easy     | Both containers build    |

### Validation Checklist

**Pre-Deployment**:

- [ ] Build completes locally
- [ ] No Docker syntax errors
- [ ] package-lock.json is valid

**Post-Deployment**:

- [ ] Build time under target
- [ ] Both containers start
- [ ] Health checks pass
- [ ] Admin login works
- [ ] Can create offers
- [ ] PDF generation works
- [ ] No errors in logs (24 hours)

---

## Implementation Timeline

### Recommended Approach: Incremental

#### Week 1: Phase 1 (Conservative)

1. Enable BuildKit ✅
2. Add --production flag ✅
3. Generate package-lock.json
4. Monitor for 48 hours

#### Week 2: Phase 2 (Moderate)

1. Add cache mounts to Dockerfile
2. Test explicit service building
3. Monitor for 1 week

#### Week 3: Under-5 (Aggressive)

1. Add parallel builds
2. Switch to npm ci
3. Add inline cache
4. Monitor closely

### Alternative: All-at-Once (Higher Risk)

If comfortable with risk, implement all optimizations together:

- Faster time to benefit
- Single deployment to monitor
- Higher chance of issues
- Harder to isolate problems

---

## Rollback Plans

### If Build Fails

```bash
# Revert Dockerfile
git checkout HEAD~1 -- Dockerfile
git commit -m "revert: rollback Dockerfile optimization"
git push
```

### If Container Fails to Start

```bash
# SSH to server
ssh deploy@your-vps
cd /opt/medusa-app/busbasisberlin
./scripts/deploy.sh rollback
```

### If Cache Issues

```bash
# Clear Docker build cache
ssh deploy@your-vps
docker builder prune --all --force
# Redeploy (will be slow first time, then fast)
```

### If npm ci Issues

```bash
# Revert to npm install
git checkout HEAD~1 -- Dockerfile
# Or edit Dockerfile to change npm ci back to npm install
```

---

## Server Configuration

### One-Time BuildKit Setup

```bash
ssh deploy@your-vps

# Enable BuildKit permanently
echo 'export DOCKER_BUILDKIT=1' >> ~/.bashrc
source ~/.bashrc

# Configure Docker daemon
sudo tee -a /etc/docker/daemon.json <<EOF
{
  "features": {
    "buildkit": true
  },
  "builder": {
    "gc": {
      "enabled": true,
      "defaultKeepStorage": "10GB"
    }
  }
}
EOF

sudo systemctl restart docker
```

### Cache Management

```bash
# Check cache size
docker system df

# Clean cache if needed (emergency only)
docker builder prune --all --force
```

---

## Monitoring and Validation

### Key Metrics to Track

| Metric                 | Phase 1 Target | Phase 2 Target | Under-5 Target |
| ---------------------- | -------------- | -------------- | -------------- |
| Total deployment time  | 19 min         | 12 min         | 5 min          |
| Builder npm install    | 11 min         | 3 min          | 1.5 min        |
| Production npm install | 2 min          | 1 min          | 0.5 min        |
| Docker build overhead  | 4 min          | 3 min          | 1 min          |

### Success Indicators

```bash
# Build logs should show:
#1 [medusa-server-blue builder 1/7] FROM node:20-alpine
#1 [medusa-worker-blue builder 1/7] FROM node:20-alpine
# ↑ Parallel builds working

#8 [builder 4/7] RUN --mount=type=cache,target=/root/.npm npm ci
#8 CACHED
# ↑ Cache working

[SUCCESS] blue deployment started
[INFO] Server: healthy, Worker: healthy
# ↑ Health checks passing
```

### Failure Indicators

```bash
# Watch for these issues:
ERROR: failed to solve
# ↑ Dockerfile syntax error

[ERROR] Target deployment failed health checks
# ↑ Container startup failure

npm ERR! Cannot read properties of undefined
# ↑ npm ci issue (revert to npm install)
```

---

## Future Optimizations (Phase 3+)

### Pre-built Base Images

Create monthly base image with common dependencies:

```dockerfile
FROM medusa-base:monthly AS builder
# Skip APK installs, use pre-installed packages
```

**Estimated savings**: 1-2 minutes

### Remote Cache Registry

```bash
docker buildx build \
    --cache-from=type=registry,ref=your-registry/cache \
    --cache-to=type=registry,ref=your-registry/cache
```

**Estimated savings**: 1-2 minutes on fresh builds

### Dependency Cache Image

Monthly build of dependencies-only image:

```dockerfile
FROM node:20-alpine AS deps
COPY package-lock.json ./
RUN npm ci --production
# Use as base for faster production installs
```

**Estimated savings**: 1-2 minutes

**Potential Phase 3 Result**: 5m → 2-3m deployments

---

## Summary

| Phase        | Time    | Improvement | Risk       | Status      |
| ------------ | ------- | ----------- | ---------- | ----------- |
| **Baseline** | 22m 33s | -           | -          | -           |
| **Phase 1**  | 19m 00s | 15% faster  | Very Low   | ✅ Approved |
| **Phase 2**  | 10-12m  | 45% faster  | Low-Medium | 🚧 Planning |
| **Under-5**  | 4-5m    | 75% faster  | Low        | 🚧 Planning |
| **Phase 3**  | 2-3m    | 85% faster  | Medium     | 🔮 Future   |

**Recommendation**: Start with Phase 1 (already approved), then incrementally implement Phase 2 and Under-5 optimizations based on success and comfort level.

---

## References

- [Medusa v2.11 Build Documentation](https://docs.medusajs.com/learn/production/build)
- [Docker BuildKit Documentation](https://docs.docker.com/build/buildkit/)
- [npm ci Documentation](https://docs.npmjs.com/cli/v10/commands/npm-ci)
- [Docker Compose Build Options](https://docs.docker.com/compose/reference/build/)
