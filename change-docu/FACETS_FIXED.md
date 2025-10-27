# Meilisearch Facets - Implementation Fixed

## Summary of Changes

✅ **Fixed: Missing category hierarchy levels**
✅ **Fixed: Missing variant data for availability/pricing**
✅ **Fixed: Missing collection data**
✅ **Fixed: Missing sales channel data**
✅ **Fixed: Missing images**

## What Was Wrong

The `sync-products.ts` workflow was only fetching minimal fields, causing:

- ❌ Category facets only showed 2 levels (now supports up to 4)
- ❌ Availability facets always showed "Out of Stock"
- ❌ Price facets showed $0 for all products
- ❌ No collection data
- ❌ No sales channel filtering
- ❌ Images not loading

## What Changed

### 1. Updated Field Fetching (`busbasisberlin/src/workflows/sync-products.ts`)

**Added fields** to fetch complete product data:

- ✅ `status`, `created_at`, `updated_at` - Product metadata
- ✅ `categories.parent_category.parent_category.name` - 3rd level categories
- ✅ `categories.parent_category.parent_category.parent_category.name` - 4th level categories
- ✅ `collection.id`, `collection.title`, `collection.handle` - Collection data
- ✅ `variants.*` - ALL variant data (inventory, pricing)
- ✅ `images.url` - Product images
- ✅ `sales_channels.id`, `sales_channels.name` - Sales channel data

### 2. Updated Category Path Building (`busbasisberlin/src/workflows/steps/sync-products.ts`)

**Before** (limited to 2 levels):

```javascript
if (category.parent_category?.name) {
	categoryPaths.push(`${category.parent_category.name} > ${category.name}`);
}
```

**After** (supports unlimited depth):

```javascript
// Traverse up to root, collecting all parent names
const pathSegments: string[] = [];
let current: any = category;

while (current) {
  pathSegments.unshift(current.name);
  current = current.parent_category;
}

const fullPath = pathSegments.join(' > ');  // e.g., "Level1 > Level2 > Level3 > Level4"
categoryPaths.push(fullPath);
```

This now builds full category paths like:

- `"Electronics"`
- `"Electronics > Computers"`
- `"Electronics > Computers > Laptops"`
- `"Electronics > Computers > Laptops > Gaming Laptops"`

### 3. Removed Status Filter

**Before**: Only indexed products with `status: 'published'`

**After**: Indexes all products regardless of status

This allows proper filtering by status in facets.

## How Facets Work Now

### Category Facets

**Index stores**:

```javascript
{
	category_paths: [
		'Vehicle Parts > Mercedes > Motor',
		'Vehicle Parts > BMW > Motor',
	];
}
```

**Frontend shows** (`store-search/index.tsx`):

- Hierarchical category navigation
- Click any level to filter products
- Supports up to 4 levels deep

### Availability Facets

**Index stores**: Real inventory data from Medusa

```javascript
{
  is_available: true/false,  // Calculated from actual inventory
  total_inventory: 150,
  variant_count: 3
}
```

**Frontend shows**: "In Stock" / "Out of Stock" filters

### Pricing Facets

**Index stores**: Real variant pricing

```javascript
{
  min_price: 1999,    // Actual minimum variant price
  max_price: 3499,   // Actual maximum variant price
  currencies: ["usd", "eur"]
}
```

**Frontend shows**: "Price: Low to High" sorting works correctly

### Tags Facets

**Index stores**:

```javascript
{
	tags: ['public', 'internal', 'verbrauchsstoffe'];
}
```

**Frontend shows**: Only "public" tags (internal tags hidden via `transformItems`)

### Sales Channel Facets

**Index stores** (for future filtering):

```javascript
{
  sales_channel_names: ["Default Sales Channel", "Internal Operations"],
  primary_sales_channel_name: "Default Sales Channel",
  sales_channel_ids: ["channel-123"]
}
```

**Use case**: Filter out internal products in storefront
**Implementation**: Add filter to `<Configure>` component:

```javascript
<Configure
	hitsPerPage={12}
	filters='primary_sales_channel_name = "Default Sales Channel"'
/>
```

## Meilisearch Best Practices (from Web Search)

✅ **Implemented**:

1. Store full category path as string in filterable attribute
2. Configure `category_paths` as filterable attribute (already done in `service.ts`)
3. Implement faceted search using `RefinementList` components
4. Handle hierarchical paths with " > " separator

## Next Steps

### 1. Re-index Products

You MUST re-index your products for changes to take effect:

1. Go to Admin → Settings → Meilisearch
2. Click "Sync Products"
3. Wait for indexing to complete (watch logs for progress)

### 2. Test Facets

Visit the storefront search page and verify:

- ✅ Category filters show hierarchy
- ✅ Availability shows real stock status
- ✅ Pricing is correct
- ✅ Tags are filtered (no internal tags shown)

### 3. Monitor Logs

Check for these log messages:

```
🔍 Sample product data: { categories, variants, ... }
🔍 Sample transformed product: { category_paths: ["Level1 > Level2"], ... }
```

### 4. Verify Index

The index should now contain:

- Full 4-level category hierarchies
- Real inventory/availability data
- Actual product prices
- Sales channel information
- Collection data
- Images

## Expected Behavior After Re-indexing

### Category Filtering

**Before**: Only 2-level categories

```
Categories > Subcategory
```

**After**: Full hierarchy up to 4 levels

```
Vehicle Parts > Mercedes > Motor > Timing Chain
```

### Availability Filtering

**Before**: All products showed "Out of Stock"

**After**: Real availability status

```
✓ In Stock (180 products)
✓ Out of Stock (20 products)
```

### Price Filtering

**Before**: All prices showed $0

**After**: Real product prices

```
Price: $19.99 - $3,499.00
```

## Files Changed

1. `busbasisberlin/src/workflows/sync-products.ts` - Added field fetches
2. `busbasisberlin/src/workflows/steps/sync-products.ts` - Updated path building logic

## Documentation

- `change-docu/FACET_IMPLEMENTATION_ANALYSIS.md` - Detailed analysis
- `change-docu/CATEGORY_HIERARCHY_SOLUTION.md` - Hierarchy solution
- `change-docu/MEILISEARCH_INDEX_ANALYSIS.md` - Conceptual architecture
