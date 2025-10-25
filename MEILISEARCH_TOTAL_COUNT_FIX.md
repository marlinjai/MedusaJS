# Meilisearch Total Count Fix

## Problem

The catalog was returning a maximum of **1,000 products** in the total count, even when there were more products in the database. This is due to Meilisearch's default `maxTotalHits` setting which caps `estimatedTotalHits` at 1,000 for performance reasons.

## Root Cause

1. **Meilisearch Default Limit**: By default, Meilisearch limits `estimatedTotalHits` to 1,000
2. **Index Configuration Not Applied**: The `maxTotalHits: 10000` setting was in the code but hadn't been applied to the existing index
3. **Configuration Only Runs During Sync**: Index configuration is only applied when running a full sync or when explicitly triggered

## Solution Implemented

### 1. Smart Total Count Detection (`route.ts`)

Updated the catalog endpoint to intelligently detect the total count:

```typescript
// Priority: totalHits (exact) > estimatedTotalHits (capped) > hits.length
const totalCount =
	(catalogResults as any).totalHits ??
	catalogResults.estimatedTotalHits ??
	catalogResults.hits.length;
```

### 2. New Configuration Endpoint

Created `/admin/meilisearch/configure` endpoint to reconfigure indexes without a full resync:

**File**: `busbasisberlin/src/api/admin/meilisearch/configure/route.ts`

This endpoint:

- Applies `maxTotalHits: 10000` setting to the product index
- Applies configuration to the category index
- Completes in seconds (no data resyncing needed)

### 3. Admin UI Button

Added **"Reconfigure Indexes"** button to the Meilisearch settings page:

**File**: `busbasisberlin/src/admin/routes/settings/meilisearch/page.tsx`

Features:

- Prominent placement at the top of the page
- Clear description of what it does
- Loading state during reconfiguration
- Success/error toast notifications

## How to Fix the 1,000 Cap

### Option 1: Use the Admin UI (Recommended)

1. Go to **Admin Panel** → **Settings** → **Meilisearch**
2. Click the **"Reconfigure Indexes"** button in the "Index Configuration" section
3. Wait for the success message
4. Test the catalog - totals should now go beyond 1,000

### Option 2: Run Full Sync

1. Go to **Admin Panel** → **Settings** → **Meilisearch**
2. Click **"Sync Data to Meilisearch"**
3. This will reconfigure AND resync all data (takes longer)

### Option 3: API Call (For Testing)

```bash
curl -X POST http://localhost:9000/admin/meilisearch/configure \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Technical Details

### Configuration Applied

```typescript
await index.updatePaginationSettings({
	maxTotalHits: 10000, // Increased from default 1000
});
```

### What This Changes

- **Before**: `estimatedTotalHits` capped at 1,000
- **After**: `estimatedTotalHits` can go up to 10,000

### Performance Impact

- **Negligible**: Meilisearch handles this efficiently
- **No data resync needed**: Configuration change only
- **Instant effect**: Takes effect immediately after reconfiguration

## Verification

After reconfiguring, you should see in the logs:

```
info: Meilisearch response fields: totalHits=undefined, estimatedTotalHits=3456, hits=12
info: Catalog success: 12 products, total=3456, time=14ms
```

The `total` field should now show the actual count beyond 1,000.

## Files Changed

1. **`busbasisberlin/src/api/store/catalog/route.ts`**

   - Added smart total count detection
   - Added debug logging for Meilisearch response

2. **`busbasisberlin/src/api/admin/meilisearch/configure/route.ts`** (NEW)

   - Created dedicated configuration endpoint

3. **`busbasisberlin/src/admin/routes/settings/meilisearch/page.tsx`**

   - Added "Reconfigure Indexes" button
   - Added mutation hook for configuration

4. **`busbasisberlin/src/modules/meilisearch/service.ts`**
   - Already had `maxTotalHits: 10000` at line 133
   - No changes needed

## Notes

- The 10,000 limit is a reasonable balance between accuracy and performance
- If you need counts beyond 10,000, increase the `maxTotalHits` value in `service.ts` line 133
- Reconfiguration is safe and non-destructive (no data loss)
- Can be run multiple times without issues

## Future Considerations

If you need to handle catalogs with more than 10,000 products:

1. Increase `maxTotalHits` to 50,000 or 100,000 in `service.ts`
2. Run "Reconfigure Indexes" again
3. Monitor Meilisearch performance

---

**Created**: October 25, 2025
**Status**: ✅ Implemented and Ready to Use
