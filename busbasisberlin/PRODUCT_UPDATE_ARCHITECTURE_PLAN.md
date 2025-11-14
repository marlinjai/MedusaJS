# Product Update Architecture Plan

## Based on Medusa v2 Documentation Analysis

### Fields that can be updated directly in `updateProductsWorkflow`:

1. **Simple Product Fields** (direct update):

   - `title`, `subtitle`, `handle`, `description`
   - `status`, `discountable`
   - `type_id`, `collection_id`, `shipping_profile_id`
   - `images` (as array of `{url: string}`)

2. **Relations that can be updated in workflow** (but with specific format):
   - `tags`: Array of `{id: string}` objects (NOT `tag_ids: string[]`)
   - `categories`: Array of `{id: string}` objects (NOT `category_ids: string[]`)
   - `options`: Array of option objects
   - `variants`: Array of variant objects

### Fields that require SEPARATE workflows/API calls:

1. **Sales Channels**:

   - Use `linkProductsToSalesChannelWorkflow`
   - Must be called separately for each sales channel
   - Input: `{id: sales_channel_id, add: [product_id], remove: [product_id]}`

2. **Categories** (if using batch operations):
   - Use `batchLinkProductsToCategoryWorkflow`
   - Input: `{id: category_id, add: [product_id], remove: [product_id]}`
   - **BUT**: Categories can also be updated directly in `updateProductsWorkflow` as `categories: [{id: string}]`

### Current Issues:

1. **Tags Format**: We're using `tag_ids: string[]` but workflow expects `tags: [{id: string}]`
2. **Categories Format**: We're using `category_ids: string[]` but workflow expects `categories: [{id: string}]`
3. **Sales Channels**: We're trying to update them in the workflow, but they need separate workflow calls
4. **Error "Cannot read properties of undefined (reading 'strategy')"**: This happens when the workflow tries to populate relations with incorrect data structure

### Recommended Implementation Strategy:

#### Option 1: Use updateProductsWorkflow with correct format (RECOMMENDED)

```typescript
// For fields that can be updated in workflow:
const updateData = {
	id: productId,
	title,
	subtitle,
	handle,
	description,
	status,
	discountable,
	type_id,
	collection_id,
	shipping_profile_id,
	images: images.map(img => ({ url: img.url })),
	tags: tagIds.map(id => ({ id })), // Convert tag_ids to tags format
	categories: categoryIds.map(id => ({ id })), // Convert category_ids to categories format
	options: options.map(opt => ({
		title: opt.title,
		values: opt.values,
	})),
	variants: variants.map(v => ({
		id: v.id,
		title: v.title,
		// ... other variant fields
	})),
};

await updateProductsWorkflow(req.scope).run({
	input: {
		products: [updateData],
	},
});

// Then handle sales channels separately:
for (const channelId of sales_channel_ids) {
	await linkProductsToSalesChannelWorkflow(req.scope).run({
		input: {
			id: channelId,
			add: [productId],
		},
	});
}
```

#### Option 2: Use productModuleService directly for simple updates

```typescript
// For simple field updates only (title, status, etc.)
await productModuleService.updateProducts(productId, {
	title,
	status,
	// ... other simple fields
});

// Then handle relations separately:
// - Tags: productModuleService.updateProducts(id, {tag_ids: [...]})
// - Categories: batchLinkProductsToCategoryWorkflow
// - Sales Channels: linkProductsToSalesChannelWorkflow
```

### Decision Matrix:

| Field                                       | Update Method                      | Format                                |
| ------------------------------------------- | ---------------------------------- | ------------------------------------- |
| title, subtitle, handle, description        | updateProductsWorkflow             | Direct value                          |
| status, discountable                        | updateProductsWorkflow             | Direct value                          |
| type_id, collection_id, shipping_profile_id | updateProductsWorkflow             | Direct value                          |
| images                                      | updateProductsWorkflow             | `[{url: string}]`                     |
| tags                                        | updateProductsWorkflow             | `[{id: string}]` (NOT `tag_ids`)      |
| categories                                  | updateProductsWorkflow             | `[{id: string}]` (NOT `category_ids`) |
| sales_channels                              | linkProductsToSalesChannelWorkflow | Separate workflow call                |
| options                                     | updateProductsWorkflow             | Array of option objects               |
| variants                                    | updateProductsWorkflow             | Array of variant objects              |

### Implementation Steps:

1. **Fix the update route** to use correct format:

   - Convert `tag_ids` → `tags: [{id}]`
   - Convert `category_ids` → `categories: [{id}]`
   - Keep sales channels as separate workflow calls

2. **Simplify the logic**:

   - Remove the "simple update" vs "complex update" distinction
   - Always use `updateProductsWorkflow` for product fields
   - Handle sales channels separately after workflow

3. **Fix the error**:
   - The "strategy" error is likely caused by incorrect relation format
   - Ensure all relation arrays use `{id: string}` format, not `string[]`

### Questions to Resolve:

1. Should we always use the workflow, or use direct service calls for simple updates?

   - **Recommendation**: Use workflow for consistency and proper event handling

2. How to handle partial updates (only some fields)?

   - **Answer**: Only include fields that are `!== undefined` in the update data

3. Should we fetch current relations before updating to preserve existing ones?
   - **Answer**: For categories and tags, the workflow replaces all, so we need to merge with existing
