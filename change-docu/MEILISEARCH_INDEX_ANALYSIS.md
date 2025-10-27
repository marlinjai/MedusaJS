# Meilisearch Index Architecture - Conceptual Analysis

## Current State Analysis

### What Gets Indexed Now

Based on the code review, here's what's currently indexed in Meilisearch:

#### 1. Products (Index Name: `products`)

**Data Extracted** (from `busbasisberlin/src/workflows/steps/sync-products.ts`):

```javascript
{
  // Basic product info
  id, title, description, handle, thumbnail, images, status,

  // Category data (for faceting and filtering)
  category_names: [],           // Simple category names
  category_handles: [],         // Category handles for URLs
  category_paths: [],          // Hierarchical paths like "Parent > Child"
  category_ids: [],            // For filtering by ID

  // Sales channel data (CRITICAL for filtering internal products)
  sales_channel_names: [],     // All channels this product belongs to
  primary_sales_channel_name,   // Main channel name
  sales_channel_ids: [],       // Channel IDs

  // Availability & Pricing
  is_available,               // Calculated from inventory
  total_inventory,            // Total stock across variants
  variant_count,              // Number of variants
  min_price, max_price,       // Price range for filtering
  price_range,                // Formatted string
  currencies: [],             // Supported currencies

  // Search & Discovery
  tags: [],                   // Product tags for filtering
  skus: [],                   // SKU list for search
  collection_id,              // Collection grouping
  collection_title,           // Collection name
  collection_handle,         // Collection URL handle

  // Optimized search field
  searchable_text            // Combined searchable content
}
```

**Index Configuration** (filterable attributes):

- `category_names`, `category_paths` - For category filtering
- `is_available` - Availability filter
- `min_price`, `max_price` - Price range filtering
- `currencies` - Currency filtering
- `tags` - Tag-based filtering
- `collection_*` - Collection filtering
- `sales_channel_*` - Sales channel filtering (KEY for excluding internal products)

#### 2. Categories (Index Name: `categories`)

**Currently configured but needs verification** - The category sync workflow exists but status is unclear.

---

## Critical Discovery: Index-Time Filtering

Looking at `busbasisberlin/src/workflows/sync-products.ts` lines 53-58:

```javascript
filters: {
  sales_channels: {
    name: 'Default Sales Channel',
  },
  ...filters,
}
```

**The workflow ALREADY filters at fetch time, only indexing public products!**

This means:

- ✅ Internal products are NOT being indexed (filtered out before indexing)
- ✅ Only "Default Sales Channel" products are in Meilisearch
- ❌ The sales channel extraction in `sync-products.ts` (lines 193-198) is trying to get data that doesn't exist because it's been filtered out

**BUT**: The user said "The products have the sales channel information and mail research." So either:

1. The filter isn't working as expected, OR
2. The sales channel data comes from tags, not actual sales channel relationships

---

## How Meilisearch Facets Work

### Understanding Facets

**Facets** = Aggregations of attribute values and their counts

Example:

```javascript
// Query: "laptop"
// Facet distribution returns:
{
  "category_names": {
    "Electronics": 150,
    "Computers": 87,
    "Accessories": 23
  },
  "tags": {
    "public": 200,
    "internal": 15,
    "on-sale": 45
  },
  "is_available": {
    "true": 180,
    "false": 20
  }
}
```

### The Faceting Flow

1. **Index** = Store ALL data (products)
2. **Query** = Search text + filters
3. **Facets** = Calculate counts for filterable attributes
4. **Results** = Filtered list + facet distribution

### Filterable vs Searchable

- **Searchable**: Used for full-text search (searchable_text, title, description)
- **Filterable**: Used for faceted filtering (category_names, tags, is_available)
- **Sortable**: Used for sorting (min_price, created_at, updated_at)

---

## Current Problem: Mixed Approach

The implementation is trying to do BOTH index-time filtering AND query-time filtering:

1. **Index time**: Filters by sales channel in `sync-products.ts` (lines 53-58) - only "Default Sales Channel" products
2. **Query time**: Frontend tries to extract sales channel info that doesn't exist because it was filtered out
3. **Result**: Confusion about where filtering should happen

---

## Conceptual Solution: Choose One Approach

### Option A: Index Everything, Filter at Query Time ✅ (Recommended by User)

**Pros:**

- Maximum flexibility
- Can search all products (admin use case)
- Can filter by any criteria dynamically
- True "Option 2" implementation

**Cons:**

- Larger index size
- Need to always apply filters in frontend
- Must ensure sales channel data is properly indexed

**Implementation:**

1. **Index ALL products** (remove sales channel filter from line 53-58 in `sync-products.ts`)

2. **Add sales channel to products** in `sync-products.ts` (lines 193-198):

   ```javascript
   const salesChannels = product.sales_channels || [];
   const salesChannelNames = salesChannels.map(sc => sc.name);
   const primarySalesChannelName = salesChannelNames[0];
   const salesChannelIds = salesChannels.map(sc => sc.id);
   ```

3. **Ensure sales channel fields are fetched** in `sync-products.ts` workflow:

   ```javascript
   'sales_channels.id',
   'sales_channels.name',
   ```

4. **Configure sales channel as filterable** in `service.ts` (already done ✅)

5. **Filter at query time** in storefront using InstantSearch `<Configure>`:
   ```javascript
   <Configure
   	hitsPerPage={12}
   	filters='primary_sales_channel_name = "Default Sales Channel"'
   />
   ```

### Option B: Index Only Public Products, No Query-Time Filter

**Pros:**

