# Category Hierarchy Fix - Resolves Missing Top-Level Categories

## Problem

Category paths were only showing 2 levels like `"Parent > Child"` instead of the full hierarchy `"Root > Parent > Child"`.

## Root Cause

The code was fetching parent_category IDs and names, but wasn't traversing deep enough into the hierarchy. The extraction loop in `sync-products.ts` step (lines 111-117) was only collecting 1-2 levels.

## Changes Made

### 1. Updated `sync-products.ts` (lines 32-37)

Added parent_category IDs at each level to ensure the full object chain is fetched:

```javascript
'categories.parent_category.id',
'categories.parent_category.name',
'categories.parent_category.parent_category.id',
'categories.parent_category.parent_category.name',
'categories.parent_category.parent_category.parent_category.id',
'categories.parent_category.parent_category.parent_category.name',
```

### 2. Updated `sync-products.ts` step (lines 106-132)

Changed the extraction to traverse the entire parent chain up to the root:

```javascript
// Build hierarchical path by traversing parent chain
const pathSegments: string[] = [];
let current: any = category;
let depth = 0;

// Traverse up to root, collecting all parent names
// Maximum depth to prevent infinite loops
while (current && depth < 10) {
  pathSegments.unshift(current.name);
  current = current.parent_category;
  depth++;
}

// Join with " > " separator
const fullPath = pathSegments.join(' > ');
categoryPaths.push(fullPath);
```

### 3. Added Debug Logging

Added logging to verify the hierarchy depth is being fetched correctly (lines 124-132):

```javascript
const productIndex = products.indexOf(product);
if (catIndex === 0 && productIndex === 0) {
	console.log('🔍 Category hierarchy depth:', {
		path: fullPath,
		segments: pathSegments.length,
		depth,
		hasParent: !!category.parent_category,
		parentName: category.parent_category?.name,
	});
}
```

## How It Works Now

1. **Fetches full parent chain**: Gets IDs and names at 3 levels (enough for 4-level hierarchies)
2. **Traverses up to root**: While loop collects all parents until `parent_category` is null
3. **Builds full path**: Creates paths like "Level1 > Level2 > Level3 > Level4"

## Next Steps

### Re-index Your Products

1. Go to Admin → Settings → Meilisearch
2. Click "Sync Products"
3. Watch the logs for the debug output showing hierarchy depth

You should see logs like:

```
🔍 Category hierarchy depth: {
  path: 'Wartung > Wartungspakete',
  segments: 2,
  depth: 2,
  hasParent: true,
  parentName: 'Wartung'
}
```

## Expected Results After Re-indexing

### Before

- Category paths: `"Wartung > Wartungspakete"` (2 levels)

### After

- Category paths will show the complete hierarchy from root
- For example: `"Vehicle Parts > Mercedes > Motor > Timing Chain"` (4 levels if present in your data)

## Testing

After re-indexing, check a product in Meilisearch admin and verify:

1. `category_paths` contains the full hierarchy
2. Path shows the complete chain from root to leaf
3. No missing parent levels

## Files Changed

- `busbasisberlin/src/workflows/sync-products.ts` - Added parent_category IDs
- `busbasisberlin/src/workflows/steps/sync-products.ts` - Improved path traversal logic with debug logging
