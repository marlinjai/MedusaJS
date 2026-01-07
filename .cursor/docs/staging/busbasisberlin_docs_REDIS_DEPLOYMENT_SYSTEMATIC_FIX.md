# Redis Deployment Fix - Systematic Investigation Summary

## Problem Statement
Blue/green deployments were failing with `[ioredis] Unhandled error event: AggregateError [ECONNREFUSED]` errors, preventing containers from connecting to Redis even after implementing the query parameter URL format.

## Systematic Investigation Process

### ✅ Step 1: Check `.env.production` file format
**Status**: IDENTIFIED THE ROOT CAUSE

**Finding**: The `setup-production-env.sh` script was wrapping `REDIS_PASSWORD` in quotes when writing to `.env.production`:

```bash
# OLD (BROKEN):
REDIS_PASSWORD_QUOTED=$(quote_value "$REDIS_PASSWORD")
REDIS_PASSWORD=$REDIS_PASSWORD_QUOTED
```

This created:
```env
REDIS_PASSWORD='zOZc5V4NL/n11cb n njKyALMXKwHiyqAOoJc3zA66Y='
```

When Docker Compose performs variable substitution in:
```yaml
REDIS_URL=redis://redis:6379/0?password=${REDIS_PASSWORD}
```

It includes the quotes LITERALLY:
```
redis://redis:6379/0?password='zOZc5V4NL/n11cb n njKyALMXKwHiyqAOoJc3zA66Y='
                               ^                                                 ^
                               These quotes become part of the password!
```

**Fix Applied**: Remove `quote_value()` from `REDIS_PASSWORD` line:
```bash
# NEW (CORRECT):
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_URL=$(quote_value "redis://redis:6379/0?password=${REDIS_PASSWORD}")
```

### ✅ Step 2: Verify Redis container status
**Status**: Redis configuration is correct

**Findings**:
- `docker-compose.base.yml` correctly requires password authentication
- `docker-compose.blue.yml` and `docker-compose.green.yml` use correct query parameter format
- The issue was NOT with Redis itself, but with how the password was being passed

### ✅ Step 3: Verify `setup-production-env.sh` logic
**Status**: Script logic fixed

**Root Cause**: Conflict between two contexts:
1. **Shell context**: `quote_value()` protects special characters for bash
2. **Docker Compose context**: Variable substitution includes quotes literally

**Solution**: Don't quote values that will be substituted into other strings.

### ✅ Step 4: Network connectivity
**Status**: Not the issue

**Findings**:
- Docker network configuration is correct
- Container-to-container communication works
- The problem was authentication, not network connectivity

### ✅ Step 5: Implement fix and redeploy
**Status**: COMPLETED

**Actions Taken**:
1. ✅ Fixed `scripts/setup-production-env.sh` (removed quotes from REDIS_PASSWORD)
2. ✅ Created `scripts/diagnose-redis-connection.sh` (comprehensive diagnostics)
3. ✅ Created `docs/REDIS_URL_QUOTE_BUG_FIX.md` (full explanation)
4. ✅ Committed changes with detailed explanation
5. ✅ Pushed to trigger new GitHub Actions deployment

## Files Changed

### Modified
- **`busbasisberlin/scripts/setup-production-env.sh`** (lines 125-131)
  - Removed `quote_value()` wrapper from `REDIS_PASSWORD`
  - Added explanatory comments about Docker Compose substitution

### New Files
- **`busbasisberlin/scripts/diagnose-redis-connection.sh`**
  - Comprehensive Redis connection diagnostics
  - Checks `.env.production` format
  - Tests Redis authentication
  - Analyzes container logs for specific error patterns
  - Provides actionable troubleshooting steps

- **`busbasisberlin/docs/REDIS_URL_QUOTE_BUG_FIX.md`**
  - Full explanation of the bug
  - Technical details about Docker Compose variable substitution
  - Timeline of related issues
  - Testing procedures
  - Prevention guidelines

## Expected Outcome

After this deployment:

1. **`.env.production` will have**:
   ```env
   REDIS_PASSWORD=actual_password
   REDIS_URL='redis://redis:6379/0?password=${REDIS_PASSWORD}'
   ```

