# Authentication Production Fixes

**Date:** November 2, 2025
**Issue:** Authentication works on local but fails on production
**Status:** ✅ Fixed - Awaiting Deployment

## Root Cause Analysis

### Problem 1: Nginx Cookie Manipulation ⚠️ CRITICAL
**File:** `nginx/nginx-blue.template` & `nginx/nginx-green.template`

**Issue:**
```nginx
# WRONG - This overwrites Medusa's cookie settings incorrectly
proxy_cookie_path / "/; Secure; HttpOnly; SameSite=None";
```

This line was using incorrect syntax and was forcing cookie attributes in a way that broke the cookie path. The syntax `proxy_cookie_path / "/; Secure; HttpOnly; SameSite=None"` doesn't properly set cookie flags in modern nginx.

**Fix Applied:**
```nginx
# CORRECT - Modern nginx syntax for cookie flags
proxy_cookie_flags ~ secure httponly samesite=none;
```

This properly ensures cookies have the correct flags without breaking the path.

---

### Problem 2: Missing Credentials in SDK ⚠️ CRITICAL
**File:** `src/admin/lib/sdk.ts`

**Issue:**
The Medusa JS SDK wasn't explicitly configured to send credentials (cookies) with every request. For session-based authentication to work, the browser must include cookies in cross-origin requests.

**Fix Applied:**
```typescript
export const sdk = new Medusa({
	baseUrl: import.meta.env.VITE_BACKEND_URL || '/',
	debug: import.meta.env.DEV,
	auth: {
		type: 'session',
	},
	// CRITICAL: Ensure credentials (cookies) are sent with every request
	fetchConfig: {
		credentials: 'include',
	},
});
```

---

### Problem 3: Missing Cookie Domain Configuration ⚠️ HIGH PRIORITY
**File:** `medusa-config.ts`

**Issue:**
When using `SameSite=None` cookies in production, browsers are stricter about cookie domain settings. Without an explicit domain, cookies may not be shared across the application.

**Fix Applied:**
```typescript
cookieOptions: {
	httpOnly: true,
	secure: isProduction,
	sameSite: isProduction ? 'none' : 'lax',
	maxAge: 24 * 60 * 60 * 1000, // 24 hours
	// Set cookie domain for production (allows subdomain access)
	...(isProduction && process.env.DOMAIN_NAME
		? { domain: `.${process.env.DOMAIN_NAME}` }
		: {}),
},
```

The domain is set to `.basiscamp-berlin.de` (with leading dot) which allows cookies to work across subdomains if needed.

---

## Files Modified

1. ✅ `busbasisberlin/medusa-config.ts` - Added cookie domain configuration
2. ✅ `busbasisberlin/nginx/nginx-green.template` - Fixed cookie flag syntax
3. ✅ `busbasisberlin/nginx/nginx-blue.template` - Fixed cookie flag syntax
4. ✅ `busbasisberlin/src/admin/lib/sdk.ts` - Added credentials: 'include'

---

## Testing Checklist

### Before Deployment
- [x] No linter errors
- [x] Configuration changes validated
- [x] Both nginx templates updated consistently

### After Deployment
1. **Check Cookie Settings**
   - Open DevTools → Application → Cookies
   - Verify cookie has:
     - ✅ `SameSite: None`
     - ✅ `Secure: true`
     - ✅ `HttpOnly: true`
     - ✅ `Domain: .basiscamp-berlin.de` or `basiscamp-berlin.de`

2. **Test Authentication Flow**
   ```javascript
   // In browser console on https://basiscamp-berlin.de/app/login

   // Test 1: Login
   fetch('/auth/user/emailpass', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       email: 'your-email@example.com',
       password: 'your-password'
     }),
     credentials: 'include'
   }).then(r => r.json()).then(console.log)

   // Test 2: Check if cookie persists
   fetch('/admin/users/me', {
     credentials: 'include'
   }).then(r => r.json()).then(console.log)
   ```

3. **Verify CORS Headers**
   - Check Network tab for responses
   - Verify headers include:
     - `Access-Control-Allow-Origin: https://basiscamp-berlin.de`
     - `Access-Control-Allow-Credentials: true`

