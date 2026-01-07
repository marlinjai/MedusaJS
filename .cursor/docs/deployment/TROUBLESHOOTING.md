# Deployment Troubleshooting Guide

**Last Updated**: January 7, 2026
**Status**: All issues resolved

This document consolidates all Redis-related deployment issues encountered and their solutions.

---

## Table of Contents

1. [Redis URL Format Issue](#redis-url-format-issue)
2. [Redis Password Quote Bug](#redis-password-quote-bug)
3. [Missing REDIS_PASSWORD in Scripts](#missing-redis_password-in-scripts)
4. [Deployment Verification](#deployment-verification)

---

## Redis URL Format Issue

### Problem
Deployments failing with Node.js deprecation warnings and connection refusals:
```
[ioredis] Unhandled error event: AggregateError [ECONNREFUSED]
(node:67) [DEP0170] DeprecationWarning: The URL redis://:PASSWORD@redis:6379 is invalid
```

### Root Cause
The Redis URL format `redis://:PASSWORD@host` (colon before password indicating "no username") is deprecated in Node.js. The URL parser falls back to localhost instead of using the Docker service name.

### Solution
Changed from deprecated format to modern ACL format:

```bash
# BEFORE (Deprecated)
REDIS_URL=redis://:PASSWORD@redis:6379

# AFTER (Correct)
REDIS_URL=redis://default:PASSWORD@redis:6379
```

**Why `default`?**
- Redis 6+ has Access Control Lists (ACL) with a default user named `default`
- When using `--requirepass`, the password is set for the `default` user
- The URL format `redis://username:password@host:port` is the current standard

### Files Updated
- `docker-compose.blue.yml` (line 23)
- `docker-compose.green.yml` (line 23)
- `.env.production.template` (line 34)

**Commit**: `cf28876` - "fix: correct Redis URL format for Node.js compatibility"

---

## Redis Password Quote Bug

### Problem
Deployments failing with `WRONGPASS` authentication errors even though the password was correct in GitHub secrets.

### Root Cause
The `setup-production-env.sh` script was applying `quote_value()` to `REDIS_PASSWORD` before embedding it in the Redis URL, causing Docker Compose variable substitution to include quotes literally in the final URL:

```bash
# BEFORE (Broken)
REDIS_PASSWORD=$(quote_value "$REDIS_PASSWORD")
REDIS_URL=redis://redis:6379/0?password=$REDIS_PASSWORD

# Created:
REDIS_PASSWORD='secret'
REDIS_URL=redis://redis:6379/0?password='secret'
#                                        ^      ^ Quotes become part of password!
```

### Technical Details

**Docker Compose vs Shell Context Conflict:**
1. **Shell context**: `quote_value()` protects special characters for bash execution
2. **Docker Compose context**: Variable substitution includes quotes literally

When Docker Compose reads `.env.production` with:
```env
REDIS_PASSWORD='zOZc5V4NL/n11cb n njKyALMXKwHiyqAOoJc3zA66Y='
REDIS_URL='redis://redis:6379/0?password=${REDIS_PASSWORD}'
```

And the docker-compose.yml uses:
```yaml
environment:
  - REDIS_URL=${REDIS_URL}
```

The result is:
```
redis://redis:6379/0?password='zOZc5V4NL/n11cb n njKyALMXKwHiyqAOoJc3zA66Y='
```
The quotes become part of the password value!

### Solution
Modified `setup-production-env.sh` to:

```bash
# Redis Configuration (with password authentication)
# Note: REDIS_PASSWORD must NOT be quoted because docker-compose uses ${REDIS_PASSWORD}
# and will include the quotes in the URL if present
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_URL=$(quote_value "redis://redis:6379/0?password=${REDIS_PASSWORD}")
```

This creates:
```env
REDIS_PASSWORD=zOZc5V4NL/n11cb n njKyALMXKwHiyqAOoJc3zA66Y=
REDIS_URL='redis://redis:6379/0?password=${REDIS_PASSWORD}'
```

Docker Compose now correctly substitutes to:
```
redis://redis:6379/0?password=zOZc5V4NL/n11cb n njKyALMXKwHiyqAOoJc3zA66Y=
```

### Key Lesson
**Docker Compose `.env` files are NOT bash scripts!**

- ✅ Docker Compose reads values directly
- ✅ Variable substitution happens at runtime
- ❌ Quotes are NOT interpreted, they become LITERAL parts of the value
- ❌ What's safe for bash can break Docker Compose

**Rule of thumb**:
- Quote values used **directly** in docker-compose.yml
- DON'T quote values **substituted** into other strings via `${VARIABLE}`

**Commit**: `1efb7aa` - "fix(critical): remove quotes from REDIS_PASSWORD in .env.production"

---

## Missing REDIS_PASSWORD in Scripts

### Problem
Even with correct URL format and quoting, deployments failed because `REDIS_PASSWORD` wasn't being passed through the entire deployment chain.

### Complete Variable Flow

The password must flow through this entire chain:

```
GitHub Actions Secret
  ↓ (deploy.yml line 32)
GitHub Workflow env
  ↓ (deploy.yml line 126)
SSH Session export
  ↓ (deploy.yml line 177)
setup-production-env.sh  ← Creates .env.production
  ↓ (deploy-with-domain.sh line 107)
deploy-with-domain.sh env
  ↓ (deploy.sh lines 246, 444, 546)
deploy.sh exports
  ↓ (docker-compose.base.yml)
Redis Container --requirepass
  ↓ (docker-compose.blue/green.yml)
Medusa Containers REDIS_URL
  ↓
✅ Successful Connection!
```

### Bugs Found and Fixed

#### Bug #1: Missing in deploy-with-domain.sh (Line 107)
**Impact**: CRITICAL - Broke entire chain

```bash
# BEFORE (Broken)
env DOMAIN_NAME="$DOMAIN_NAME" \
    POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
    # REDIS_PASSWORD MISSING! ❌
    JWT_SECRET="$JWT_SECRET" \
    ./scripts/deploy.sh deploy

# AFTER (Fixed)
env DOMAIN_NAME="$DOMAIN_NAME" \
    POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
    REDIS_PASSWORD="$REDIS_PASSWORD" \  # ✅ ADDED
    JWT_SECRET="$JWT_SECRET" \
    ./scripts/deploy.sh deploy
```

**Commit**: `59a4e41`

#### Bug #2: Missing in deploy.sh start_base_services() (Line 444)
**Impact**: MEDIUM - Base services wouldn't get password

```bash
# BEFORE (Broken)
export POSTGRES_PASSWORD JWT_SECRET COOKIE_SECRET
# REDIS_PASSWORD MISSING! ❌

# AFTER (Fixed)
export POSTGRES_PASSWORD REDIS_PASSWORD JWT_SECRET COOKIE_SECRET
# ✅ ADDED
```

**Commit**: `6d9d257`

#### Bug #3: Missing in deploy-with-domain.sh validation (Line 75)
**Impact**: LOW - No early validation

```bash
# BEFORE (Broken)
required_vars=(
    "POSTGRES_PASSWORD"
    # REDIS_PASSWORD NOT CHECKED ❌
    "JWT_SECRET"
)

# AFTER (Fixed)
required_vars=(
    "POSTGRES_PASSWORD"
    "REDIS_PASSWORD"  # ✅ ADDED
    "JWT_SECRET"
)
```

**Commit**: `6d9d257`

---

## Deployment Verification

### Pre-Deployment Checks

**1. Verify GitHub Secret Exists**
```bash
# Check if secret is configured (returns non-zero if missing)
gh secret list | grep REDIS_PASSWORD
```

**2. Check GitHub Actions Workflow**
```bash
# Verify deploy.yml exports REDIS_PASSWORD
grep "REDIS_PASSWORD" .github/workflows/deploy.yml
```

### Post-Deployment Verification

**1. Check `.env.production` on VPS**
```bash
ssh deploy@your-vps "cat /opt/medusa-app/busbasisberlin/.env.production | grep REDIS"

# Should show:
# REDIS_PASSWORD=actual_password  (NO quotes)
# REDIS_URL='redis://redis:6379/0?password=${REDIS_PASSWORD}'
```

**2. Check Container Environment**
```bash
ssh deploy@your-vps "docker exec medusa_backend_server_blue printenv REDIS_URL"

# Should show:
# redis://redis:6379/0?password=actual_password  (NO quotes around password)
```

**3. Test Redis Connection**
```bash
ssh deploy@your-vps "cd /opt/medusa-app/busbasisberlin && \
  REDIS_PASSWORD=\$(grep REDIS_PASSWORD= .env.production | cut -d'=' -f2-) && \
  docker exec medusa_redis redis-cli -a \"\$REDIS_PASSWORD\" ping"

# Should return:
# PONG
```

**4. Check Container Logs**
```bash
ssh deploy@your-vps "docker logs medusa_backend_server_blue 2>&1 | grep -i redis"

# Should show:
# Connection to Redis in module 'event-bus-redis' established
# Connection to Redis in module 'cache-redis' established

# Should NOT show:
# [ioredis] Unhandled error event
# WRONGPASS invalid username-password pair
```

**5. Test Admin Login**
```bash
# Open browser to:
https://your-domain.de/app/login

# Login should work without:
# - NOAUTH errors
# - Connection timeout errors
# - Session persistence issues
```

### Diagnostic Script

Run the comprehensive diagnostics:
```bash
ssh deploy@your-vps "cd /opt/medusa-app/busbasisberlin && ./scripts/diagnose-redis-connection.sh"
```

This checks:
- `.env.production` quote issues
- Container REDIS_URL format
- Redis authentication status
- Container error patterns

---

## Timeline of Issues

| Date | Issue | Deployments Failed | Fix | Commits |
|------|-------|-------------------|-----|---------|
| Dec 29, 2025 | Wrong URL format (`redis://:PASSWORD@host`) | #386-#388 | Changed to `redis://default:PASSWORD@host` | `cf28876` |
| Dec 29, 2025 | Password not used by script | #389 | Made script use `$REDIS_PASSWORD` | `a3c12f8` |
| Dec 29, 2025 | Quote function breaking URL | #390 | Build URL with unquoted password | `1425459` |
| Dec 29, 2025 | Missing in deployment scripts | #391 | Added to deploy.sh and deploy-with-domain.sh | `59a4e41`, `6d9d257` |
| Dec 29, 2025 | Query parameter quote bug | #392+ | Remove quotes from REDIS_PASSWORD | `1efb7aa` |

---

## Prevention Guidelines

### For Future Environment Variables

1. **Always trace the complete chain**: GitHub Secret → Workflow → SSH → Scripts → Docker
2. **Test variable substitution**: Verify what actually gets written to files
3. **Quote carefully**: Quote complete values, not components that will be substituted
4. **Validate early**: Add to required_vars arrays in deployment scripts
5. **Document the flow**: Update this guide when adding new environment variables

### For Redis Configuration

1. **Use modern URL format**: `redis://username:password@host:port`
2. **Don't quote substituted values**: Leave unquoted if used in `${VARIABLE}` substitution
3. **Test connection immediately**: Don't wait for full deployment to test Redis
4. **Check container logs**: Look for Redis connection messages
5. **Verify actual password value**: Ensure no unwanted characters (quotes, spaces)

---

## Resolution Summary

**All issues resolved as of Dec 29, 2025**

✅ Correct Redis URL format (`redis://default:PASSWORD@host`)
✅ No quotes around REDIS_PASSWORD in `.env.production`
✅ REDIS_PASSWORD passes through entire deployment chain
✅ Docker Compose correctly substitutes password
✅ Containers connect to Redis successfully
✅ Admin login works
✅ Session persistence works

**Status**: Production stable, no Redis-related deployment failures.

---

## References

- **Docker Compose Environment Variables**: https://docs.docker.com/compose/environment-variables/
- **ioredis Connection URLs**: https://github.com/redis/ioredis#connect-to-redis
- **Redis ACL Documentation**: https://redis.io/docs/management/security/acl/
- **Node.js URL Parser**: https://nodejs.org/api/url.html