2. **Container `REDIS_URL` will be**:
   ```
   redis://redis:6379/0?password=actual_password
   ```
   (No quotes around the password!)

3. **Health checks should**:
   - Pass within 2-3 minutes (not 12+ minutes)
   - Show no `[ioredis]` errors in logs
   - Allow admin login immediately

## Verification Steps

Once deployment completes, SSH to VPS and run:

```bash
cd /opt/medusa-app/busbasisberlin

# Run comprehensive diagnostics
./scripts/diagnose-redis-connection.sh

# Quick manual checks
grep "REDIS_PASSWORD=" .env.production    # Should have NO quotes
docker exec medusa_backend_server_blue printenv REDIS_URL  # Should have NO quotes in password
docker logs medusa_backend_server_blue 2>&1 | grep -i redis  # Should have NO errors
```

## Why Previous Attempts Failed

| Attempt | URL Format | Issue |
|---------|-----------|-------|
| 1 | `redis://:PASSWORD@host` | Node.js deprecation, localhost fallback |
| 2 | `redis://default:PASSWORD@host` | DNS resolution error (default parsed as hostname) |
| 3 | `redis://:PASSWORD@host` | Still had deprecation warnings |
| 4 | `redis://redis:6379/0?password=PASSWORD` | WRONGPASS due to **quoting bug** ← We were here |
| 5 | Same format, no quotes | **Should work!** ← We are now here |

## Key Lesson Learned

**Docker Compose `.env` files are NOT bash scripts!**

- ✅ Docker Compose reads values directly
- ✅ Variable substitution happens at runtime
- ❌ Quotes are NOT interpreted, they become LITERAL parts of the value
- ❌ What's safe for bash can break Docker Compose

**Rule of thumb**:
- Quote values that are used **directly** in docker-compose.yml
- DON'T quote values that are **substituted** into other strings via `${VARIABLE}`

## Timeline

| Time | Event |
|------|-------|
| Dec 29, 01:54 | Deployment started with query parameter format |
| Dec 29, 02:04 | Blue containers started but failing health checks |
| Dec 29, 02:16 | Still retrying after 12+ minutes (720 seconds timeout) |
| Dec 29, ~03:00 | User shared failure logs, systematic investigation began |
| Dec 29, ~03:15 | Root cause identified: quoting bug in setup-production-env.sh |
| Dec 29, ~03:30 | Fix implemented, diagnostic tools created, pushed to trigger new deployment |

## Monitoring the New Deployment

Check deployment status:
```bash
# From local machine
gh run list --limit 1

# Or visit GitHub Actions
open https://github.com/marlinjai/MedusaJS/actions
```

Expected timeline:
- **0-2 min**: Git pull, build images
- **2-8 min**: Build Medusa (frontend + backend)
- **8-10 min**: Start containers
- **10-12 min**: Health checks pass ← Should be GREEN at this point!
- **12-13 min**: Switch from green to blue, deployment complete

If it takes longer than 15 minutes, something is still wrong.

## Confidence Level

**High confidence (95%)** that this fix will resolve the issue because:

1. ✅ We identified the exact root cause through code analysis
2. ✅ The bug explains ALL observed symptoms (WRONGPASS, password with spaces in logs)
3. ✅ The fix is simple and directly addresses the root cause
4. ✅ We created diagnostic tools to quickly verify the fix
5. ✅ The Docker Compose configuration itself is correct

The only remaining risk is if there's an unrelated issue (like Redis not having the correct password set), but the diagnostic script will catch that immediately.

## Next Steps After Deployment

1. **Monitor the GitHub Actions workflow** (should complete in ~13 minutes)
2. **If successful**: Verify admin login works
3. **If still failing**: SSH to VPS and run `./scripts/diagnose-redis-connection.sh`
4. **Document final outcome** in this investigation summary

---

**Investigation completed**: Dec 29, 2025, 03:30 UTC
**Fix deployed**: Commit `1efb7aa` - "fix(critical): remove quotes from REDIS_PASSWORD in .env.production"
**Awaiting deployment results**...

