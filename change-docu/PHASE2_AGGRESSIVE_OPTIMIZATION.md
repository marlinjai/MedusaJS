# Phase 2: Aggressive Optimization Strategy

## Target: 10-12 Minute Deployments (50% faster than current)

**Current After Phase 1:** 19 minutes
**Target After Phase 2:** 10-12 minutes
**Additional Savings:** 7-9 minutes (47% reduction)

---

## 🔍 Remaining Bottlenecks

### Current Time Breakdown (After Phase 1):

```
Total: 19m 00s
├─ npm install (builder):    11m 00s  ← 58% of time! 🔴
├─ npm install (production):  2m 00s  ← 11% of time
├─ medusa build:              1m 00s  ← 5% of time
├─ APK packages:              0m 12s  ← 1% of time
├─ Layer copying:             3m 30s  ← 18% of time
├─ Health checks:             1m 00s  ← 5% of time
└─ Nginx switch:              0m 10s  ← <1% of time
```

**The problem:** 11-minute npm install happens **every deployment** because Docker doesn't cache it.

---

## 💡 Solution: BuildKit Cache Mounts

Docker BuildKit has a **secret weapon**: cache mounts that persist between builds.

### How It Works:

```dockerfile
# OLD (no caching):
RUN npm install  # Downloads 2768 packages every time

# NEW (with cache mount):
RUN --mount=type=cache,target=/root/.npm \
    npm install  # Uses cached packages from previous builds
```

**Result:** 11 minutes → **2-3 minutes** (saves 8 minutes!)

---

## 🚀 Phase 2 Implementation

### Change 1: Add BuildKit Cache Mounts to Dockerfile

```dockerfile
# Medusa Backend Dockerfile - PHASE 2 OPTIMIZED
# Expected build time: < 12 minutes (down from 22 minutes)

# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /server

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json ./

# Install dependencies WITH CACHE MOUNT (Phase 2 optimization)
# This caches npm packages between builds
RUN --mount=type=cache,target=/root/.npm \
    npm install

# Copy source code
COPY . .

# Build the application
RUN npx medusa build

# Production stage
FROM node:20-alpine AS production

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S medusa -u 1001

# Set working directory
WORKDIR /server

# Install required packages for health checks, database connection, and Puppeteer
# Chromium and dependencies needed for PDF generation
RUN apk add --no-cache \
    curl \
    postgresql-client \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji

# Tell Puppeteer to use the installed Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Copy built application from builder stage
COPY --from=builder /server/.medusa ./.medusa

# Copy only necessary files for production
COPY --from=builder /server/package.json ./
COPY --from=builder /server/start.sh ./

# Copy source scripts for medusa exec commands
COPY --from=builder /server/src ./src

# Change to the built application directory
WORKDIR /server/.medusa/server

# Install production dependencies WITH CACHE MOUNT (Phase 2 optimization)
RUN --mount=type=cache,target=/root/.npm \
    npm install --production

# Copy startup script to the built directory and make it executable
COPY --from=builder /server/start.sh ./
RUN chmod +x ./start.sh

# Change ownership to app user
RUN chown -R medusa:nodejs /server

# Switch to app user
USER medusa

# Set environment
ENV NODE_ENV=${NODE_ENV:-production}

# Expose ports
EXPOSE 9000 9001 9002 9003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-9000}/health || exit 1

# Start the application
CMD ["./start.sh"]
```

**Changes:**

- Line 18-19: Added cache mount to builder npm install
- Line 67-68: Added cache mount to production npm install

---

### Change 2: Enable BuildKit Cache on Server (One-Time Setup)

SSH to your server and configure Docker to use BuildKit with cache:

```bash
ssh deploy@basiscamp-berlin.de

# Enable BuildKit permanently
echo 'export DOCKER_BUILDKIT=1' >> ~/.bashrc
source ~/.bashrc

# Configure Docker daemon for BuildKit
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

---

### Change 3: Optimize deploy.sh Build Command

Update the build command to explicitly use BuildKit cache:

```bash
# scripts/deploy.sh - Line ~214

# OLD:
docker compose -f docker-compose.base.yml -f "docker-compose.$target.yml" up -d --build

# NEW (Phase 2):
# Build with inline cache for better layer reuse
docker compose -f docker-compose.base.yml -f "docker-compose.$target.yml" \
    build \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    medusa-server-$target medusa-worker-$target

# Then start containers (without rebuilding)
docker compose -f docker-compose.base.yml -f "docker-compose.$target.yml" \
    up -d --no-build \
    medusa-server-$target medusa-worker-$target
```

**Benefits:**

1. Only builds target deployment (not both blue and green)
2. Uses inline cache for better layer reuse
3. Separates build and start phases (cleaner logs)

---

## 📊 Expected Results

### Current (After Phase 1):

```
Total: 19m 00s
├─ npm install (builder):    11m 00s
├─ npm install (production):  2m 00s
├─ medusa build:              1m 00s
├─ Other:                     5m 00s
```

### After Phase 2:

```
Total: 10m 30s (45% faster!)
├─ npm install (builder):     2m 30s  ← 8.5 min saved! 🎉
├─ npm install (production):  0m 45s  ← 1.25 min saved! 🎉
├─ medusa build:              1m 00s  (same)
├─ Docker build optimization: 2m 30s  ← 2.5 min saved! 🎉
├─ Health checks:             1m 00s  (same)
├─ Other:                     2m 45s
```

**Total Savings: 12.5 minutes (55% reduction from original 22 minutes!)**

---

## ⚠️ Risk Assessment

### BuildKit Cache Mounts:

- **Risk:** LOW-MEDIUM
- **Why:** Requires BuildKit (already enabled in Phase 1)
- **Potential Issues:**
  - Cache corruption (rare, fixable with `docker builder prune`)
  - Disk space (limited to 10GB)
  - First build after cache clear is slow (same as now)

### Separate Build Command:

- **Risk:** MEDIUM
- **Why:** Changes deployment flow
- **Potential Issues:**
  - Need to ensure base services stay running
  - Race conditions if not carefully implemented

---

## 🔧 Implementation Steps

### Step 1: Update Dockerfile (Low Risk)

```bash
cd /Users/marlin.pohl/software\ development/MedusaJS/busbasisberlin

