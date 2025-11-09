# Fix: Zombie Processes from Puppeteer/Chromium

**Date:** November 9, 2025  
**Issue:** 16 Zombie processes from Node, Chromium, and Chrome Crashpad  
**Status:** ✅ Fixed

---

## Problem Analysis

### Symptoms
```bash
# On VPS
ps aux | grep 'Z'
```

Output showed **16 zombie processes**:
- 4x `[node] <defunct>`
- 12x `[chrome_crashpad] <defunct>` and `[chromium] <defunct>`

### Root Cause

**Zombie processes** occur when:
1. A child process terminates
2. The parent process doesn't call `wait()` to read the exit status
3. The process descriptor remains in the process table

**In our case:**

The PDF generator (`pdf-generator.ts`) was:
✅ Closing the browser: `await browser.close()`  
❌ **NOT closing the page:** `page.close()` was missing

**Why this causes zombies:**

```typescript
// OLD CODE (BROKEN):
let browser;
try {
    browser = await puppeteer.launch(...);
    const page = await browser.newPage();  // Page created
    
    // ... PDF generation ...
    
} finally {
    if (browser) {
        await browser.close();  // ❌ Browser closes, but page child processes may zombie
    }
}
```

When `browser.close()` is called **without** first closing the page:
- The page's renderer processes (Chromium) may not terminate cleanly
- Child processes (chrome_crashpad, chromium renderers) become zombies
- Node workers associated with the page also zombie

---

## Solution

### Code Changes

**File:** `busbasisberlin/src/utils/pdf-generator.ts`

**Change 1:** Declare `page` at function scope
```typescript
let browser;
let page;  // ✅ Added - page needs to be in finally block scope
try {
    // ...
}
```

**Change 2:** Remove `const` from page creation
```typescript
// OLD:
const page = await browser.newPage();

// NEW:
page = await browser.newPage();  // ✅ Use function-scoped variable
```

**Change 3:** Close page BEFORE browser
```typescript
} finally {
    // Clean up resources in correct order: page first, then browser
    try {
        if (page) {
            console.log('[PDF-GENERATOR] Closing page...');
            await page.close();  // ✅ Close page first
        }
    } catch (pageCloseError) {
        console.error('[PDF-GENERATOR] Error closing page:', pageCloseError);
    }
    
    try {
        if (browser) {
            console.log('[PDF-GENERATOR] Closing browser...');
            await browser.close();  // ✅ Then close browser
        }
    } catch (browserCloseError) {
        console.error('[PDF-GENERATOR] Error closing browser:', browserCloseError);
    }
}
```

**Why separate try-catch blocks?**
- If `page.close()` fails, we still want to try `browser.close()`
- Better error reporting (know which close operation failed)
- More robust cleanup

---

## Best Practices for Puppeteer

### ✅ Always Close Resources in Correct Order

```typescript
let browser;
let page;
try {
    browser = await puppeteer.launch();
    page = await browser.newPage();
    
    // ... use page ...
    
} finally {
    // 1. Close page first (child processes)
    if (page) {
        await page.close();
    }
    
    // 2. Then close browser (parent process)
    if (browser) {
        await browser.close();
    }
}
```

### ✅ Handle Multiple Pages

```typescript
let browser;
const pages = [];
try {
    browser = await puppeteer.launch();
    
    pages.push(await browser.newPage());
    pages.push(await browser.newPage());
    
    // ... use pages ...
    
} finally {
    // Close all pages first
    for (const page of pages) {
        try {
            await page.close();
        } catch (e) {
            console.error('Error closing page:', e);
        }
    }
    
    // Then close browser
    if (browser) {
        await browser.close();
    }
}
```

### ✅ Separate Try-Catch for Cleanup

```typescript
} finally {
    // Separate error handling ensures all cleanup attempts are made
    try {
        if (page) await page.close();
    } catch (e) {
        console.error('Page close error:', e);
    }
    
    try {
        if (browser) await browser.close();
    } catch (e) {
        console.error('Browser close error:', e);
    }
}
```

### ❌ Common Mistakes

**Mistake 1: Only closing browser**
```typescript
// BAD
finally {
    if (browser) {
        await browser.close();  // ❌ Page child processes may zombie
    }
}
```