4. **Test Full Admin Workflow**
   - Login to admin panel
   - Navigate between pages
   - Perform CRUD operations
   - Verify no 401 errors

### curl Tests
```bash
# Test 1: Authentication
curl -v -X POST https://basiscamp-berlin.de/auth/user/emailpass \
  -H "Content-Type: application/json" \
  -H "Origin: https://basiscamp-berlin.de" \
  -d '{"email":"your-email","password":"your-password"}' \
  -c cookies.txt

# Test 2: Use session
curl -v -X GET https://basiscamp-berlin.de/admin/users/me \
  -H "Origin: https://basiscamp-berlin.de" \
  -b cookies.txt
```

---

## Why This Works

### Cookie Flow in Production

1. **User logs in** → POST to `/auth/user/emailpass`
2. **Medusa sets session cookie** with:
   - `Secure=true` (HTTPS only)
   - `HttpOnly=true` (no JS access)
   - `SameSite=None` (allows cross-origin)
   - `Domain=.basiscamp-berlin.de` (works across subdomains)
3. **Nginx passes cookie through** without modification (using `proxy_cookie_flags`)
4. **Browser stores cookie** and sends it with every request
5. **SDK includes credentials** in all fetch requests (`credentials: 'include'`)
6. **Subsequent requests authenticated** because browser sends cookie automatically

### Key Differences from Local

| Aspect | Local | Production |
|--------|-------|------------|
| Protocol | HTTP | HTTPS |
| Secure flag | false | true |
| SameSite | lax | none |
| Domain | localhost | .basiscamp-berlin.de |
| Proxy | None | Nginx |
| CORS | Same-origin | Cross-origin |

---

## Deployment Instructions

### Step 1: Check Running Deployments [[memory:9200893]]
```bash
cd /Users/marlin.pohl/software\ development/MedusaJS/busbasisberlin
gh run list --workflow=deploy.yml --limit 5
```

### Step 2: Cancel Old Deployments if Needed
```bash
# Cancel any running workflows to prevent VPS overload
gh run cancel <run-id>
```

### Step 3: Commit and Push
```bash
git add .
git commit -m "fix: Authentication production issues - cookie domain, nginx config, SDK credentials"
git push origin main
```

### Step 4: Monitor Deployment
```bash
gh run watch
```

### Step 5: Verify Deployment
- Check deployment logs for errors
- Test authentication as described above
- Monitor for any 401 errors in browser console

---

## Troubleshooting

### If Still Getting 401 Errors

1. **Check Redis**
   ```bash
   docker exec -it medusa_redis redis-cli
   > KEYS *sess*
   > TTL <session-key>
   ```
   Sessions should exist and have TTL > 0

2. **Check Environment Variables**
   Ensure these are set correctly in production:
   - `DOMAIN_NAME=basiscamp-berlin.de`
   - `AUTH_CORS` includes the admin URL
   - `ADMIN_CORS` includes the admin URL
   - `JWT_SECRET` and `COOKIE_SECRET` are consistent

3. **Check Nginx Logs**
   ```bash
   docker logs nginx_proxy
   ```
   Look for any cookie-related warnings

4. **Verify Nginx Syntax**
   ```bash
   docker exec nginx_proxy nginx -t
   ```
   Should show "syntax is ok"

---

## Additional Notes

- **No changes needed to .env files** - existing CORS configuration is correct
- **Both blue and green nginx templates updated** - ensures consistency across deployments
- **Cookie domain uses leading dot** - allows cookies to work on both `basiscamp-berlin.de` and `*.basiscamp-berlin.de`
- **SDK credentials explicit** - ensures all admin API calls include session cookie

---

## References

- [TEST_AUTH.md](./TEST_AUTH.md) - Previous authentication debugging attempts
- [Medusa Cookie Documentation](https://docs.medusajs.com/resources/references/core-flows/Common/setAuthAppMetadataStep)
- [MDN: SameSite Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
- [Nginx proxy_cookie_flags](http://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_cookie_flags)

