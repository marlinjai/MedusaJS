# Meilisearch Integration Fixes

## Date: October 15, 2025

## Issues Fixed

### 1. Missing `collection_title` in Filterable Attributes

**Problem:** The facets API endpoint was requesting `collection_title` as a facet, but it wasn't configured as a filterable attribute in the Meilisearch index.

**Error:**

```
Invalid facet distribution: Attribute `collection_title` is not filterable
```

**Solution:**

- Added `collection_title` to the filterable attributes list in `configureProductIndex()`
- Added `collection_title` to the faceting sort configuration

**Files Modified:**

- `busbasisberlin/src/modules/meilisearch/service.ts`

### 2. Category Index Not Being Created

**Problem:** The category index wasn't being created automatically, causing it to not appear in Meilisearch.

**Solution:**

- Enhanced `ensureIndexConfiguration()` to check if an index exists before configuration
- If the index doesn't exist, it now creates it with the correct primary key (`id`)
- Added logging to track index creation

**Files Modified:**

- `busbasisberlin/src/modules/meilisearch/service.ts`

### 3. Missing Index Visibility in Admin UI

**Problem:** No way to see which indexes exist in Meilisearch or verify that the category index was created.

**Solution:**

- Created new API endpoint `/admin/meilisearch/indexes` to list all indexes
- Added `listIndexes()` and `getIndexStats()` methods to MeilisearchModuleService
- Updated admin UI to display all available indexes with metadata
- Shows index name, primary key, creation date, and last update date

**Files Created:**

- `busbasisberlin/src/api/admin/meilisearch/indexes/route.ts`

**Files Modified:**

- `busbasisberlin/src/modules/meilisearch/service.ts` (added methods)
- `busbasisberlin/src/admin/routes/settings/meilisearch/page.tsx` (added UI section)

## Key Changes to Service

### Enhanced Index Configuration

```typescript
async ensureIndexConfiguration(type: MeilisearchIndexType = 'product') {
  const indexName = await this.getIndexName(type);

  // Ensure index exists
  try {
    await this.client.getIndex(indexName);
    console.log(`✅ Index "${indexName}" already exists`);
  } catch (error) {
    console.log(`📝 Creating index "${indexName}"...`);
    await this.client.createIndex(indexName, { primaryKey: 'id' });
    console.log(`✅ Index "${indexName}" created successfully`);
  }

  // Configure settings
  // ...
}
```

### New Methods

- `listIndexes()`: Returns all indexes with basic metadata
- `getIndexStats(type)`: Returns detailed stats for a specific index

## Admin UI Improvements

### New Sections

1. **Available Indexes** - Shows all configured Meilisearch indexes
2. **Index Statistics** - Display product count, categories, available products
3. **Category Distribution** - Top 10 categories with product counts
4. **Popular Tags** - Top 15 tags with product counts

## Testing

### How to Verify the Fixes

1. **Start the Medusa server**

   ```bash
   cd busbasisberlin
   npm run dev
   ```

2. **Navigate to Meilisearch settings**

   - Go to: `http://localhost:9000/app/settings/meilisearch`

3. **Click "Sync Data to Meilisearch"**

   - This will create both `products` and `categories` indexes
   - Wait for the sync to complete (check terminal logs)

4. **Verify indexes are created**

   - The "Available Indexes" section should show both indexes
   - Should see creation and update timestamps

5. **Check facets are working**

   - The "Index Statistics" section should load without errors
   - Should display product count, category count, and available products
   - Category distribution and tags should be populated

6. **Verify in Meilisearch directly**
   ```bash
   curl http://localhost:7700/indexes
   ```
   Should return both `products` and `categories` indexes

## Configuration Details

### Product Index Filterable Attributes

- `category_names`
- `category_handles`
- `category_paths`
- `category_ids`
- `is_available`
- `status`
- `min_price`
- `max_price`
- `price_range`
- `currencies`
- `tags`
- `collection_id`
- `collection_handle`
- **`collection_title`** (newly added)
- `variant_count`

### Category Index Filterable Attributes

- `parent_category_id`
- `is_active`
- `is_internal`
- `rank`
- `created_at`
- `updated_at`

## Event-Driven Sync (NEW)

Added comprehensive event handlers to keep Meilisearch synchronized in real-time:

### New Event Subscribers

1. **variant-sync.ts** - Syncs products when variants change

   - Events: `product_variant.created/updated/deleted`
   - Updates: pricing, SKUs, variant count, availability

2. **inventory-sync.ts** - Syncs products when inventory changes

   - Events: `inventory_level.created/updated/deleted`
   - Updates: availability status, total inventory

3. **category-sync.ts** - Syncs categories and affected products

   - Events: `product_category.created/updated/deleted`
   - Updates: category names, paths, hierarchy

4. **collection-sync.ts** - Syncs products when collections change
   - Events: `product_collection.created/updated/deleted`
   - Updates: collection title, ID, handle

### Why This Matters

Previously, Meilisearch would only sync when:

- Manually triggered via admin UI
- Products directly created/updated

Now, Meilisearch automatically syncs when:

- ✅ Variant prices change
- ✅ Inventory quantities change
- ✅ Categories are renamed or restructured
- ✅ Collections are updated
- ✅ Products become available/unavailable
- ✅ Any related data changes

This ensures **search results are always up-to-date** without manual intervention.

See [MEILISEARCH_EVENT_HANDLERS.md](./MEILISEARCH_EVENT_HANDLERS.md) for detailed documentation.

## Notes

- Both indexes are now automatically created during the sync process
- The configuration includes proper wait times to allow Meilisearch to process settings
- All facet requests now use only configured filterable attributes
- Admin UI provides real-time visibility into index status and statistics
- Event-driven sync ensures data is always current without manual re-indexing
