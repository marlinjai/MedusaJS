# Critical Data Fix - Variants, Prices, SKUs, Availability

## Date: October 15, 2025

## 🐛 **Problems Found**

Looking at sync logs, products were being indexed with:

- ❌ `variants: undefined`
- ❌ `is_available: false` (always)
- ❌ `min_price: 0`
- ❌ `max_price: 0`
- ❌ `currencies: []` (empty)
- ❌ `tags: ['public']` (minimal data)

## 🔍 **Root Cause**

**File:** `src/workflows/sync-products.ts`

The workflow was **NOT fetching variant data**:

### Before (Incomplete):

```typescript
fields: [
	'id',
	'title',
	'description',
	'handle',
	'thumbnail',
	'categories.id',
	'categories.name',
	'categories.handle',
	'tags.id',
	'tags.value',
];
```

**Missing:**

- ❌ No `variants` fields
- ❌ No `variants.prices`
- ❌ No `variants.sku`
- ❌ No `variants.inventory` data
- ❌ No `collection` data
- ❌ No `status` field

**Result:** Empty variants → No prices → No availability calculation → Everything shows as unavailable!

---

## ✅ **Fix Applied**

### After (Complete):

```typescript
fields: [
	'id',
	'title',
	'description',
	'handle',
	'thumbnail',
	'status', // ✅ Added
	'created_at', // ✅ Added
	'updated_at', // ✅ Added
	'categories.id',
	'categories.name',
	'categories.handle',
	'categories.parent_category.name', // ✅ Added for hierarchy
	'tags.id',
	'tags.value',
	'collection.id', // ✅ Added
	'collection.title', // ✅ Added
	'collection.handle', // ✅ Added
	'variants.id', // ✅ Added
	'variants.sku', // ✅ Added
	'variants.title', // ✅ Added
	'variants.manage_inventory', // ✅ Added
	'variants.allow_backorder', // ✅ Added
	'variants.prices.amount', // ✅ CRITICAL!
	'variants.prices.currency_code', // ✅ CRITICAL!
];
```

---

## 📊 **What This Fixes**

### 1. Prices & Currencies ✅

```typescript
// Now properly extracts:
variants.forEach(variant => {
	variant.prices.forEach(price => {
		minPrice = Math.min(minPrice, price.amount);
		maxPrice = Math.max(maxPrice, price.amount);
		currencies.push(price.currency_code); // EUR, USD, etc.
	});
});
```

### 2. SKUs ✅

```typescript
// Now properly extracts:
variants.forEach(variant => {
	if (variant.sku) {
		skus.push(variant.sku); // Makes products searchable by SKU
	}
});
```

### 3. Availability ✅

```typescript
// Now can properly calculate:
variants.forEach(variant => {
	if (
		variant.allow_backorder ||
		!variant.manage_inventory ||
		realInventory > 0
	) {
		isAvailable = true; // Properly set!
	}
});
```

### 4. Collections ✅

```typescript
// Now properly includes:
collection_id: product.collection?.id,
collection_title: product.collection?.title,
collection_handle: product.collection?.handle,
```

---

## 🧪 **Testing the Fix**

### 1. Trigger a Re-sync

**Option A: Via Admin UI**

```
1. Go to: http://localhost:9000/app/settings/meilisearch
2. Click "Sync Data to Meilisearch"
3. Wait for completion
```

**Option B: Update a Product**

```
1. Edit any product
2. Save
3. Check logs
```

### 2. Check Logs for Correct Data

**Before (broken):**

```json
{
	"variants": undefined, // ❌ No variants
	"is_available": false, // ❌ Always false
	"min_price": 0, // ❌ No price
	"currencies": [], // ❌ Empty
	"tags": ["public"]
}
```

**After (fixed):**

```json
{
  "variants": [...],               // ✅ Has variants
  "is_available": true,            // ✅ Correctly calculated
  "min_price": 15990,              // ✅ Actual price (in cents)
  "max_price": 15990,
  "currencies": ["eur"],           // ✅ Has currency
  "skus": ["AHK-3.0"],            // ✅ Has SKUs
  "collection_title": "Featured"   // ✅ Has collection
}
```

### 3. Verify in Meilisearch

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:7700/indexes/products/documents/prod_01K5CAV5TR48N7X47BWGA4JDXN" \
  | jq '.is_available, .min_price, .currencies, .skus'
```

**Should show:**

```json
true              // is_available
15990             // min_price
["eur"]           // currencies
["SKU-123"]       // skus
```

---

## 🎯 **Why This Happened**

The initial workflow query was **too minimal**. It only fetched:

- Basic product info (title, description)
- Category names
- Tag values

It was **missing all variant-related data**, which is where:

- Prices live (`variants.prices`)
- SKUs live (`variants.sku`)
- Inventory settings live (`variants.manage_inventory`)

Without variants, the sync step couldn't:

- Calculate prices
- Determine availability
- Extract SKUs
- Get currencies

---

## ✅ **After Fix**

Now the sync workflow fetches **complete product data** including:

- ✅ All variant information
- ✅ Variant prices with currency codes
- ✅ Variant SKUs
- ✅ Inventory management settings
- ✅ Collection data
- ✅ Parent category hierarchy

This enables proper calculation of:

- ✅ `is_available` based on inventory + backorder settings
- ✅ `min_price` / `max_price` from variant prices
- ✅ `currencies` array from all variant prices
- ✅ `skus` array for SKU-based search
- ✅ `collection_title` for collection filtering

---

## 📝 **Next Steps**

1. **Trigger a full re-sync** via admin UI button
2. **Check logs** - should now show:
   ```
   variants: [ {...}, {...} ]  // ✅ Not undefined
   sampleVariant: { prices: [...] }  // ✅ Has prices
   ```
3. **Verify search** - products should show as available with correct prices

Try the sync now and check if the data looks better! 🚀

