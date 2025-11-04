# Debugging: No Shipping Options Available

**Issue:** Products show "No shipping options available" message at checkout even though shipping profiles are configured.

## Problem Analysis

When you see this message:
```
⚠️ Keine Versandoptionen verfügbar
Für die Produkte in Ihrem Warenkorb sind keine Versandoptionen konfiguriert.
```

It means the Medusa API endpoint `/store/shipping-options?cart_id=X` is returning an empty array.

## Common Causes

### 1. Product Missing Shipping Profile ⚠️ MOST COMMON

**Check:**
```sql
-- Find products without shipping profiles
SELECT
    p.id,
    p.title,
    p.handle,
    p.status,
    p.shipping_profile_id
FROM product p
WHERE p.shipping_profile_id IS NULL
   OR p.shipping_profile_id = '';
```

**Fix in Admin:**
1. Go to Products → Select product
2. Scroll to "Shipping" section
3. Select a shipping profile (e.g., "Default Shipping Profile" or "Standard")
4. Save product

### 2. Shipping Profile Has No Shipping Options

**Check:**
```sql
-- Check if shipping profile has options
SELECT
    sp.id as profile_id,
    sp.name as profile_name,
    so.id as option_id,
    so.name as option_name,
    so.price_type,
    sz.name as service_zone_name
FROM shipping_profile sp
LEFT JOIN shipping_option so ON so.shipping_profile_id = sp.id
LEFT JOIN service_zone sz ON so.service_zone_id = sz.id
WHERE sp.id = 'YOUR_PROFILE_ID';
```

**Fix in Admin:**
1. Go to Settings → Locations & Shipping
2. Find your shipping profile
3. Add shipping options (e.g., "Standard Shipping", "Express")
4. Configure prices and regions

### 3. Shipping Options Not Available for Customer's Region

**Check:**
```sql
-- Check if shipping options cover the customer's region
SELECT
    sz.name as zone_name,
    sz.id as zone_id,
    sza.type as geo_zone_type,
    sza.country_code
FROM service_zone sz
JOIN shipping_option so ON so.service_zone_id = sz.id
JOIN service_zone_geo_zone sza ON sza.service_zone_id = sz.id
WHERE so.shipping_profile_id = 'YOUR_PROFILE_ID';
```

**Expected:** Should include `country_code = 'de'` (Germany) or whatever region the customer is in.

**Fix in Admin:**
1. Settings → Locations & Shipping
2. Edit service zone
3. Add countries (DE, AT, CH, etc.)

### 4. Fulfillment Set Not Configured

**Check:**
```sql
-- Check fulfillment set configuration
SELECT
    fs.id,
    fs.name,
    fs.type,
    sz.id as zone_id,
    sz.name as zone_name
FROM fulfillment_set fs
LEFT JOIN service_zone sz ON sz.fulfillment_set_id = fs.id;
```

**Fix:**
Ensure you have at least one fulfillment set with type='shipping' (not just 'pickup').

## Quick Diagnostic Steps

### Step 1: Check Cart Contents

```bash
# Get your cart ID from browser DevTools:
# Application → Cookies → _medusa_cart_id

curl https://basiscamp-berlin.de/store/carts/YOUR_CART_ID \
  -H "x-publishable-api-key: YOUR_KEY"
```

Look for:
- `items[].variant.product.shipping_profile_id` - Should not be null

### Step 2: Check Available Shipping Options

```bash
curl "https://basiscamp-berlin.de/store/shipping-options?cart_id=YOUR_CART_ID" \
  -H "x-publishable-api-key: YOUR_KEY"
```

**Expected:** Array of shipping options
**Problem:** Empty array `{ shipping_options: [] }`

### Step 3: Check Product Details

```bash
curl "https://basiscamp-berlin.de/store/products/YOUR_PRODUCT_ID?fields=*shipping_profile" \
  -H "x-publishable-api-key: YOUR_KEY"
```

Look for:
- `shipping_profile.id` - Should exist
- `shipping_profile.name` - Should be meaningful (e.g., "Standard")

## Fix in Code: Import Script