- Smaller index
- Simpler - no frontend filtering needed
- Data integrity guaranteed at index level

**Cons:**

- Less flexible
- Can't search internal products in admin
- Need to re-index when products move between channels

**Implementation:**

1. **Keep sales channel filter** in `sync-products.ts` (lines 53-58)
2. **Remove sales channel extraction** from `sync-products.ts` (lines 193-198) - not needed
3. **Don't configure sales channel as filterable** - not in index
4. **No frontend filtering needed** - everything in index is public

---

## Recommendation: Option A (Index Everything)

### Why This Makes Sense

1. **User preference**: Explicitly chose "Option 2"
2. **Admin needs**: Should be able to search all products in admin
3. **Future flexibility**: Can filter by any combination of attributes
4. **Data completeness**: Single source of truth for all products

### What Needs to Change

1. **Remove index-time filter** from `sync-products.ts` line 53-58:

   ```javascript
   // REMOVE this:
   filters: {
   	sales_channels: {
   		name: 'Default Sales Channel';
   	}
   }

   // REPLACE with:
   filters: filters; // Just pass through filters
   ```

2. **Add sales channel fields** to fetch in `sync-products.ts` workflow:

   ```javascript
   fields: [
   	// ... existing fields ...
   	'sales_channels.id',
   	'sales_channels.name',
   ];
   ```

3. **Keep sales channel extraction** in `sync-products.ts` step (lines 193-198) - this is correct

4. **Keep sales channel as filterable** in `service.ts` (already done ✅)

5. **Add filter to frontend** in store search:

   ```javascript
   <Configure
   	hitsPerPage={12}
   	filters='primary_sales_channel_name = "Default Sales Channel"'
   />
   ```

6. **Transform tags refinement list** to exclude internal tags (already done in lines 174-179 ✅)

---

## Meilisearch Index Design Principles

### What to Index

1. **Products** - All product data needed for display and filtering
2. **Categories** - If category-only searches are needed
3. **NO need for separate index** for admin vs storefront - filter at query time

### Required Data Per Product

```javascript
{
  // Identifiers
  id, handle,

  // Display
  title, description, thumbnail, images, status,

  // Filtering dimensions
  category_names: [],       // Category filtering
  category_paths: [],      // Hierarchical display
  tags: [],                // Tag filtering
  is_available,            // Availability filtering
  min_price, max_price,   // Price filtering
  currencies: [],         // Currency filtering

  // Sales channel (for excluding internal)
  sales_channel_names: [],      // All channels
  primary_sales_channel_name,   // Main channel
  sales_channel_ids: [],        // Channel IDs

  // Search optimization
  searchable_text,        // Combined search field
  skus: [],              // SKU search
}
```

### Filterable Attributes (for faceting)

- `category_names` - Show category list with counts
- `category_paths` - Hierarchical category navigation
- `tags` - Tag-based filtering (EXCLUDE internal/verbrauchsstoffe)
- `is_available` - In stock / out of stock filter
- `currencies` - Currency selection
- `collection_title` - Collection filtering
- `primary_sales_channel_name` - Sales channel filtering (for storefront)

### Searchable Attributes (for relevance)

- `title` - Product name
- `description` - Product description
- `searchable_text` - Combined search field
- `tags` - Tags as search terms
- `skus` - SKU search
- `category_names` - Category names

### Sortable Attributes

- `min_price`, `max_price` - Price sorting
- `created_at`, `updated_at` - Date sorting
- `title` - Alphabetical sorting
- `variant_count` - Variant count sorting

---

## Facets and Filtering Explained

### How Facets Work

When you search "laptop" and get this facet distribution:

```javascript
{
  "category_names": {
    "Electronics": 150,
    "Computers": 87,
    "Accessories": 23
  },
  "tags": {
    "public": 200,
    "on-sale": 45,
    "internal": 15    // 👈 HIDDEN in frontend using transformItems
  },
  "is_available": {
    "true": 180,
    "false": 20
  },
  "primary_sales_channel_name": {
    "Default Sales Channel": 180,
    "Internal Operations": 20  // 👈 Can filter this out
  }
}
```

**What this means:**

- 150 results in "Electronics" category
- 200 results have "public" tag
- 180 results are available
- If you filter by "Electronics", counts update to reflect filtered results

### Filtering at Query Time

When frontend sends:

```javascript
filters = 'primary_sales_channel_name = "Default Sales Channel"';
```

Meilisearch:

1. Applies the filter BEFORE counting facets
2. Only counts facets that match the filter
3. Returns only products matching the filter
4. Categories/tags shown are ONLY from public products

**Result:** Internal products never appear in results OR facets

---

## Summary: What Should Be Indexed

### For Your Use Case

**Index:**

- ✅ ALL products (both public and internal)
- ✅ Category hierarchy information
- ✅ Sales channel information
- ✅ Availability, pricing, tags

**Filter at Query Time:**

- ✅ Storefront: Filter by `primary_sales_channel_name = "Default Sales Channel"`
- ✅ Admin: Show all products, allow filtering by any attribute
- ✅ Tags: Use `transformItems` to hide internal/verbrauchsstoffe tags

**Why This Works:**

1. Single source of truth (one index with all data)
2. Flexible filtering per use case
3. Better admin experience (can search all products)
4. Efficient (Meilisearch handles filtering very fast)

---

## Next Steps

1. **Verify current indexing** - Check if sales channel filter is actually working
2. **Decide on approach** - Confirm user wants Option A (index everything)
3. **Update code** - Based on chosen approach
4. **Test** - Verify filtering works correctly
5. **Monitor** - Index size and query performance
