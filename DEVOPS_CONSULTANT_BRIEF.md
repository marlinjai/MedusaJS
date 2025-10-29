# DevOps Consultant Brief - MedusaJS Blue-Green Deployment

## Project Overview

**Stack:** MedusaJS e-commerce platform (Node.js/TypeScript)
**Infrastructure:** Self-hosted VPS (Ubuntu 24.04) + Vercel (storefront)
**Deployment Strategy:** Blue-Green with Docker + Nginx
**Current Status:** 90% complete, needs final review and fixes

---

## Architecture

### **Backend (VPS - Linode/DigitalOcean)**

- **MedusaJS Server Containers:** Blue + Green instances (ports 9000/9002)
- **MedusaJS Worker Containers:** Blue + Green instances (ports 9001/9003)
- **Nginx:** SSL termination + blue-green traffic routing
- **PostgreSQL 15:** Shared database (persistent)
- **Redis 7:** Shared cache/events (persistent)
- **Meilisearch:** Product search engine (persistent)
- **Portainer:** Container management UI
- **Uptime Kuma:** Service monitoring

### **Frontend (Vercel)**

- Next.js storefront
- Auto-deploys via webhook after backend success

---

## Deployment Flow (Current Implementation)

```
1. Push to main → GitHub Actions trigger
2. SSH into VPS as deploy user
3. Pull latest code (preserve SSL certs)
4. Blue-Green Deployment:
   ├─ Keep current deployment running
   ├─ Build & start target deployment
   ├─ Wait for health checks (120s)
   ├─ Switch Nginx to target
   └─ Stop old deployment
5. Trigger Vercel deployment
6. Run smoke tests
```

**Zero-downtime guaranteed** - old containers serve traffic until new ones are healthy.

---

## Recent Work Done

### **Infrastructure Setup** ✅

- VPS configured with Docker + Docker Compose
- Blue-green deployment scripts implemented
- SSL certificates (Let's Encrypt) configured
- GitHub Actions workflow created
- All secrets configured

### **Fixes Applied** ✅

- Removed aggressive flags (`--remove-orphans`, `--force-recreate`)
- Fixed service name vs container name issues
- Added deployment lock file
- Improved error handling (removed `set -e`)
- Added deployment metrics & logging
- SSL certificate preservation during git operations
- State analysis & recovery logic

---

## Your Task

### **Goal**

Review and finalize the CI/CD pipeline to ensure:

1. **Guaranteed zero-downtime** on every deployment
2. **Resilient to any VPS state** (crashed containers, partial state, etc.)
3. **Proper blue-green switching** (both deployments can run simultaneously)
4. **Clear error handling** with automatic rollback

### **Specific Issues to Verify**

1. **Nginx Switching Logic**

   - Currently: stops, removes, recreates container
   - Question: Is this the cleanest approach or should we use config reload?
   - File: `busbasisberlin/scripts/deploy.sh` lines 100-189

2. **State Recovery**

   - Currently: `analyze_and_fix_state()` corrects inconsistencies
   - Question: Does this handle all edge cases properly?
   - File: `busbasisberlin/scripts/deploy.sh` lines 277-372

3. **Rollback Strategy**

   - Currently: Switches nginx back to previous deployment
   - Issue: What if previous deployment was already stopped?
   - File: `busbasisberlin/scripts/deploy.sh` lines 238-268

4. **Environment Variable Passing**
   - 40+ variables passed through 3 layers (GH Actions → deploy-with-domain.sh → deploy.sh)
   - Question: Can this be simplified/validated better?

### **Nice-to-Haves (If Time Permits)**

- Add health check retries with exponential backoff
- Implement canary deployments (10% → 100% traffic)
- Add Slack/email notifications
- Container vulnerability scanning in CI

---

## Files to Review

**Critical Files:**

1. `.github/workflows/deploy.yml` - GitHub Actions workflow (151 lines)
2. `busbasisberlin/scripts/deploy.sh` - Main deployment logic (675 lines)
3. `busbasisberlin/scripts/deploy-with-domain.sh` - Domain/SSL wrapper (144 lines)
4. `busbasisberlin/docker-compose.base.yml` - Base services (136 lines)
5. `busbasisberlin/docker-compose.{blue,green}.yml` - Deployment configs (134 lines each)
6. `busbasisberlin/nginx/nginx-{blue,green}.template` - Nginx configs (329 lines each)

**Documentation:**

- `change-docu/DEPLOYMENT_VERIFICATION_COMPLETE.md` - All edge cases analyzed
- `change-docu/CICD_COMPREHENSIVE_FIXES.md` - Applied fixes & best practices
- `change-docu/DEPLOYMENT_GUIDE.md` - Setup instructions

---

## Current Known Issues

### **Issue 1: Nginx not starting with correct config**

**Symptom:** After recreating nginx, it sometimes loads old config
**Suspected Cause:** Docker volume mount caching
**Priority:** HIGH

### **Issue 2: Base services restarting unnecessarily**

**Status:** Fixed (removed --force-recreate) but needs verification
**Priority:** MEDIUM

### **Issue 3: Rollback might fail if no previous deployment**

**Status:** Fix applied but needs testing
**Priority:** MEDIUM

---

## Access & Environment

- **Repository:** `https://github.com/marlinjai/MedusaJS`
- **VPS Access:** Will be provided (deploy user with sudo)
- **Domain:** basiscamp-berlin.de
- **Stack:** Ubuntu 24.04, Docker 24.x, Docker Compose v2
- **CI/CD:** GitHub Actions (workflow already configured)

---

## Deliverables

1. **Code Review Report** - Identify any remaining issues
2. **Fixes Implemented** - Critical bugs resolved
3. **Testing** - Verify deployment works from all states:
   - Fresh VPS (nothing running)
   - Blue running, nginx down
   - Nginx in crash loop
   - Both blue & green running
4. **Documentation** - Update deployment docs with any changes
5. **Knowledge Transfer** - Brief explanation of changes made

---

## Timeline

**Estimated:** 3-4 hours (half day max)

**Breakdown:**

- Review codebase & docs: 1h
- Fix critical issues: 1-2h
- Test deployments: 1h
- Documentation: 30min

---

## Success Criteria

- ✅ Deployment succeeds from current VPS state (blue running, nginx down)
- ✅ Subsequent deployment switches to green successfully
- ✅ System recovers from nginx crash loops
- ✅ No database connection drops during deployment
- ✅ Clear error messages if deployment fails
- ✅ Automatic rollback works correctly

---

## Technical Context

I'm a software engineer with solid fundamentals but limited DevOps experience. The deployment is **mostly working** - containers build successfully, health checks pass, but nginx switching has edge cases.

**What's working:**

- Docker builds
- Container orchestration
- Health checks
- State management

**What needs expert review:**

- Nginx switching reliability
- Edge case handling
- Error recovery
- Production-grade resilience

Looking for someone to give this a final professional review and ensure it's bulletproof for production. The infrastructure is solid, just needs DevOps expertise to polish the deployment automation.

---

## Contact

Let me know if you need any clarification or additional access. The codebase is well-documented and deployment logs are comprehensive. Happy to jump on a call if needed.
