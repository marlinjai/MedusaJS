# Category Tree Filtering - Implementation Guide

## Data Available

### Products (in Meilisearch)

```javascript
{
  category_ids: [
    "pcat_01K5CAV51KV85AR71C6P0PVVQZ",  // Root: Mercedes...
    "pcat_01K5CAV52CCK3G2TECT34BY874",  // Parent: Karosserie
    "pcat_01K5CAV585WCSCT16HFBAMG1YY",  // Child: Türen
    "pcat_01K5CAV5HH72RCXDX2XAR8QKQC"   // Leaf: sonstiges Türzubehör
  ],
  category_names: [...],
  category_paths: ["Mercedes... > Karosserie > Türen > sonstiges Türzubehör"]
}
```

### Categories (in Meilisearch)

```javascript
{
  id: "pcat_01K5CAV52CCK3G2TECT34BY874",
  name: "Karosserie / Aufbau",
  parent_category_id: "pcat_01K5CAV51KV85AR71C6P0PVVQZ",
  category_children: ["child1", "child2"], // Array of child names
  mpath: "...", // Materialized path
}
```

## How Filtering Works

### Simple Filter by Category ID

```javascript
// Meilisearch filter syntax
filters: ['category_ids = "pcat_01K5CAV52CCK3G2TECT34BY874"'];

// What it returns:
// ✅ All products directly in "Karosserie / Aufbau"
// ✅ All products in "Karosserie / Aufbau > Türen"
// ✅ All products in "Karosserie / Aufbau > Fenster"
// ✅ All products in any child category

// Because each product has ALL parent category IDs!
```

### Why This Works

When you filter by `category_ids = "karosserie_id"`:

- Products in "Karosserie" → Include their `karosserie_id` ✅
- Products in "Karosserie > Türen" → Include `karosserie_id` ✅
- Products in "Karosserie > Türen > ..." → Include `karosserie_id` ✅

**Result**: Clicks on parent category return all children!

## Implementation Steps

### 1. Fetch Category Tree Structure

**Option A: Build from Meilisearch categories**

```typescript
// Fetch all categories from Meilisearch
const categories = await meilisearchService.search('', 'category');

// Build tree from parent_category_id relationships
const buildTree = categories => {
	const categoryMap = new Map();
	const rootCategories = [];

	categories.forEach(cat => {
		categoryMap.set(cat.id, {
			...cat,
			children: [],
		});
	});

	categories.forEach(cat => {
		if (cat.parent_category_id) {
			const parent = categoryMap.get(cat.parent_category_id);
			const current = categoryMap.get(cat.id);
			if (parent) parent.children.push(current);
		} else {
			rootCategories.push(categoryMap.get(cat.id));
		}
	});

	return rootCategories;
};
```

**Option B: Use Medusa API** (simpler)

```typescript
import { sdk } from '@lib/config';

const categories = await sdk.store.productCategory.list({
	fields: '*,parent_category,children',
});
```

### 2. Display Tree with Hierarchical UI

```tsx
function CategoryTree({ categories, onSelect }) {
	return (
		<ul>
			{categories.map(category => (
				<li key={category.id}>
					<button onClick={() => onSelect(category.id)}>
						{category.name} ({category.product_count})
					</button>
					{category.children.length > 0 && (
						<CategoryTree categories={category.children} onSelect={onSelect} />
					)}
				</li>
			))}
		</ul>
	);
}
```

### 3. Apply Filter to Meilisearch

```tsx
function StoreSearch() {
	const [selectedCategoryId, setSelectedCategoryId] = useState(null);

	return (
		<InstantSearch searchClient={searchClient} indexName="products">
			{selectedCategoryId && (
				<Configure filters={`category_ids = "${selectedCategoryId}"`} />
			)}
			{/* ... rest of search UI */}
		</InstantSearch>
	);
}
```

## Current Implementation

### Frontend (`store-search/index.tsx`)

**Currently using**: `RefinementList` with `attribute="category_names"`

**Problem**: Shows flat list, no hierarchy, may mix contexts

### Recommended Change

**Option 1: Custom Tree + Filter (Recommended)**

```tsx
// Replace RefinementList with custom component
<CategoryTree
	categories={categoryTree}
	onSelect={categoryId => {
		// Apply filter
		setFilters(`category_ids = "${categoryId}"`);
	}}
/>
```

**Option 2: Use `category_paths` for hierarchical display**

```tsx
<RefinementList
	attribute="category_paths"
	transformItems={items => {
		// Build tree from full paths
		return buildHierarchicalTree(items);
	}}
/>
```

## Benefits of This Approach

✅ **Simple filtering**: Single ID lookup
✅ **Automatic hierarchical**: Parents include all children
✅ **Fast**: Meilisearch array contains check
✅ **Accurate**: No complex tree traversal needed

## Example Query

```javascript
// User clicks "Karosserie / Aufbau"

// Query
{
  q: "",
  filters: ['category_ids = "pcat_01K5CAV52CCK3G2TECT34BY874"']
}

// Returns
[
  { // Direct child
    title: "Reparaturbleche",
    category_ids: ["pcat_karo", "pcat_leaf"]
  },
  { // Nested child
    title: "Türverkleidung",
    category_ids: ["pcat_karo", "pcat_tueren", "pcat_leaf"]
  }
]
```

## Next Steps

1. ✅ `category_ids` are already indexed (done)
2. Build category tree component
3. Apply filter on category selection
4. Display hierarchical tree in UI
