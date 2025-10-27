# Hierarchical Category Filtering - Implementation

## Problem

User wants:

- Click "Zubehör" → Show all products in "Zubehör" + all children recursively
- System needs awareness of tree structure

## Solution

### Backend: Store All Category IDs in Hierarchy

**Modified**: `busbasisberlin/src/workflows/steps/sync-products.ts`

**Before**: Only stored leaf category IDs

```typescript
category_ids: product.categories?.map(c => c.id) || [];
```

**After**: Store ALL category IDs in the complete hierarchy path

```typescript
const allCategoryIdsInPath = new Set<string>();

// During hierarchy building, collect all IDs
completeIds.forEach(categoryIdInPath => {
	allCategoryIdsInPath.add(categoryIdInPath);
});

// Set in product
category_ids: categoryIds; // Array of ALL category IDs (root → leaf)
```

**Example**:

```
Product in "Mercedes Benz... > Zubehör > Motor > Dichtungen"

category_ids: [
    "cat_mercedes",    // Top-level
    "cat_zubehoer",    // Parent
    "cat_motor",       // Grandparent
    "cat_dichtungen"    // Leaf (direct)
]
```

### How Filtering Works

When user clicks "Zubehör" (ID: `cat_zubehoer`):

1. **Meilisearch filter**: `category_ids = "cat_zubehoer"`
2. **Matches**: Any product with `cat_zubehoer` in their `category_ids` array
3. **Result**: Shows products in "Zubehör" + ALL descendants

**Why this works**:

- If product is in "Zubehör > Motor", it has `cat_zubehoer` in its IDs ✅
- If product is in "Zubehör > Motor > Dichtungen", it has `cat_zubehoer` in its IDs ✅
- Only products with that category ID (regardless of depth) match ✅

### Frontend: Simple RefinementList

```tsx
<RefinementList
	attribute="category_ids" // Now filters by IDs, not names
/>
```

However, **IDs are not user-friendly**. We need to display names.

### The Issue: Display Category Names, Filter by IDs

Meilisearch doesn't directly support "display names but filter by IDs".

**Options**:

1. **Use `category_names`** (current) - Simple, but may mix contexts
2. **Custom hierarchical UI** - Display tree with proper parent context
3. **Hybrid**: Use names for display, IDs for filtering with custom logic

### Recommended: Keep `category_names` (Current Approach)

**Why it works for your case**:

- If you have distinct category trees (like "Mercedes Benz..." as top-level)
- Each category name appears in ONE hierarchy context
- Clicking "Zubehör" shows all products in that branch
- Simple, fast, no custom UI needed

**When it doesn't work**:

- If you have duplicate names at different levels
- Example: "Mercedes > Zubehör" AND "Service > Zubehör" as separate top-levels
- Clicking "Zubehör" would mix both contexts

## Implementation Status

✅ **Backend**: Now stores all category IDs in hierarchy
✅ **Index**: `category_ids` is filterable
✅ **Frontend**: Currently using `category_names`
⏳ **Next**: Verify if duplicate category names exist at different levels

## Testing

To check if you have duplicate category names:

```sql
-- Check for duplicate category names across different hierarchies
SELECT name, COUNT(DISTINCT parent_category_id) as hierarchy_count
FROM categories
GROUP BY name
HAVING COUNT(DISTINCT parent_category_id) > 1;
```

If `hierarchy_count > 1` for any name, you have the multiple contexts issue.

## Current Behavior

**With single hierarchy tree**:
✅ Clicking "Zubehör" → Shows all products in that hierarchy branch
✅ Counts are accurate
✅ No context mixing

**If you have multiple hierarchies** (e.g., multiple top-level parents):
❌ Clicking "Zubehör" would show products from ALL contexts
⚠️ Need to enhance UI to show parent context

## Next Steps

1. **Re-index products** to populate `category_ids` with all hierarchy IDs
2. **Test** hierarchical filtering in storefront
3. **Check** for duplicate category names
4. **If duplicates exist**: Implement hierarchical UI using `buildCategoryTreeFromFacets`
