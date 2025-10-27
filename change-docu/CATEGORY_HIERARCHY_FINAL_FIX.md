# Category Hierarchy - Final Working Solution

## Problem

Category paths were showing incomplete hierarchies like:

- `"Karosserie / Aufbau > Reparaturbleche"` (missing "Zubehör" root level)

Expected full hierarchy:

- `"Zubehör > Karosserie / Aufbau > Reparaturbleche"`

## Root Cause

1. **Fetch limitations**: Medusa's `useQueryGraphStep` doesn't auto-populate deeply nested `parent_category.parent_category` objects
2. **Missing data**: We were only fetching `parent_category.name` but not the nested parents
3. **Loop traversal**: The `while` loop couldn't traverse beyond 2 levels because parent objects didn't exist

## Solution Found in `backup-main-sat` Branch

The working version uses **recursive async queries** to fetch the complete category hierarchy:

```typescript
const fetchCompleteHierarchy = async (
	categoryId: string,
	currentPath: string[] = [],
): Promise<string[]> => {
	const { data: categoryQuery } = await query.graph({
		entity: 'product_category',
		filters: { id: categoryId },
		fields: [
			'id',
			'name',
			'handle',
			'parent_category.id',
			'parent_category.name',
			'parent_category.handle',
		],
		pagination: { take: 1 },
	});

	const categoryData = categoryQuery[0];
	const newPath = [categoryData.name, ...currentPath];

	// If this category has a parent, recursively fetch it
	if (categoryData.parent_category?.id) {
		return await fetchCompleteHierarchy(
			categoryData.parent_category.id,
			newPath,
		);
	}

	return newPath;
};
```

## Changes Applied

### 1. Changed to Async Product Transformation

**Before**:

```typescript
const transformedProducts = products.map(product => { ... });
```

**After**:

```typescript
const transformedProducts = await Promise.all(
  products.map(async product => { ... })
);
```

### 2. Implemented Recursive Hierarchy Fetching

- Uses `query.graph()` to fetch categories individually
- Recursively traverses up to root
- No depth limitations (previously limited to 2-3 levels)
- Handles any hierarchy depth automatically

### 3. Added All Category Names to Search

The working version adds ALL category names in the path to `category_names`:

```typescript
completePath.forEach(categoryNameInPath => {
	allCategoryNamesInPath.add(categoryNameInPath);
});
```

This enables hierarchical filtering: selecting "Zubehör" will match products in "Zubehör > Karosserie / Aufbau > Reparaturbleche".

## How It Works

1. For each product category:

   - Fetch the category with `parent_category.id` via `query.graph()`
   - If parent exists, recursively fetch it
   - Continue until reaching root (no parent)
   - Build complete path array: `["Zubehör", "Karosserie / Aufbau", "Reparaturbleche"]`

2. Join with separator:

   - `"Zubehör > Karosserie / Aufbau > Reparaturbleche"`

3. Add to both `category_paths` and `category_names`:
   - `category_paths`: `["Zubehör > Karosserie / Aufbau > Reparaturbleche"]`
   - `category_names`: `["Zubehör", "Karosserie / Aufbau", "Reparaturbleche"]`

## Next Steps

Re-index products:

1. Go to **Admin → Settings → Meilisearch**
2. Click **"Sync Products"**
3. Check logs for: `🔍 Category hierarchy depth:` showing full paths

Expected result: Category paths will show complete hierarchies from root to leaf level.

## Files Changed

- `busbasisberlin/src/workflows/steps/sync-products.ts` - Applied working recursive hierarchy fetching from `backup-main-sat` branch
