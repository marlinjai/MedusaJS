# Redis URL Quote Bug - Root Cause and Fix

## Issue Summary

**Problem**: Blue/green deployments failing with `[ioredis] Unhandled error event: AggregateError [ECONNREFUSED]` or `WRONGPASS invalid username-password pair`.

**Root Cause**: The `setup-production-env.sh` script was wrapping `REDIS_PASSWORD` in quotes when writing to `.env.production`, causing Docker Compose variable substitution to include those quotes in the final Redis URL.

## Technical Details

### The Bug

In `setup-production-env.sh` (lines 128-131), the script was doing:

```bash
REDIS_PASSWORD_QUOTED=$(quote_value "$REDIS_PASSWORD")
REDIS_URL_VALUE="redis://redis:6379/0?password=${REDIS_PASSWORD}"
REDIS_PASSWORD=$REDIS_PASSWORD_QUOTED
REDIS_URL=$(quote_value "$REDIS_URL_VALUE")
```

This created a `.env.production` file like:
```env
REDIS_PASSWORD='zOZc5V4NL/n11cb n njKyALMXKwHiyqAOoJc3zA66Y='
REDIS_URL='redis://redis:6379/0?password=${REDIS_PASSWORD}'
```

### Why This Broke

Docker Compose performs **variable substitution** when it reads environment files. When it encounters:

```yaml
environment:
  - REDIS_URL=redis://redis:6379/0?password=${REDIS_PASSWORD}
```

And the `.env.production` file has `REDIS_PASSWORD='secret'`, Docker Compose substitutes to:

```
redis://redis:6379/0?password='secret'
```

**The quotes become part of the password!** So Redis receives the password as `'secret'` (including quotes) instead of `secret`.

### Additional Complexity

The `quote_value()` function in the script was designed to safely quote values **for shell execution**, preventing bash interpretation errors. However:

1. **Shell context**: When bash sources `.env.production`, quotes are needed to protect special characters
2. **Docker Compose context**: Docker Compose does its own variable substitution and includes quotes literally

This creates a conflict: what's safe for shell scripting breaks Docker Compose substitution.

## The Fix

Changed `setup-production-env.sh` to:

```bash
# Redis Configuration (with password authentication)
# Using query parameter format to avoid Node.js URL parser deprecation warnings
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

Now Docker Compose substitutes correctly to:
```
redis://redis:6379/0?password=zOZc5V4NL/n11cb n njKyALMXKwHiyqAOoJc3zA66Y=
```

### Why This Works

1. **REDIS_PASSWORD**: Left unquoted so Docker Compose substitution works correctly
2. **REDIS_URL**: Quoted as a whole (with the `${REDIS_PASSWORD}` placeholder), but Docker Compose removes outer quotes during parsing
3. **Password special characters**: Handled by URL encoding in the query parameter format

## Related Files Changed

1. **`scripts/setup-production-env.sh`**: Fixed REDIS_PASSWORD quoting (lines 125-131)
2. **`scripts/diagnose-redis-connection.sh`**: New diagnostic tool to detect this issue

## How to Detect This Issue

Run the diagnostic script on the VPS:
```bash
cd /opt/medusa-app/busbasisberlin
./scripts/diagnose-redis-connection.sh
```

It will check:
- If `.env.production` has quotes around `REDIS_PASSWORD`
- If the password in the container's `REDIS_URL` has embedded quotes
- Redis authentication status
- Container logs for specific error patterns

## Testing the Fix

After deploying the fix:

1. SSH to VPS
2. Check `.env.production`:
   ```bash
   cd /opt/medusa-app/busbasisberlin
   grep "REDIS_PASSWORD=" .env.production
   ```
   Should show: `REDIS_PASSWORD=actual_password` (NO quotes)

3. Check container environment:
   ```bash
   docker exec medusa_backend_server_blue printenv REDIS_URL
   ```
   Should show: `redis://redis:6379/0?password=actual_password` (NO quotes around password)

4. Test Redis connection:
   ```bash
   REDIS_PASSWORD=$(grep "REDIS_PASSWORD=" .env.production | cut -d'=' -f2-)
   docker exec medusa_redis redis-cli -a "$REDIS_PASSWORD" ping
   ```
   Should return: `PONG`

## Prevention

**Always remember**: In `.env` files that Docker Compose reads:
- ✅ Use quotes for values with spaces/special chars when **directly used** in docker-compose.yml
- ❌ Do NOT use quotes for values that will be **substituted** into other strings via `${VARIABLE}`

## Timeline of Related Issues

1. **Initial**: `redis://:PASSWORD@host` → Node.js deprecation warnings
2. **Attempt 1**: `redis://default:PASSWORD@host` → DNS resolution errors (default parsed as hostname)
3. **Attempt 2**: `redis://:PASSWORD@host` → Still had deprecation warnings
4. **Attempt 3**: `redis://redis:6379/0?password=PASSWORD` → WRONGPASS due to quoting bug
5. **Final Fix**: Removed quotes from `REDIS_PASSWORD` in script → Should work correctly

## Additional Notes

### Why Not Quote Everything?

You might ask: "Why not just quote the entire `REDIS_URL` in docker-compose.yml?"

```yaml
# This doesn't work:
environment:
  - REDIS_URL="redis://redis:6379/0?password=${REDIS_PASSWORD}"
```

Because Docker Compose's YAML parser strips quotes around the entire string, but NOT quotes embedded within variable values. The substitution happens **after** YAML parsing, so:
- Outer quotes → removed by YAML parser ✅
- Inner quotes (from `.env` file) → preserved in substitution ❌

### Alternative Solutions Considered

1. **URL-encode the password**: Could work, but adds complexity and doesn't solve the underlying issue
2. **Use Docker secrets**: More secure, but requires Docker Swarm mode (we're using standalone Docker)
3. **Don't use variable substitution**: Hard-code password in docker-compose.yml (terrible for security)
4. **Pass as separate parameter**: Medusa config requires full Redis URL, not separate parts

The current solution (no quotes in `.env.production`) is the simplest and most compatible with our setup.

## Verification Checklist

Before considering this issue resolved:
- [ ] `.env.production` has `REDIS_PASSWORD=value` (no quotes)
- [ ] Container `REDIS_URL` has `password=value` (no quotes)
- [ ] Redis `ping` with password returns `PONG`
- [ ] Blue deployment containers start successfully
- [ ] Green deployment containers start successfully
- [ ] Health checks pass within 5 minutes
- [ ] Admin login works
- [ ] No `[ioredis]` errors in container logs

## References

- Docker Compose variable substitution: https://docs.docker.com/compose/environment-variables/
- ioredis connection URLs: https://github.com/redis/ioredis#connect-to-redis
- Node.js URL parser behavior: https://nodejs.org/api/url.html

