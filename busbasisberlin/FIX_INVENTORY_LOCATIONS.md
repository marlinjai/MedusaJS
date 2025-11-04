# Fix: "Item is not stocked at location undefined" Error

**Date:** November 4, 2025
**Issue:** Checkout fails with "Item is not stocked at location undefined"
**Status:** ✅ Fixed - Requires Running Fix Script

## Problem

When trying to checkout, you get this error:

```
Error: Item iitem_01K5CB4409PDV6RMF676FMP7X3 is not stocked at location undefined
Error: The cart items require shipping profiles that are not satisfied by the current shipping methods
```

## Root Cause

In Medusa v2, **every inventory item MUST be assigned to a stock location**. The error "location undefined" means:

1. ✅ Product has a shipping profile
2. ✅ Variant has inventory management enabled
3. ❌ **Inventory item is NOT linked to any stock location**

Without a stock location, Medusa can't:
- Calculate shipping options (needs to know where items are stored)
- Reserve inventory during checkout
- Fulfill orders

## Solution

### Option 1: Run Fix Script (Recommended) ✅

**Quick fix for existing products:**

```bash
# In your backend directory
cd busbasisberlin
npx medusa exec ./src/scripts/fix-inventory-locations.ts
```

**What this does:**
1. Creates a default stock location if none exists
2. Finds all inventory items without locations
3. Assigns them to the default stock location
4. Sets initial quantity to 0 (update in admin later)

### Option 2: Manual Fix via Admin Panel

1. **Create Stock Location:**
   - Go to Admin → Settings → Locations & Shipping
   - Click "Stock Locations"
   - Create new location: "Default Warehouse"
   - Address: Hauptstraße 51, 16547 Birkenwerder, Germany

2. **Assign Inventory Items:**
   - Go to Products → Select product
   - Edit variant
   - In "Inventory" section, ensure it's linked to the stock location
   - Set stock quantity

### Option 3: Use PostgreSQL MCP Tool

If you have many products, use SQL to check and fix:

```sql
-- Check inventory items without locations
SELECT
    ii.id as inventory_item_id,
    ii.sku,
    COUNT(il.id) as location_count
FROM inventory_item ii
LEFT JOIN inventory_level il ON il.inventory_item_id = ii.id
GROUP BY ii.id, ii.sku
HAVING COUNT(il.id) = 0;

-- Get default stock location ID
SELECT id, name FROM stock_location LIMIT 1;

-- Then run the fix script (better than manual SQL)
```

## Prevention

**Already Fixed:** The import script now automatically creates a stock location if none exists (lines 398-424 in `import-products.ts`).

**For future imports:**
- The import script will create "Default Warehouse" if no stock locations exist
- All products will automatically get inventory levels assigned

## Verification

After running the fix script, verify:

### Check 1: Stock Location Exists

```bash
# Using PostgreSQL MCP or psql
SELECT id, name FROM stock_location;
```

Should return at least one location.

### Check 2: Inventory Items Have Locations

```bash
# Check inventory levels
SELECT
    il.inventory_item_id,
    il.location_id,
    il.stocked_quantity,
    sl.name as location_name
FROM inventory_level il
JOIN stock_location sl ON sl.id = il.location_id
LIMIT 10;
```

Should show inventory items linked to locations.

### Check 3: Test Checkout

1. Add product to cart
2. Go to checkout
3. Should NOT see "location undefined" error
4. Shipping options should appear correctly

## Why This Happened

**Likely scenario:**
1. Products were imported before a stock location was created
2. Import script checks for stock location (line 388)
3. If none exists, it warns but doesn't create one (old behavior)
4. Products imported without inventory levels
5. Inventory items exist but have no `location_id`

**Fixed in:** `import-products.ts` now automatically creates stock location if missing.

## Related Files

- ✅ `src/scripts/fix-inventory-locations.ts` - Fix script for existing products
- ✅ `src/scripts/import-products.ts` - Updated to auto-create stock location
- ✅ `src/scripts/seed.ts` - Creates stock location during initial seed

## Quick Command Reference

```bash
# Fix existing inventory items
npx medusa exec ./src/scripts/fix-inventory-locations.ts

# Re-import products (will auto-create location if needed)
npx medusa exec ./src/scripts/import-products.ts

# Seed fresh database (includes stock location)
npx medusa exec ./src/scripts/seed.ts
```

## After Fix

Once inventory items have locations:
- ✅ Checkout will work
- ✅ Shipping options will appear
- ✅ Orders can be fulfilled
- ✅ Inventory tracking works correctly

## Notes

- **Stock quantity is set to 0** by the fix script
- Update quantities in admin panel after running fix
- Or set `allow_backorder: true` on variants to allow purchases with 0 stock
- The fix script processes in batches of 50 items to avoid timeouts

