# Authentication Debugging Guide

## Problem
Login erfolgreich (200), aber nachfolgende Requests erhalten 401 Unauthorized.

## Root Cause Analysis

### 1. Cookie SameSite Problem
**Symptom:** Session wird erstellt, aber Browser sendet Cookie nicht zurück

**Check in DevTools:**
1. Open: `https://basiscamp-berlin.de/app/login`
2. Login
3. DevTools → Application → Cookies → `https://basiscamp-berlin.de`
4. Suche nach: `connect.sid` oder `auth_token`

**Expected:**
- ✅ Cookie existiert
- ✅ `SameSite: None`
- ✅ `Secure: true`
- ✅ `HttpOnly: true`

**If missing `SameSite: None`:**
→ Browser blockiert das Cookie bei Cross-Origin Requests

### 2. CORS Headers Problem
**Symptom:** Browser erlaubt Request, aber sendet Cookies nicht

**Check in DevTools Network Tab:**
```
Response Headers should include:
Access-Control-Allow-Origin: https://basiscamp-berlin.de
Access-Control-Allow-Credentials: true
```

**If `Access-Control-Allow-Origin: *`:**
→ Browser sendet keine Credentials bei Wildcard

### 3. Domain Mismatch
**Symptom:** Cookie wird auf falsche Domain gesetzt

**Current Setup:**
- Admin served from: `https://basiscamp-berlin.de/app`
- API at: `https://basiscamp-berlin.de/`

**Cookie Domain should be:** `.basiscamp-berlin.de` or `basiscamp-berlin.de`

## Quick Fixes

### Fix 1: Update Cookie Configuration (DONE)
```typescript
// medusa-config.ts
cookieOptions: {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 24 * 60 * 60 * 1000,
}
```

### Fix 2: Verify CORS (DONE)
```yaml
# docker-compose.green.yml
- ADMIN_CORS=https://${DOMAIN_NAME},https://basiscamp-berlin.de
- AUTH_CORS=https://${DOMAIN_NAME},https://basiscamp-berlin.de,...
```

### Fix 3: Check Nginx Proxy
Nginx might strip cookies or CORS headers!

```nginx
# Should have:
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

# Should NOT strip Set-Cookie
proxy_pass_header Set-Cookie;
```

## Manual Test Commands

### Test 1: Auth Endpoint
```bash
curl -v -X POST https://basiscamp-berlin.de/auth/user/emailpass \
  -H "Content-Type: application/json" \
  -H "Origin: https://basiscamp-berlin.de" \
  -d '{"email":"marlinjp@icloud.com","password":"YOUR_PASSWORD"}' \
  -c cookies.txt

# Check for Set-Cookie header
# Check for CORS headers
```

### Test 2: Use Cookie
```bash
curl -v -X GET https://basiscamp-berlin.de/admin/users/me \
  -H "Origin: https://basiscamp-berlin.de" \
  -b cookies.txt

# Should return 200 with user data
# If 401: Cookie not being sent or not valid
```

### Test 3: Check from Browser Console
```javascript
// In browser console on https://basiscamp-berlin.de/app/login
fetch('/auth/user/emailpass', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@test.com', password: 'test' }),
  credentials: 'include' // IMPORTANT!
}).then(r => r.json()).then(console.log)

// Then test if cookie persists:
fetch('/admin/users/me', {
  credentials: 'include'
}).then(r => r.json()).then(console.log)
```

## Next Steps

1. ✅ Cookie config updated
2. ✅ CORS config updated
3. ⏳ **Waiting for deployment**
4. ❓ **Need to check:** Nginx configuration
5. ❓ **Need to verify:** Actual cookie in browser

## If Still Not Working

### Check Medusa Admin Code
The admin app might not be sending `credentials: 'include'` with requests.

File to check: Admin UI fetch configuration

### Nuclear Option: Session Store
Maybe Redis session store has issues?

```bash
# Check Redis
docker exec -it medusa_redis redis-cli
> KEYS *
> GET session:XXXXX
```