The import script already handles this (lines 1220-1260):

```typescript
// Only publish if active AND has shipping profile
const canPublish = isActive && defaultShippingProfile;

if (isActive && !defaultShippingProfile) {
    logger.warn(
        `⚠️  Product ${sku} marked as active but no shipping profile available - importing as DRAFT`,
    );
}

// Assign shipping profile if available
shipping_profile_id: defaultShippingProfile?.id || undefined,
```

**Issue:** If `defaultShippingProfile` is null during import, products are created without shipping profiles.

**Solution:** Ensure default shipping profile exists BEFORE running import:

```bash
# Create default shipping profile in admin FIRST
# Then run import script
npm run seed
```

## Admin UI Quick Fix

**For existing products without shipping profiles:**

1. **Bulk Update via Admin:**
   - Go to Products
   - Filter: Status = Published
   - Select all
   - Bulk Actions → "Edit Shipping Profile"
   - Select "Default Shipping Profile"
   - Save

2. **Check Shipping Profile Configuration:**
   - Settings → Locations & Shipping
   - Click on "Default Shipping Profile"
   - Verify it has shipping options:
     - ✅ Standard Shipping (€4.99)
     - ✅ Express Shipping (€9.99)
     - ✅ Service Zone covers Germany (DE)

## Testing After Fix

### Test 1: Product Page

1. Go to any product page
2. Should show: "Versand: Lieferzeit: 2-3 Werktage 🚚"
3. NOT: "⚠️ Keine Versandoptionen"

### Test 2: Add to Cart

1. Add product to cart
2. Go to checkout
3. Should see shipping options with prices
4. NOT: Yellow warning box

### Test 3: API Direct

```bash
# Should return shipping options
curl "https://basiscamp-berlin.de/store/shipping-options?cart_id=YOUR_CART_ID" \
  -H "x-publishable-api-key: YOUR_KEY" | jq .shipping_options
```

**Expected output:**
```json
[
  {
    "id": "so_123",
    "name": "Standard Shipping",
    "amount": 499,
    "price_type": "flat"
  }
]
```

## Database Quick Fix

If many products are missing shipping profiles:

```sql
-- Get default shipping profile ID
SELECT id, name FROM shipping_profile WHERE name LIKE '%Default%' OR name LIKE '%Standard%';

-- Update all products without shipping profile to use default
UPDATE product
SET shipping_profile_id = 'sp_YOUR_DEFAULT_PROFILE_ID'
WHERE shipping_profile_id IS NULL
   AND status = 'published';
```

**⚠️ WARNING:** Backup database first! Test on one product before bulk update.

## Prevention

### In Import Script

Ensure this check exists (it does):

```typescript
// Verify default shipping profile exists
const defaultShippingProfile = await getDefaultShippingProfile(shippingProfileModule);

if (!defaultShippingProfile) {
    logger.error('❌ No default shipping profile found! Products will be imported as DRAFT.');
}
```

### In Product Creation Workflow

Always assign shipping profile when creating products:

```typescript
const product = await productModuleService.createProducts({
    // ... other fields ...
    shipping_profile_id: shippingProfile.id, // REQUIRED!
});
```

## Related Files

- **Frontend Warning:** `busbasisberlin-storefront/src/modules/checkout/templates/unified-checkout/index.tsx` (line 244)
- **Shipping Options Fetch:** `busbasisberlin-storefront/src/lib/data/cart.ts` (line 457)
- **Import Script:** `busbasisberlin/src/scripts/import-products.ts` (line 1220)
- **Product Display:** `busbasisberlin-storefront/src/modules/products/components/shipping-info/index.tsx`

## Summary

**Root Cause:** Products don't have `shipping_profile_id` set, so Medusa can't find shipping options for them.

**Quick Fix:**
1. Admin → Products → Select product → Set shipping profile
2. Or use SQL to bulk update

**Long-term Fix:**
1. Ensure default shipping profile exists before importing
2. Import script already handles this correctly
3. Verify shipping options are configured for your region

**Test:** Add product to cart, go to checkout, should see shipping options.

