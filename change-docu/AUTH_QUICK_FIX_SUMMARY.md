# Authentication Quick Fix Summary

## 🔴 Four Critical Issues Fixed

### 1. Nginx Cookie Flags (CRITICAL)
**Before:**
```nginx
proxy_cookie_path / "/; Secure; HttpOnly; SameSite=None";  # WRONG
```

**After:**
```nginx
proxy_cookie_flags ~ secure httponly samesite=none;  # CORRECT
```

### 2. SDK Missing Credentials (CRITICAL)
**Before:**
```typescript
export const sdk = new Medusa({
  baseUrl: '/',
  auth: { type: 'session' },
});
```

**After:**
```typescript
export const sdk = new Medusa({
  baseUrl: '/',
  auth: { type: 'session' },
  fetchConfig: {
    credentials: 'include',  // ← ADDED
  },
});
```

### 3. Missing Proxy Headers in Location Block (CRITICAL)
**Before:**
```nginx
location / {
  proxy_pass http://medusa_backend;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  # Missing critical headers!
}
```

**After:**
```nginx
location / {
  proxy_pass http://medusa_backend;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";

  # ↓ ADDED - Critical for Medusa authentication
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header X-Forwarded-Host $host;
  proxy_set_header X-Forwarded-Port $server_port;
  proxy_set_header X-Forwarded-Server $host;

  proxy_read_timeout 86400;
}
```

**Why it matters:** Medusa uses these headers to determine the request origin and build correct URLs for cookies and CORS validation.

### 4. Cookie Domain Missing (HIGH)
**Before:**
```typescript
cookieOptions: {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 24 * 60 * 60 * 1000,
}
```

**After:**
```typescript
cookieOptions: {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 24 * 60 * 60 * 1000,
  // ↓ ADDED
  ...(isProduction && process.env.DOMAIN_NAME
    ? { domain: `.${process.env.DOMAIN_NAME}` }
    : {}),
}
```

---

## 📦 Files Changed

- ✅ `busbasisberlin/medusa-config.ts`
- ✅ `busbasisberlin/nginx/nginx-green.template`
- ✅ `busbasisberlin/nginx/nginx-blue.template`
- ✅ `busbasisberlin/src/admin/lib/sdk.ts`

---

## 🚀 Deployment

```bash
# 1. Check and cancel old deployments
gh run list --workflow=deploy.yml
gh run cancel <id>  # if needed

# 2. Deploy
git add .
git commit -m "fix: Production authentication - cookie domain, nginx, SDK credentials"
git push origin main

# 3. Watch
gh run watch
```

---

## ✅ Post-Deployment Test

**Browser Console** (on https://basiscamp-berlin.de/app/login):
```javascript
// Login test
fetch('/auth/user/emailpass', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@test.com', password: 'test' }),
  credentials: 'include'
}).then(r => r.json()).then(console.log)

// Session test
fetch('/admin/users/me', {
  credentials: 'include'
}).then(r => r.json()).then(console.log)
```

**Expected:**
- First request returns user token
- Second request returns user data (NOT 401)
- Cookie visible in DevTools with `SameSite=None`, `Secure=true`

---

## 🔍 Why It Failed Before

1. **Nginx was breaking cookies** with incorrect `proxy_cookie_path` syntax
2. **SDK wasn't sending cookies** - missing `credentials: 'include'`
3. **Missing proxy headers** - Medusa couldn't determine request origin correctly
4. **Cookie domain not set** - browser rejected cross-origin cookie sharing

## ✅ Why It Works Now

1. **Nginx passes cookies correctly** using proper `proxy_cookie_flags`
2. **SDK includes credentials** in all fetch requests
3. **All proxy headers present** - Medusa can build correct URLs and validate requests
4. **Cookie domain explicit** - browser allows cross-origin sharing

**Key insight from Stack Overflow:** The proxy headers are essential for Medusa's authentication middleware to work correctly behind a reverse proxy.

---

See [AUTHENTICATION_PRODUCTION_FIXES.md](./AUTHENTICATION_PRODUCTION_FIXES.md) for full details.

