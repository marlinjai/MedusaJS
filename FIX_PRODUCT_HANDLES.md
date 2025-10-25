# Fix Product Handles - Bulk Update Script

## Problem

Products have non-SEO-friendly handles (SKUs, article numbers) instead of descriptive URLs:

- ❌ `/a-ct-001` → Should be `campingtisch-100x57cm`
- ❌ `9105900009` → Should be `hulse-schwingarm-gebraucht`
- ❌ `1591` → Should be `anhangerbock-universal`

## Solution

Automated script to generate SEO-friendly handles from product titles.

## What the Script Does

1. ✅ Fetches all products from database
2. ✅ Generates SEO-friendly handles from titles
3. ✅ Handles German umlauts (ä→ae, ö→oe, ü→ue, ß→ss)
4. ✅ Removes special characters and spaces
5. ✅ Ensures uniqueness (adds `-1`, `-2` if needed)
6. ✅ Skips products that already have good handles
7. ✅ Shows detailed progress and summary

## Handle Generation Rules

```typescript
"Campingtisch (3)"           → "campingtisch"
"Anhängerbock universal"     → "anhaengerbock-universal"
"Hülse für Schwingarm"       → "hulse-fur-schwingarm"
"Gebraucht: Motor 100cm²"    → "gebraucht-motor-100cm"
```

**Rules:**

- Lowercase only
- German umlauts converted
- Spaces → hyphens
- Parentheses and content removed
- Special chars removed
- Max 60 characters
- No leading/trailing hyphens

## How to Run

### Option 1: Local Database (Development)

```bash
cd busbasisberlin

# Run the script
npx medusa exec ./src/scripts/run-fix-handles.ts
```

### Option 2: Remote Database (Production)

**Method A: SSH into production server**

```bash
# SSH into your VPS
ssh user@your-server.com

# Navigate to your MedusaJS directory
cd /path/to/medusajs

# Run the script
npm run exec -- ./src/scripts/run-fix-handles.ts
```

**Method B: Connect to remote database locally**

```bash
# In .env file, temporarily change database connection:
DATABASE_URL="postgresql://user:password@remote-host:5432/database"

# Run script locally
npx medusa exec ./src/scripts/run-fix-handles.ts

# Remember to change .env back after!
```

**Method C: Create a one-time admin API endpoint**

```typescript
// src/api/admin/products/fix-handles/route.ts
import fixProductHandles from '../../../../scripts/fix-product-handles';

export async function POST(req, res) {
	const container = req.scope;
	await fixProductHandles({ container });
	return res.json({ success: true });
}

// Then call: POST /admin/products/fix-handles
```

## Expected Output

```
🔧 Starting product handle fix...

📦 Found 2394 products

✅ Updated: "Campingtisch (3)"
   Old: /a-ct-001 → New: campingtisch

✅ Updated: "Anhängerbock universal (klein)"
   Old: ak-71-29g → New: anhaengerbock-universal-klein

✅ Skipping "Mercedes Kolbenring" - handle already good: mercedes-kolbenring

...

============================================================
📊 Summary:
   Total products: 2394
   ✅ Updated: 1842
   ⏭️  Skipped: 552
============================================================

📝 All changes:
1. /a-ct-001 → campingtisch
2. ak-71-29g → anhaengerbock-universal-klein
3. 9105900009 → hulse-schwingarm-gebraucht
...

✅ Product handle fix complete!
⚠️  Next step: Re-sync Meilisearch to update search index
```

## After Running the Script

### 1. Re-sync Meilisearch

```bash
# Via API (in browser or Postman)
POST http://localhost:9000/admin/meilisearch/sync

# Or via admin panel
# Navigate to: Products → Sync Meilisearch
```

### 2. Verify Changes

```bash
# Check a few products in admin panel
# Open: http://localhost:9000/app/products

# Check URLs work on storefront
# Example: http://localhost:8000/products/campingtisch
```

### 3. Test SEO

```bash
# Old URL (will 404)
https://your-store.com/products/a-ct-001  ❌

# New URL (works!)
https://your-store.com/products/campingtisch  ✅
```

## Safety Features

✅ **Read-only check first** - Script shows what will change before updating
✅ **Skips good handles** - Won't overwrite already SEO-friendly handles
✅ **Unique handles** - Adds numbers if duplicates exist
✅ **Error handling** - Continues even if one product fails
✅ **Detailed logging** - See exactly what changed

## Rollback (If Needed)

If something goes wrong, you can rollback from database backup:

```bash
# Restore from backup
pg_restore -d your_database backup_file.dump

# Or manually revert specific products in admin panel
```

## Production Deployment

### Before Running on Production:

1. ✅ **Test on local/staging first**
2. ✅ **Backup your database**
   ```bash
   pg_dump -U postgres -d medusa_db > backup_before_handles.sql
   ```
3. ✅ **Run during low traffic time**
4. ✅ **Monitor for errors**
5. ✅ **Re-sync Meilisearch after**

### Remote Execution Options:

**Option 1: Via SSH (Safest)**

```bash
ssh your-server
cd /var/www/medusajs
npm run exec -- ./src/scripts/run-fix-handles.ts
```

**Option 2: Via API Endpoint (Most Convenient)**
Create admin endpoint and call it:

```bash
curl -X POST https://your-api.com/admin/products/fix-handles \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Option 3: Via Database Migration**
Add to a Medusa migration and run `medusa migrations run`

## Troubleshooting

### "Command not found: medusa"

```bash
# Use npx instead
npx medusa exec ./src/scripts/run-fix-handles.ts
```

### "Cannot connect to database"

Check your `.env` file has correct `DATABASE_URL`

### "Permission denied"

```bash
# Run with sudo if needed
sudo npx medusa exec ./src/scripts/run-fix-handles.ts
```

### Script hangs or times out

- Database connection might be slow
- Try smaller batches (modify script to process 100 at a time)

## SEO Impact

### Before

- Non-descriptive URLs hurt SEO
- Users don't know what product is
- Low click-through rate

### After

- ✅ Descriptive, keyword-rich URLs
- ✅ Better Google ranking
- ✅ Higher click-through rate
- ✅ Shared URLs are meaningful

## Example Transformations

| Product Title                   | Old Handle   | New Handle                       | SEO Score  |
| ------------------------------- | ------------ | -------------------------------- | ---------- |
| Campingtisch (3) 100cm x 57 cm  | `/a-ct-001`  | `campingtisch`                   | ⭐⭐⭐⭐⭐ |
| Anhängerbock universal (klein)  | `ak-71-29g`  | `anhaengerbock-universal-klein`  | ⭐⭐⭐⭐⭐ |
| Gebrauchte Hülse für Schwingarm | `9105900009` | `hulse-fur-schwingarm-gebraucht` | ⭐⭐⭐⭐⭐ |
| Mercedes Benz Kolbenring        | `1591`       | `mercedes-benz-kolbenring`       | ⭐⭐⭐⭐⭐ |

---

_Script: `src/scripts/fix-product-handles.ts`_
_Runner: `src/scripts/run-fix-handles.ts`_
_Status: ✅ Ready to use_
_Date: 2025-10-25_
