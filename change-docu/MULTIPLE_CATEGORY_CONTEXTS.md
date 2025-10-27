# Multiple Category Contexts - Faceting Analysis

## The Problem

If "Zubehör" appears in multiple hierarchies with different parents:

```
Hierarchy 1: "Mercedes Benz Baumuster 309... > Zubehör > Motor"
Hierarchy 2: "BusBasis Camping... > Zubehör > Fenster"
Hierarchy 3: "Service... > Zubehör > Werkzeug"
```

When user clicks "Zubehör" facet, what happens?

## Current Data Structure

```javascript
{
  category_names: [
    "Mercedes Benz...",  // ← Unique identifiers
    "Zubehör",            // ← Repeated across hierarchies
    "Motor"
  ],
  category_paths: [
    "Mercedes Benz... > Zubehör > Motor"  // ← Full unique context
  ]
}
```

## Faceting Behavior

### Option A: Using `category_names` (Current)

**Facet display:**

```
Zubehör (150 products)  ← Clicked
Motor (87)
Karosserie (120)
```

**When clicked:**

- Filter: `category_names = "Zubehör"`
- Returns: ALL 150 products from ALL hierarchies containing "Zubehör"
- **Problem**: Mixed contexts!

**Result**: All "Zubehör" products regardless of parent context.

### Option B: Using `category_paths` (Better)

**Facet display:**

```
Zubehör (150)
  ├─ Motor (87)
  ├─ Karosserie (120)
  └─ Fenster (45)
```

**When clicked:**

- Filter: `category_paths = "Mercedes... > Zubehör > Motor"`
- Returns: Only products in that SPECIFIC path
- **Benefit**: Clear context!

**Result**: Only products in the specific hierarchical path.

## The Real Question

**Do you actually have this problem?**

Looking at your data from the image:

- One top-level parent: `"Mercedes Benz Baumuster 309, 310, 313; "DüDos""`
- Most products likely under this one hierarchy

**To verify**, check your categories:

- Are there multiple top-level parents?
- Or just one hierarchy starting with "Mercedes Benz..."?

## Recommendation

### If you have ONLY ONE top-level hierarchy:

**Keep using `category_names`** ✅

**Why**: No context mixing possible since all "Zubehör" are under the same parent.

**How it works**:

```
All paths start with: "Mercedes Benz... > ..."
        ↓
All "Zubehör" share same parent context
        ↓
Clicking "Zubehör" is unambiguous
```

### If you have MULTIPLE top-level hierarchies:

**Use `category_paths` with hierarchical UI** ✅

**Why**: Need to show parent context to disambiguate.

**How**:

1. Use `RefinementList attribute="category_paths"`
2. Add `transformItems` to show as hierarchy:
   ```tsx
   transformItems={items => {
     // Build tree from paths
     const tree = buildCategoryTreeFromFacets({}, items);
     return tree; // Recursive category tree
   }}
   ```

## Check Your Data

Run this in Meilisearch to see if you have multiple top-level parents:

```sql
-- Check top-level category distribution
SELECT DISTINCT
  split_part(category_paths[0], ' > ', 1) as root_category,
  COUNT(*)
FROM products
GROUP BY root_category
ORDER BY COUNT(*) DESC;
```

This will show if "Zubehör" appears under multiple different root categories.

## Current Implementation Status

Using `category_names` is **correct** IF:

- All categories are under one top-level hierarchy
- OR you don't mind mixing contexts

Using `category_paths` is **needed** IF:

- You have multiple unrelated hierarchies
- You need to show parent context to users
- You want drill-down navigation

## Conclusion

Based on your data showing:

```
"Mercedes Benz Baumuster... > Zubehör > Anhängerkupplung"
```

It looks like you have ONE main hierarchy. If that's true:

**Current approach is fine** ✅

- `category_names` for faceting
- `category_paths` for breadcrumbs

If you later add multiple hierarchies (e.g., add "Service Parts" as a sibling to "Mercedes..."), then we'll need to enhance the UI to show parent context.
