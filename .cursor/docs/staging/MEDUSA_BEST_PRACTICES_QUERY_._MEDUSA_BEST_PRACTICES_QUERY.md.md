# Query for Medusa Docs AI - Best Practices Verification

## Context
We're building a workflow to assign uncategorized products to a default category in Medusa v2. We encountered issues with stale/cached data from the `query.graph` API and silent failures with `updateProductsWorkflow`.

## Our Current Implementation

### Problem We're Solving
- Need to find all products without category assignments
- Assign them to a default "Ohne Kategorie" category
- Keep accurate count even when Medusa's query API returns cached data

### Our Solution (Need Validation)

#### 1. Finding Uncategorized Products
We replaced:
```typescript
// Original approach (returns stale data)
const allProductsResult = await query.graph({
    entity: 'product',
    fields: ['id', 'title', 'categories.id'],
    pagination: { take: 10000, skip: 0 }
});
const uncategorized = allProducts.filter(p => !p.categories || p.categories.length === 0);
```

With:
```typescript
// Our approach (direct SQL)
const knex = container.resolve('db');
const uncategorizedQuery = await knex.raw(`
    SELECT p.id, p.title
    FROM product p
    LEFT JOIN product_category_product pcp ON p.id = pcp.product_id
    WHERE pcp.product_id IS NULL
    LIMIT 10000
`);
const uncategorized = uncategorizedQuery.rows;
```

#### 2. Assigning Products to Category
We replaced:
```typescript
// Original approach (failed silently)
await updateProductsWorkflow(container).run({
    input: {
        selector: { id: productId },
        update: {
            category_ids: [categoryId]
        }
    }
});
```

With:
```typescript
// Our approach (direct SQL INSERT)
const knex = container.resolve('db');
const values = batch.map(pid => `('${pid}', '${categoryId}')`).join(', ');
await knex.raw(`
    INSERT INTO product_category_product (product_id, product_category_id)
    VALUES ${values}
    ON CONFLICT DO NOTHING
`);
```

## Questions for Medusa Docs AI

### 1. Query API Caching
**Q**: Does Medusa's `query.graph` API cache product-category relationships? If so:
- How long is the cache TTL?
- How can we invalidate the cache?
- Is there a way to force a fresh database read?
- What's the recommended approach for getting accurate real-time counts?

### 2. Direct SQL vs Workflows
**Q**: When is it acceptable to use direct SQL (via `knex.raw`) instead of Medusa workflows?
- Does bypassing workflows break any internal consistency guarantees?
- Will direct SQL inserts to `product_category_product` trigger necessary events?
- Are there downsides to not using `updateProductsWorkflow`?
- Will this affect Meilisearch auto-sync or other subscribers?

### 3. Product Category Assignment Best Practice
**Q**: What's the correct way to assign products to categories in Medusa v2?
- Should we use `updateProductsWorkflow`?
- Is there a bulk category assignment API?
- How do we handle the `category_ids` field vs `product_category_product` table?
- What triggers Meilisearch sync after category changes?

### 4. Database Connections in Workflows
**Q**: Is it safe to use `container.resolve('db')` in workflow steps?
- Should we use a different service for database access?
- Are there transaction concerns we should be aware of?
- Is `knex.raw()` the right approach for custom queries?

### 5. Event System
**Q**: When we directly insert into `product_category_product`, do we need to:
- Manually emit `product.updated` events?
- Manually trigger Meilisearch sync?
- Update any cache or invalidate anything?
- Call any post-processing hooks?

### 6. Workflow Compensation
**Q**: Our workflow uses direct SQL. For compensation (rollback), should we:
- Delete from `product_category_product` directly?
- Use workflows for rollback even if we used SQL for forward operation?
- Store original state for proper rollback?

### 7. Alternative Approaches
**Q**: Are there better Medusa-native ways to:
- Bulk assign products to categories?
- Get accurate uncategorized product counts?
- Handle stale query data?
- Ensure category assignments trigger all necessary downstream effects?

### 8. Product Module API
**Q**: Should we use the Product Module's service methods instead?
```typescript
const productModuleService = container.resolve('productModuleService');
// Is there a method like:
await productModuleService.addProductsToCategory(productIds, categoryId);
```

### 9. Integration with Admin UI
**Q**: After direct SQL inserts:
- Will the admin UI immediately reflect changes?
- Do we need to clear any admin-side caches?
- Will the category page show products correctly?

### 10. Performance at Scale
**Q**: For 2,400+ products:
- Is batch processing with SQL INSERT the right approach?
- Should we use Medusa's bulk operations if available?
- Are there rate limits or throttling we should consider?
- What's the recommended batch size?

## Our Concerns

1. **Event System**: Are we breaking Medusa's event-driven architecture by using direct SQL?
2. **Cache Invalidation**: Will our changes be immediately visible everywhere, or do we need manual cache clearing?
3. **Meilisearch Sync**: Do we need to manually trigger sync, or does it happen automatically?
4. **Data Integrity**: Could direct SQL cause inconsistencies that workflows prevent?
5. **Future Compatibility**: Will this approach break in future Medusa versions?

## Ideal Solution Criteria

We need an approach that:
- ✅ Returns accurate, non-cached data
- ✅ Successfully assigns products to categories
- ✅ Triggers all necessary events and side effects
- ✅ Works with Medusa's architecture, not against it
- ✅ Scales to thousands of products
- ✅ Maintains data consistency
- ✅ Auto-syncs to Meilisearch
- ✅ Updates admin UI immediately

## Request

Please provide:
1. **Best practice approach** for bulk product-to-category assignment in Medusa v2
2. **Explanation** of why our current approach may or may not work
3. **Code examples** of the recommended implementation
4. **Migration path** if we need to change our approach
5. **Documentation links** for the relevant APIs and patterns

---

**Medusa Version**: v2 (latest)
**Database**: PostgreSQL
**Search**: Meilisearch
**Context**: Custom admin widget for one-click category assignment

