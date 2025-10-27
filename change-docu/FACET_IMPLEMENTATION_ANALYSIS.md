# Meilisearch Facets - Current Implementation Analysis

## Issue Found: Missing Field Fetches

### The Problem

Looking at `busbasisberlin/src/workflows/sync-products.ts` (lines 19-30), the fields array is **missing critical data** that the extraction step expects:

```javascript
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

### What's Missing

The extraction code in `sync-products.ts` (lines 96-258) expects these fields but they're **NOT being fetched**:

1. **Categories**: Missing `categories.parent_category.name` (line 107-113 tries to use it)
2. **Variants**: Missing ALL variant fields (lines 125-174 access variant data)
3. **Collection**: Missing ALL collection fields (lines 237-240)
4. **Images**: Missing `images.url` (line 206)
5. **Status & Dates**: Missing `status`, `created_at`, `updated_at` (lines 207-209)
6. **Sales Channels**: Missing `sales_channels.id`, `sales_channels.name` (lines 193-198)

### Critical Impact

**Categories will be broken** because line 107-113 tries to access `category.parent_category?.name` but `parent_category` is never fetched:

```javascript
// This will always be undefined!
if (category.parent_category?.name) {
	categoryPaths.push(`${category.parent_category.name} > ${category.name}`);
}
```

**Availability calculation will fail** because line 133-157 accesses variant inventory data that was never fetched.

**Pricing won't work** because line 160-172 tries to access variant prices that don't exist.

**Sales channels will be empty arrays** because line 193 tries to get `product.sales_channels` but it was never fetched.

---

## Current Facet Configuration vs. Reality

### What's Configured as Filterable (service.ts lines 105-124)

```javascript
await index.updateFilterableAttributes([
	'category_names', // ❌ Will be empty (no parent_category fetched)
	'category_paths', // ❌ Will be broken (no parent_category fetched)
	'category_handles', // ✅ Should work
	'category_ids', // ✅ Should work
	'is_available', // ❌ Will be wrong (no variant inventory data)
	'min_price', // ❌ Will be 0 (no variant prices fetched)
	'max_price', // ❌ Will be 0 (no variant prices fetched)
	'currencies', // ❌ Will be empty (no variant prices)
	'tags', // ✅ Should work
	'collection_*', // ❌ Will be null (not fetched)
	'sales_channel_*', // ❌ Will be empty arrays (not fetched)
]);
```

### What's Actually Indexed

Based on missing fields, here's what will actually be in the index:

```javascript
{
  id: string,
  title: string,
  description: string,
  handle: string,
  thumbnail: string,
  images: [], // Will be empty or broken
  status: undefined, // Not fetched

  // Categories - BROKEN
  category_names: ['Electronics'], // ✅ Works
  category_handles: ['electronics'], // ✅ Works
  category_paths: ['Electronics'], // ❌ Missing parent info - only direct categories
  category_ids: ['123'], // ✅ Works

  // Availability - BROKEN
  is_available: false, // ❌ Defaults to false, no variant data
  total_inventory: 0, // ❌ No variant data
  variant_count: 0, // ❌ No variant data

  // Pricing - BROKEN
  min_price: 0, // ❌ No variant prices
  max_price: 0, // ❌ No variant prices
  currencies: [], // ❌ No variant prices
  price_range: '0', // ❌ No variant prices

  // Tags - WORKS
  tags: ['public', 'featured'], // ✅ Works

  // Collection - BROKEN
  collection_id: undefined, // ❌ Not fetched
  collection_title: undefined, // ❌ Not fetched
  collection_handle: undefined, // ❌ Not fetched

  // Sales Channels - BROKEN
  sales_channel_names: [], // ❌ Empty array
  primary_sales_channel_name: 'Default Sales Channel', // ❌ Default value only
  sales_channel_ids: [], // ❌ Empty array
}
```

---

## Frontend Facet Usage

Looking at `store-search/index.tsx`:

### Line 57: Categories Facet

```javascript
<RefinementList
	attribute="category_paths"
	transformItems={items => {
		/* ... */
	}}
/>
```

**Impact**: This will work but only show flat categories (no hierarchy) because `parent_category.name` was never fetched.

### Line 132: Availability Facet

```javascript
<RefinementList attribute="is_available" />
```

**Impact**: Will show "Out of Stock" for all products because availability calculation has no data.

### Line 173: Tags Facet

```javascript
<RefinementList
	attribute="tags"
	transformItems={items =>
		items.filter(
			item => item.label !== 'internal' && item.label !== 'verbrauchsstoffe',
		)
	}
/>
```

**Impact**: ✅ This works correctly.

---

## The Fix Needed

### Update `sync-products.ts` fields array

Add ALL missing fields:

```javascript
fields: [
  // Basic info
  'id',
  'title',
  'description',
  'handle',
  'thumbnail',
  'status',
  'created_at',
  'updated_at',

  // Categories - WITH PARENT INFO
  'categories.id',
  'categories.name',
  'categories.handle',
  'categories.parent_category.name', // 👈 MISSING!

  // Tags
  'tags.id',
  'tags.value',

  // Collection
  'collection.id',           // 👈 MISSING!
  'collection.title',        // 👈 MISSING!
  'collection.handle',       // 👈 MISSING!

  // Variants - ALL FIELDS
  'variants.id',             // 👈 MISSING!
  'variants.sku',            // 👈 MISSING!
  'variants.title',          // 👈 MISSING!
  'variants.manage_inventory', // 👈 MISSING!
  'variants.allow_backorder', // 👈 MISSING!
  'variants.prices.amount',   // 👈 MISSING!
  'variants.prices.currency_code', // 👈 MISSING!

  // Images
  'images.url',              // 👈 MISSING!

  // Sales Channels
  'sales_channels.id',        // 👈 MISSING!
  'sales_channels.name',      // 👈 MISSING!
],
```

---

## Summary: Are Facets Indexed Correctly?

### ✅ Working

- Basic product fields (id, title, description, handle, thumbnail)
- Category names and handles (flat categories only)
- Tags

### ❌ Broken

- Category paths (no hierarchy - parent_category not fetched)
- Availability (no variant inventory data)
- Pricing (no variant prices)
- Images (not fetched)
- Status, dates (not fetched)
- Collection data (not fetched)
- Sales channel data (not fetched, but extraction code expects it)
- Variant count (no variant data)

### Frontend Impact

**Categories Facet** (line 57):

- Will show category names but without hierarchy
- Parent > Child paths won't work

**Availability Facet** (line 132):

- Will show all products as "Out of Stock"

**Tags Facet** (line 173):

- ✅ Works correctly

---

## Next Steps

1. **Add all missing fields** to the `fields` array in `sync-products.ts`
2. **Test extraction** by checking logs for sample transformed product
3. **Re-index** all products
4. **Verify facets** work in storefront

The facets are configured correctly, but the data extraction is incomplete because the workflow doesn't fetch the required fields.
