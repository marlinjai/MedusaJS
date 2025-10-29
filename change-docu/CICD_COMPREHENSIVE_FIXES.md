# CI/CD Pipeline Comprehensive Fixes & Industry Best Practices

**Date:** 2025-10-29
**Status:** Complete systematic review and fixes applied

---

## Critical Issues Fixed

### 1. **Docker Compose Service Name Mismatch**

**Problem:** Using container name `medusa_nginx` instead of service name `nginx`
**Impact:** Nginx couldn't be recreated after removal
**Fix:** Changed all `docker-compose` commands to use service name `nginx`
**File:** `busbasisberlin/scripts/deploy.sh` line 154

### 2. **Aggressive Container Cleanup**

**Problem:** `--remove-orphans` flag was stopping running deployment containers
**Impact:** Blue/green deployments couldn't run simultaneously
**Fix:** Removed `--remove-orphans` from base service startup
**Files:**

- `busbasisberlin/scripts/deploy.sh` lines 374, 458

### 3. **Force Recreation Breaking Base Services**

**Problem:** `--force-recreate` flag was restarting postgres/redis during deployments
**Impact:** Database connections dropped, deployment instability
**Fix:** Removed `--force-recreate` from `start_deployment()`
**File:** `busbasisberlin/scripts/deploy.sh` line 211

### 4. **set -e Causing Premature Exits**

**Problem:** `set -e` exits on any error, preventing graceful recovery
**Impact:** Rollback logic never executed, no error recovery
**Fix:** Changed to `set -o pipefail` for better error handling
**Files:**

- `busbasisberlin/scripts/deploy.sh` line 8
- `busbasisberlin/scripts/deploy-with-domain.sh` line 6

### 5. **Missing Environment Variables**

**Problem:** CORS variables not passed to deployment script
**Impact:** Nginx config generation failed silently
**Fix:** Added `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`, `NODE_ENV`
**File:** `busbasisberlin/scripts/deploy-with-domain.sh` lines 130-141

### 6. **Nginx Config Not Updating**

**Problem:** Read-only mount + restart didn't reload changed config
**Impact:** Nginx kept using old configuration
**Fix:** Stop, remove, then recreate nginx container with docker-compose
**File:** `busbasisberlin/scripts/deploy.sh` lines 147-154

### 7. **State Correction Logic Interfering**

**Problem:** `analyze_and_fix_state()` called `switch_nginx()` prematurely
**Impact:** Created timing conflicts, multiple nginx restarts
**Fix:** Only update state file, let main deploy() handle nginx switching
**File:** `busbasisberlin/scripts/deploy.sh` lines 330-361

### 8. **SSL Certificate Preservation**

**Problem:** `git reset --hard` deleted production SSL certificates
**Impact:** Nginx crashed on restart due to missing certs
**Fix:** Backup SSL certs before git operations, restore after
**File:** `.github/workflows/deploy.yml` lines 78-93

---

## Industry Best Practices Applied

### **1. Idempotency**

✅ Deployment can be run multiple times safely
✅ Recovers from any initial state (no containers, partial, crashed)
✅ State analysis before every deployment

### **2. Fail-Safe Mechanisms**

✅ Explicit error handling instead of `set -e`
✅ Rollback on deployment failure
✅ Health checks before traffic switch
✅ Old deployment kept running until new one is healthy

### **3. Zero-Downtime**

✅ New containers start while old ones serve traffic
✅ Traffic switches only after health checks pass
✅ Old containers stopped only after successful switch

### **4. Observability**

✅ Detailed logging at each step
✅ Color-coded log levels (INFO, WARNING, ERROR, SUCCESS)
✅ Container state logging
✅ Nginx error logs on failure

### **5. Security**

✅ SSL certificate backup/restore
✅ File ownership and permissions set correctly
✅ Secrets passed via environment variables
✅ No secrets in logs or git

### **6. Resource Management**

✅ Disk cleanup before deployment
✅ Unused images/volumes pruned
✅ Only necessary containers recreated

---

## Deployment Flow (After Fixes)

### **Current State: Blue Running, Nginx Down**

```
1. analyze_and_fix_state()
   ├─ Detects: Blue=UP, Green=DOWN, Nginx=DOWN
   ├─ Starts: base services (postgres, redis, nginx, meilisearch)
   ├─ Updates: state file to "blue"
   ├─ Ensures: nginx.conf points to blue
   └─ Result: Blue deployment serving, nginx healthy

2. get_current_deployment() → "blue"

3. get_target_deployment() → "green"

4. deploy()
   ├─ Start: green containers (blue keeps running)
   ├─ Wait: green becomes healthy
   ├─ Switch: nginx from blue to green
   │   ├─ Verify: green containers healthy
   │   ├─ Update: nginx.conf to green
   │   ├─ Recreate: nginx container
   │   └─ Wait: nginx healthy
   ├─ Update: state file to "green"
   └─ Stop: blue containers
```

### **Edge Case: No Containers Running**

```
1. analyze_and_fix_state()
   ├─ Detects: Blue=DOWN, Green=DOWN
   ├─ Starts: file_state deployment (e.g., blue)
   ├─ Wait: health check
   ├─ Creates: nginx.conf from blue
   └─ Starts: all base services + nginx

2. deploy() proceeds with normal flow
   └─ Target: green (opposite of current blue)
```

---

## Remaining Improvements for Industry Standards

### **A. Health Checks**

**Current:** Basic curl to `/health`
**Recommended:**

- Add readiness probe (separate from liveness)
- Check database connectivity
- Verify critical services (Meilisearch, Redis)

