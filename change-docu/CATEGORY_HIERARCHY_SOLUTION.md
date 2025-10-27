# Category Hierarchy Solution for Meilisearch

## The Problem

Based on web search best practices and code analysis:

1. **Medusa supports up to 4 category levels** (seen in import script: Level 1-4)
2. **Current code only fetches 2 levels** (`categories.parent_category.name`)
3. **For proper Meilisearch filtering**, we need the FULL hierarchy path like "Electronics > Computers > Laptops > Gaming Laptops"

## Current Implementation

### Categories Index (`sync-categories.ts`)

- ✅ Has `mpath` field which stores materialized path (e.g., "1.5.12.45")
- ✅ Has `hierarchy_path` but only 2 levels: `Parent > Child`
- ❌ Not usable for products because it's a separate index

### Products Index (`sync-products.ts`)

- ❌ Only fetching `categories.parent_category.name` (2 levels max)
- ❌ Building `category_paths` from limited hierarchy
- ❌ Cannot handle 4-level hierarchies

## Web Search Best Practices

According to Meilisearch best practices:

1. ✅ Store full category path as string: `"Electronics > Computers > Laptops"`
2. ✅ Add to `filterableAttributes`
3. ✅ Implement faceted search using facets parameter
4. ✅ Full path enables filtering at any level of hierarchy

## The Solution

### Option A: Use mpath to Build Full Paths (Recommended)

Medusa's `mpath` field contains the full materialized path. We can:

1. Fetch `mpath` in category workflow
2. Query the category index to resolve mpath to human-readable paths
3. Store full paths in products

**Pros**: Uses existing Medusa data structure, supports unlimited depth

**Cons**: Requires additional query/processing

### Option B: Recursively Fetch Category Chain (Simpler)

Fetch category chains recursively:

1. Get product categories
2. For each category, fetch parent
3. Fetch parent's parent
4. Continue until no parent
5. Build full path by concatenating

**Pros**: Simple to implement

**Cons**: Multiple queries, less efficient

### Option C: Store Ancestor Category IDs on Product (Most Efficient)

Instead of paths, store:

- Direct category IDs
- Parent category IDs
- All ancestor category IDs

**Pros**: Fast filtering, no string manipulation

**Cons**: Loses human-readable paths for facets

## Recommended Approach

### Hybrid: Store Both IDs and Paths

```javascript
{
  // Category IDs for efficient filtering
  category_ids: ['cat-123'],           // Direct categories
  category_ancestor_ids: ['cat-456', 'cat-789'], // All ancestors

  // Full paths for facet display
  category_paths: [
    'Electronics > Computers > Laptops'  // Human-readable full path
  ],

  // Also keep current fields for compatibility
  category_names: ['Laptops'],
  category_handles: ['laptops'],
}
```

### Implementation Steps

1. **Update `sync-products.ts`** to fetch category chain:

   ```javascript
   fields: [
   	'categories.id',
   	'categories.name',
   	'categories.handle',
   	'categories.parent_category.id', // Current: 2 levels
   	'categories.parent_category.name',
   	'categories.parent_category.parent_category.id', // Add: 3 levels
   	'categories.parent_category.parent_category.name',
   	'categories.parent_category.parent_category.parent_category.id', // Add: 4 levels
   	'categories.parent_category.parent_category.parent_category.name',
   ];
   ```

2. **Update extraction** to build full paths:

   ```javascript
   const buildCategoryPath = category => {
   	const path = [];
   	let current = category;

   	// Traverse up to root
   	while (current) {
   		path.unshift(current.name);
   		current = current.parent_category;
   	}

   	return path.join(' > ');
   };
   ```

3. **Store all ancestors**:

   ```javascript
   const categoryIds = [];
   const ancestorIds = [];

   if (category.parent_category) {
   	ancestorIds.push(category.parent_category.id);
   	// Recursively collect all ancestors
   }
   ```

## Better Solution: Use mpath

Since categories already have `mpath` in their index, we can:

1. Fetch categories with mpath
2. Store mpath on products
3. Use mpath for filtering (by querying category index when needed)

Or better yet, just fetch mpath from categories when indexing products:

```javascript
'categories.mpath',  // Materialized path like "1.5.12"
```

Then build human-readable paths when needed for facets.

## Recommended Fix

**Simplest and best solution:**

1. Add `mpath` to product fields fetch
2. Build full hierarchy paths using mpath traversal
3. Store both the mpath ID sequence and human-readable paths

This gives us:

- Efficient filtering (by mpath)
- Human-readable facets (by paths)
- Unlimited hierarchy depth support

---

## Code Changes Needed

### Update `sync-products.ts`:

```javascript
fields: [
	// ... existing fields ...
	'categories.mpath', // Add this
];
```

### Update `sync-products.ts` step extraction:

```javascript
// Instead of:
if (category.parent_category?.name) {
	categoryPaths.push(`${category.parent_category.name} > ${category.name}`);
}

// Do:
if (category.mpath) {
	// mpath is like "1.5.12" - each number is a category ID
	// We need to resolve these IDs to names
	const pathParts = category.mpath.split('.').filter(Boolean);
	// Query category index to get names for each ID
	// Build full path: "Level1 > Level2 > Level3 > Level4"
}
```

**OR** simpler approach - fetch enough parent levels:

```javascript
'categories.parent_category.parent_category.name',
'categories.parent_category.parent_category.parent_category.name',
```

This fetches 4 levels (enough for typical use).
