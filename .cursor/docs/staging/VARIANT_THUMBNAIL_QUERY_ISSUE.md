# Variant Thumbnail Not Returned in Query - Medusa v2

## Problem Statement

When querying products with variants, the `thumbnail` field on `product_variant` is **not being returned** in the API response, even though:

1. The field exists in the database
2. We explicitly request it in the `fields` parameter
3. Other variant fields are returned correctly

## Database Verification

**Table**: `product_variant`
**Column**: `thumbnail` (type: text/varchar)
**Value**: Successfully stored in database

```sql
SELECT id, sku, thumbnail FROM product_variant WHERE sku = 'MM-05-001';

Result:
{
  "id": "variant_01K5CAVYQ26VCDHTDVJP6VPNMC",
  "sku": "MM-05-001",
  "thumbnail": "https://.../MM-05-001-2.jpg"  ✅ EXISTS
}
```

## API Request

**Endpoint**: `GET /admin/products/:id`

**Fields Parameter**:

```typescript
const fields = [
	'id',
	'title',
	// ... other product fields ...
	'variants.*', // Should include ALL variant fields
	'variants.thumbnail', // Explicitly requested
	'variants.prices.*',
	'variants.images.id',
	'variants.images.url',
	// ... other fields ...
].join(',');
```

**Full Request**:

```
GET /admin/products/prod_01K5CAVYPM5G2P144HQT4EGBVA?fields=id,title,...,variants.*,variants.thumbnail,variants.prices.*,...
```

## API Response

**Actual Response** (variant object):

```json
{
    "id": "variant_01K5CAVYQ26VCDHTDVJP6VPNMC",
    "title": "Kupplungsnehmerzylinder Mercedes Benz 406 407 408 409 (ATE)",
    "sku": "MM-05-001",
    "manage_inventory": true,
    "allow_backorder": false,
    "images": [...],
    "options": [...],
    "prices": [...],
    "price_eur": 99
}
```

**Missing Field**: `thumbnail` ❌

**Expected Response**:

```json
{
    "id": "variant_01K5CAVYQ26VCDHTDVJP6VPNMC",
    // ... other fields ...
    "thumbnail": "https://.../MM-05-001-2.jpg"  ← MISSING
}
```

## What Works

✅ Database has the `thumbnail` value
✅ Other variant fields are returned (`sku`, `title`, `manage_inventory`, etc.)
✅ Nested relations work (`images`, `prices`, `options`)
✅ Custom computed fields work (`price_eur` added by our handler)

## What Doesn't Work

❌ `thumbnail` field is not in the response
❌ Even with `'variants.*'` (should return all fields)
❌ Even with explicit `'variants.thumbnail'`

## Our Custom GET Handler

We have a custom GET handler that post-processes the response:

**File**: `busbasisberlin/src/api/admin/products/[id]/route.ts`

```typescript
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
	const query = req.scope.resolve('query');

	// Query product using query.graph
	const { data } = await query.graph({
		entity: 'product',
		fields: req.query.fields.split(','), // Uses fields from request
		filters: { id },
	});

	const product = data[0];

	// Post-process: Add variant_thumbnail from thumbnail field
	if (product.variants) {
		for (const variant of product.variants) {
			if ((variant as any).thumbnail) {
				(variant as any).variant_thumbnail = (variant as any).thumbnail;
			}
		}
	}

	res.json({ product });
};
```

**Problem**: The `thumbnail` field never makes it into the `variant` object from `query.graph`, so our mapping code never runs.

## Questions for Medusa Docs AI

### 1. Is `thumbnail` a Standard Field on ProductVariant?

**Question**: Does Medusa v2's `product_variant` table include a `thumbnail` field by default?

**Our observation**:

- Our database HAS a `thumbnail` column on `product_variant`
- We can SET it via `updateProductsWorkflow`
- But we CANNOT retrieve it via `query.graph`

**Is this**:

- A) A standard Medusa field that should be queryable?
- B) A custom field we added that needs special handling?
- C) An internal field that's not exposed via query.graph?

### 2. How to Request Variant Thumbnail via query.graph?

**Question**: What is the correct syntax to retrieve the `thumbnail` field for variants?

**What we tried**:

- `'variants.*'` - Returns other fields but NOT thumbnail
- `'variants.thumbnail'` - Explicitly requested, still not returned
- `'variants.thumbnail.*'` - Treating it as a relation (didn't work)

**What should we use**:

- Different field name?
- Special prefix or suffix?
- Query parameter instead of fields?

### 3. Alternative: How to Get Variant Thumbnails?

**Question**: If `thumbnail` can't be queried via fields parameter, how should we retrieve it?

**Options**:

- A) Use a separate query for variant details?
- B) Use `productModuleService` instead of `query.graph`?
- C) Access via a different relation or nested field?
- D) It's not meant to be queryable - use a different approach?

### 4. Computed Fields vs Database Fields

**Question**: We successfully add custom computed fields like `price_eur` in our GET handler. Why does `thumbnail` (a real database column) not appear, while computed fields work?

**Our code**:

```typescript
// This WORKS - computed field
(variant as any).price_eur = calculatePrice(variant.prices);

// This DOESN'T WORK - database field not in response
(variant as any).variant_thumbnail = (variant as any).thumbnail;
// ↑ thumbnail is undefined because it wasn't returned by query.graph
```

### 5. Product Variant Data Model

**Question**: What fields are available on the ProductVariant entity in Medusa v2 and how do we query them?

**Specifically**:

- Is there documentation for all queryable ProductVariant fields?
- Are there fields that exist in the database but aren't exposed via query API?
- How do we discover which fields are available?

## Context

**Medusa Version**: v2 (latest)
**Query Method**: `query.graph()` from Query module
**Use Case**: Custom admin route for product management
**Goal**: Display variant thumbnails in custom UI that sync with core Medusa product page

## Expected Behavior

When we query:

```typescript
await query.graph({
	entity: 'product',
	fields: ['variants.*', 'variants.thumbnail'],
	filters: { id: productId },
});
```

We expect variants to include:

```json
{
    "thumbnail": "https://..."  ← Should be included
}
```

## Actual Behavior

The `thumbnail` field is **silently omitted** from the response with no error or warning.

## Request for Medusa AI

Please help us understand:

1. ✅ Is `thumbnail` a standard ProductVariant field in Medusa v2?
2. ✅ How to correctly query the `thumbnail` field via `query.graph`?
3. ✅ Why `variants.*` doesn't include `thumbnail`?
4. ✅ Alternative approaches if `thumbnail` isn't meant to be queried this way?
5. ✅ Documentation reference for ProductVariant queryable fields?

Thank you!