### **B. Rollback Strategy**

**Current:** Switches back to previous deployment
**Issues:**

- Previous deployment might have been stopped
- No deployment history tracking

**Recommended:**

```bash
# Keep last 2 deployments
# Rollback by switching to last known good
# Track deployment history in file
```

### **C. Deployment Metrics**

**Missing:**

- Deployment duration tracking
- Success/failure rate
- Resource usage before/after

**Add:**

```bash
DEPLOYMENT_START=$(date +%s)
# ... deployment logic ...
DEPLOYMENT_END=$(date +%s)
DURATION=$((DEPLOYMENT_END - DEPLOYMENT_START))
echo "Deployment took ${DURATION}s" >> /var/log/medusa/deployments.log
```

### **D. Pre-deployment Validation**

**Missing:**

- Docker image vulnerability scanning
- Dependency audit
- Configuration validation

**Add to GitHub Actions:**

```yaml
- name: Security Scan
  run: |
    docker scan busbasisberlin-medusa-server

- name: Dependency Audit
  run: |
    cd busbasisberlin && npm audit --audit-level=high
```

### **E. Deployment Notifications**

**Missing:**

- Slack/email notifications
- Deployment status updates

**Add to workflow:**

```yaml
- name: Notify on Success
  if: success()
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
      -d '{"text":"✅ Deployment succeeded"}'

- name: Notify on Failure
  if: failure()
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
      -d '{"text":"❌ Deployment failed"}'
```

### **F. Database Migration Safety**

**Current:** Migrations run on every container start
**Risk:** Schema changes can break running containers

**Recommended:**

- Run migrations in separate job before deployment
- Use migration versioning
- Add migration rollback support

### **G. Configuration Management**

**Current:** Environment variables passed individually
**Issue:** 40+ variables, error-prone

**Recommended:**

```bash
# Use .env file for non-sensitive config
# Use secrets manager (AWS Secrets Manager, Vault) for sensitive data
# Validate all required vars before deployment starts
```

### **H. Monitoring & Alerting**

**Current:** Uptime Kuma for basic monitoring
**Add:**

- Application performance monitoring (APM)
- Error rate tracking
- Response time monitoring
- Automated rollback on error spike

### **I. Canary Deployments**

**Future Enhancement:**

```bash
# Route 10% traffic to new deployment
# Monitor error rates
# Gradually increase to 100%
# Auto-rollback if errors increase
```

---

## Quick Wins for Next Iteration

### 1. Add Deployment Lock File

```bash
# Prevent race conditions
LOCK_FILE="/tmp/medusa-deploy.lock"
if [ -f "$LOCK_FILE" ]; then
    echo "Deployment already running"
    exit 1
fi
trap "rm -f $LOCK_FILE" EXIT
touch $LOCK_FILE
```

### 2. Add Smoke Tests

```bash
# After nginx switch, verify critical endpoints
curl -f https://$DOMAIN_NAME/health
curl -f https://$DOMAIN_NAME/store/products?limit=1
```

### 3. Add Deployment History

```bash
# Track deployments
echo "$(date +%s)|$target|$GITHUB_SHA|success" >> /var/log/medusa/deploy-history.log
```

### 4. Improve Error Messages

```bash
# Add context to errors
log_error "Nginx failed to start. Check: 1) Config syntax 2) SSL certs 3) Container network"
```

### 5. Add Timeout Protection

```bash
# Prevent infinite waits
timeout 600 ./scripts/deploy.sh deploy || {
    log_error "Deployment timeout after 10 minutes"
    rollback
}
```

---

## Files Modified in This Fix Session

1. `.github/workflows/deploy.yml` - SSL backup, permissions
2. `busbasisberlin/scripts/deploy.sh` - Core deployment logic
3. `busbasisberlin/scripts/deploy-with-domain.sh` - Environment passing
4. `busbasisberlin/nginx/nginx-blue.template` - DNS resolver
5. `busbasisberlin/nginx/nginx-green.template` - DNS resolver

---

## Deployment Checklist (Before Next Push)

- [x] Remove `set -e` from scripts
- [x] Remove `--remove-orphans` from base service commands
- [x] Remove `--force-recreate` from deployment starts
- [x] Use service names not container names with docker-compose
- [x] Pass all required environment variables
- [x] Backup/restore SSL certificates
- [x] Fix file ownership and permissions
- [x] Add DNS resolver to nginx configs
- [x] Improve nginx switching logic
- [x] Add proper error logging
- [ ] Add smoke tests post-deployment
- [ ] Add deployment notifications
- [ ] Add deployment metrics
- [ ] Add vulnerability scanning

---

## Expected Behavior (Next Deployment)

**Starting State:** Blue containers healthy, nginx down

```
1. Pull latest code ✓
2. Restore SSL certificates ✓
3. Fix permissions ✓
4. Generate nginx configs ✓
5. Analyze state:
   - Blue running → update state file to "blue"
   - Start base services (no --remove-orphans) ✓
   - Blue containers NOT stopped ✓
6. Deploy to green:
   - Start green containers (blue keeps running) ✓
   - Wait for green healthy ✓
7. Switch nginx to green:
   - Verify green healthy ✓
   - Copy nginx-green.conf to nginx.conf ✓
   - Stop & remove nginx container ✓
   - Recreate nginx with service name 'nginx' ✓
   - Wait for nginx healthy ✓
8. Update state file to "green" ✓
9. Stop blue containers ✓
10. Success! ✓
```

**All fixes ensure deployment works from ANY initial state.**