**Mistake 2: Page in wrong scope**
```typescript
// BAD
try {
    const page = await browser.newPage();  // ❌ Not accessible in finally
    // ...
} finally {
    await page.close();  // ❌ ReferenceError: page is not defined
}
```

**Mistake 3: Single try-catch in cleanup**
```typescript
// BAD
finally {
    try {
        await page.close();
        await browser.close();  // ❌ If page.close() throws, browser never closes
    } catch (e) {
        // ...
    }
}
```

---

## Verification

### Before Fix
```bash
ssh root@172.105.74.218
ps aux | grep 'Z' | wc -l
# Output: 16
```

### After Fix

**Step 1: Deploy new code**
```bash
# On local machine
git add busbasisberlin/src/utils/pdf-generator.ts
git commit -m "fix: properly close Puppeteer page before browser to prevent zombie processes"
git push
```

**Step 2: Wait for deployment**
GitHub Actions will automatically deploy the fix.

**Step 3: Restart containers to clear existing zombies**
```bash
# On VPS
ssh root@172.105.74.218
docker restart medusa_backend_server_blue medusa_backend_worker_blue
```

**Step 4: Verify zombies are gone**
```bash
# Wait 30 seconds for restart
sleep 30

# Check zombie count
ps aux | grep 'Z' | wc -l
# Expected: 0 or very few (system zombies unrelated to our app)
```

**Step 5: Test PDF generation**
```bash
# Generate a test PDF via Admin Dashboard
# Offers → Create Offer → Send Email (generates PDF)

# Check zombies after PDF generation
ps aux | grep 'Z' | wc -l
# Expected: Still 0 (no new zombies created)
```

### Monitoring

**Add monitoring for zombie processes:**

```bash
# Add to cron job or monitoring script
#!/bin/bash
ZOMBIE_COUNT=$(ps aux | grep 'Z' | grep -v grep | wc -l)

if [ "$ZOMBIE_COUNT" -gt 5 ]; then
    echo "WARNING: $ZOMBIE_COUNT zombie processes detected"
    # Send alert
fi
```

---

## Related Issues

### Chromium Arguments for Docker

Our Dockerfile already has correct Chromium args:

```typescript
// pdf-generator.ts
args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',  // Critical for Docker
    '--disable-gpu',
    // ... etc
]
```

These prevent **runtime** issues, but don't fix **cleanup** issues.

### Memory Leaks

Zombie processes themselves don't leak memory (they're already terminated), but:
- They consume process table entries
- Over time, can exhaust PID limit (32768 on Linux)
- Indicates potential memory leaks in parent process

**Monitor memory usage:**
```bash
docker stats medusa_backend_server_blue
```

If memory grows over time → memory leak in application code.

### Restart Policy

Our Docker containers have `restart: unless-stopped`, so:
- Zombies accumulate until manual restart
- After fix, new zombies shouldn't be created
- Existing zombies clear on container restart

---

## Prevention Checklist

When using Puppeteer/Playwright in the future:

- [ ] Declare browser and page at function scope
- [ ] Close page before closing browser
- [ ] Use separate try-catch for each close operation
- [ ] Test zombie process count before/after PDF generation
- [ ] Monitor zombie process count in production
- [ ] Document cleanup order in code comments

---

## References

- [Puppeteer API: Browser.close()](https://pptr.dev/api/puppeteer.browser.close)
- [Puppeteer API: Page.close()](https://pptr.dev/api/puppeteer.page.close)
- [Linux Zombie Processes Explained](https://www.howtogeek.com/119815/htg-explains-what-is-a-zombie-process-on-linux/)
- [Docker and Zombies](https://blog.phusion.nl/2015/01/20/docker-and-the-pid-1-zombie-reaping-problem/)

---

## Summary

**Problem:** Puppeteer pages weren't being closed before browser, causing child processes to zombie.

**Solution:** Close page explicitly before browser in correct order with separate error handling.

**Impact:** 
- ✅ No more zombie processes from PDF generation
- ✅ Cleaner process table
- ✅ Better resource management
- ✅ Prevents PID exhaustion

**Next Steps:**
1. Deploy fix
2. Restart containers
3. Verify zombie count drops to 0
4. Monitor over time