# Backup current Dockerfile
cp Dockerfile Dockerfile.phase1.backup

# Apply Phase 2 changes (shown above)
```

### Step 2: Test Locally (Optional but Recommended)

```bash
# Build with cache mount locally
DOCKER_BUILDKIT=1 docker build \
  --progress=plain \
  -t medusa-test:phase2 \
  .

# Check build time
```

### Step 3: Configure Server (One-Time)

```bash
ssh deploy@basiscamp-berlin.de

# Follow server configuration steps above
```

### Step 4: Update deploy.sh (Medium Risk)

```bash
# Backup current deploy.sh
cp scripts/deploy.sh scripts/deploy.sh.phase1.backup

# Apply Phase 2 changes (shown above)
```

### Step 5: Deploy and Monitor

```bash
git add Dockerfile scripts/deploy.sh
git commit -m "perf: Phase 2 - BuildKit cache mounts (target 10-12 min)"
git push
```

---

## 🚨 Rollback Plan

### If Build Fails:

```bash
# Restore Phase 1 files
git checkout HEAD~1 -- busbasisberlin/Dockerfile busbasisberlin/scripts/deploy.sh
git commit -m "revert: rollback Phase 2 optimizations"
git push
```

### If Cache Issues:

```bash
# SSH to server
ssh deploy@basiscamp-berlin.de

# Clear Docker build cache
docker builder prune --all --force

# Redeploy (will be slow first time, then fast)
```

---

## 📋 Phase 2 vs Phase 1

| Metric                     | Before  | Phase 1  | Phase 2    | Improvement    |
| -------------------------- | ------- | -------- | ---------- | -------------- |
| **Deployment Time**        | 22m 33s | 19m 00s  | 10m 30s    | **53% faster** |
| **Builder npm install**    | 11m 00s | 11m 00s  | 2m 30s     | **77% faster** |
| **Production npm install** | 4m 00s  | 2m 00s   | 0m 45s     | **81% faster** |
| **Risk Level**             | -       | Very Low | Low-Medium | -              |
| **Complexity**             | -       | Simple   | Moderate   | -              |

---

## 🎯 Alternative: Phase 2 Lite (Lower Risk)

If you want **some** benefit without the risk of changing deploy.sh:

### Just Add Cache Mounts to Dockerfile:

```dockerfile
# Only change these two lines:
RUN --mount=type=cache,target=/root/.npm npm install
RUN --mount=type=cache,target=/root/.npm npm install --production
```

**Expected Result:** 19m → 14m (5 min saved, 26% faster)
**Risk:** LOW (just Dockerfile change)

---

## 🤔 Which Phase Should You Do?

### Choose Phase 2 Full If:

- ✅ You want maximum speed (10-12 min deployments)
- ✅ You're comfortable with moderate-risk changes
- ✅ You can monitor the first deployment closely
- ✅ You have a good rollback plan ready

### Choose Phase 2 Lite If:

- ✅ You want good speed gains (14 min deployments)
- ✅ You prefer lower risk
- ✅ You want to deploy Phase 1 first, then Phase 2 Lite later
- ✅ You're okay with incremental improvements

### Stick with Phase 1 If:

- ✅ 19 minutes is acceptable
- ✅ You want zero risk
- ✅ You prefer proven, stable builds

---

## 💡 Bonus: Future Phase 3 Ideas

Once Phase 2 is stable, consider:

1. **Pre-built Base Image** (saves 1-2 min)

   - Create `medusa-base:latest` with Chromium pre-installed
   - Update monthly

2. **Parallel Builds** (saves 30-60 sec)

   ```bash
   docker compose build --parallel
   ```

3. **Layer Optimization** (saves 30-60 sec)

   - Reorder Dockerfile layers for better caching
   - Combine RUN commands where possible

4. **Dependencies Cache Image** (saves 2-3 min on fresh builds)
   - Monthly build of dependencies-only image
   - Use as base for faster builds

**Potential Phase 3 Result:** 10m → 7-8m deployments

---

## 📊 Final Comparison

```
Before Any Changes:      ████████████████████████ 22m 33s
After Phase 1:           ███████████████████ 19m 00s (15% faster)
After Phase 2 Lite:      ██████████████ 14m 00s (38% faster)
After Phase 2 Full:      ██████████ 10m 30s (53% faster)
After Phase 3 (future):  ████████ 8m 00s (64% faster)
```

---

## 🎯 My Recommendation

**Deploy Phase 1 first** (already done), then:

1. **This week:** Monitor Phase 1 for 24-48 hours
2. **Next week:** Deploy **Phase 2 Lite** (just cache mounts in Dockerfile)
3. **Week after:** If Phase 2 Lite is stable, deploy **Phase 2 Full** (deploy.sh changes)

This gives you **incremental improvements** with **controlled risk**.

---

## ✅ Ready to Proceed?

**Phase 2 Lite is safe to implement right now** since it's just adding cache mounts to the Dockerfile we already modified.

Want me to:

- **Option A:** Implement Phase 2 Lite now (add cache mounts)
- **Option B:** Deploy Phase 1 first, Phase 2 Lite next week
- **Option C:** Go straight to Phase 2 Full (maximum speed)

**What's your preference?** 🚀
