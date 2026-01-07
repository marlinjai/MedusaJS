# Medusa v2 Best Practices Implementation Guide

**Last Updated**: January 7, 2026
**Status**: Consolidated from assessment and query documentation

Complete guide for implementing Medusa v2 best practices in the BusBasisBerlin project.

---

## Table of Contents

1. [Assessment of Current Implementation](#assessment-of-current-implementation)
2. [Medusa v2 Patterns](#medusa-v2-patterns)
3. [Migration Recommendations](#migration-recommendations)
4. [Legacy Code Cleanup](#legacy-code-cleanup)

---

## Assessment of Current Implementation

### ✅ What We Did Right

**1. Workflow Architecture**
- ✅ Used `createWorkflow` and `createStep` from Medusa framework
- ✅ Implemented step-based architecture with compensation functions
- ✅ Exposed through API routes for admin UI integration
- ✅ Background processing with 202 responses

**2. Idempotent Operations**
- ✅ Used `ON CONFLICT DO NOTHING` in SQL operations
- ✅ Category creation checks existence first
- ✅ Can be run multiple times safely

**3. Admin UI Integration**
- ✅ Created custom widgets using `@medusajs/admin-sdk`
- ✅ Provides one-click solutions for complex operations
- ✅ Shows progress and status feedback

**4. Event-Driven Architecture**
- ✅ Event subscribers for product sync (`src/subscribers/`)
- ✅ Automatic Meilisearch indexing on product changes
- ✅ Real-time data synchronization

### ⚠️ Areas for Improvement

**1. Direct SQL vs Medusa Services**

Current approach:
```typescript
// ❌ Direct SQL bypass
await knex.raw(`INSERT INTO product_category_product ...`);
```

**Issues**:
- Bypasses Medusa's event system
- Doesn't trigger `product.updated` events
- May not invalidate internal caches
- Could break in future Medusa versions

**Recommended**:
```typescript
// ✅ Use Medusa services
const productModuleService = req.scope.resolve(Modules.PRODUCT);
await productModuleService.updateProducts(productId, {
  categories: [{ id: categoryId }]
});
```

**2. Cache Invalidation**

Current issue: `query.graph` returns stale data after direct SQL changes

**Solution**:
```typescript
// After product updates, clear cache
const cacheService = req.scope.resolve('cache-service');
await cacheService.invalidate(`product:${productId}`);

// Or use refetchEntity utility
import { refetchEntity } from '@medusajs/framework/utils';
await refetchEntity('product', productId, req.scope);
```

**3. Event Emission**

Missing events that subscribers expect:
```typescript
// ✅ Emit events after product changes
const eventBusService = req.scope.resolve('event-bus');
await eventBusService.emit('product.updated', {
  id: productId,
  data: updatedProduct
});
```

---

## Medusa v2 Patterns

### Data Fetching Patterns

**✅ Recommended: React Query + Medusa JS SDK**
```typescript
import { sdk } from '@/admin/lib/sdk';

// Create custom hook
function useProducts(params?: { category_id?: string }) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => sdk.admin.product.list(params),
    staleTime: 30000,
  });
}

// Use in component
const { data: products, isLoading } = useProducts({
  category_id: selectedCategory
});
```

**⚠️ Current: React Query + Raw Fetch** (acceptable for custom endpoints)
```typescript
const { data } = useQuery({
  queryKey: ['products', filters],
  queryFn: async () => {
    const res = await fetch('/admin/products/by-category', {
      credentials: 'include'
    });
    return res.json();
  }
});
```

**❌ Avoid: Manual State Management**
```typescript
// Don't do this:
const [products, setProducts] = useState([]);
useEffect(() => {
  fetch('/admin/products').then(res => res.json()).then(setProducts);
}, []);
```

### Table Components

**✅ Recommended: Medusa UI DataTable**
```typescript
import { DataTable, useDataTable, createDataTableColumnHelper } from '@medusajs/ui';

const columnHelper = createDataTableColumnHelper<Product>();

const columns = [
  columnHelper.accessor('title', {
    header: 'Product Name',
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: ({ getValue }) => <StatusBadge status={getValue()} />,
  }),
];

const table = useDataTable({
  data: products,
  columns,
  getRowId: (row) => row.id,
  rowCount: total,
  enablePagination: true,
  enableSorting: true,
  enableRowSelection: true,
});

return <DataTable instance={table} />;
```

**Benefits**:
- Built-in pagination, sorting, filtering
- Consistent UI across admin pages
- Type-safe column definitions
- Integrated with React Query (no dual state)

### API Validation

**✅ Recommended: Zod Schemas**
```typescript
import { z } from 'zod';

const listProductsSchema = z.object({
  search: z.string().optional(),
  category_id: z.string().optional(),
  limit: z.coerce.number().min(1).max(250).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const params = listProductsSchema.parse(req.query);
    // Type-safe and validated!
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }
    throw error;
  }
};
```

### Workflow Patterns

**✅ Use Workflows for Complex Operations**
```typescript
import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

export const assignProductCategoriesWorkflow = createWorkflow(
  'assign-product-categories',
  function (input: { product_ids: string[]; category_id: string }) {
    // Step 1: Validate products exist
    const products = validateProductsStep(input.product_ids);

    // Step 2: Assign categories using Medusa services (not raw SQL)
    const result = assignCategoriesStep({
      products,
      category_id: input.category_id
    });

    // Step 3: Emit events for subscribers
    const events = emitProductEventsStep(result);

    // Step 4: Sync to external systems
    syncToMeilisearchStep(result);

    return new WorkflowResponse(result);
  }
);
```

**Benefits**:
- Transactional operations
- Automatic compensation on failure
- Event emission
- Reusable across different contexts

---

## Migration Recommendations

### Priority 1: Replace Direct SQL with Medusa Services

**Current problematic pattern**:
```typescript
// ❌ Direct SQL in workflows/assign-categories
await knex.raw(`
  INSERT INTO product_category_product (product_id, category_id)
  VALUES ${placeholders}
  ON CONFLICT DO NOTHING
`, productCategoryPairs);
```

**Recommended migration**:
```typescript
// ✅ Use Medusa Product Module
const productModuleService = container.resolve(Modules.PRODUCT);

for (const productId of productIds) {
  await productModuleService.updateProducts(productId, {
    categories: [{ id: categoryId }]
  });
}
```

**Benefits**:
- Triggers proper events
- Invalidates caches automatically
- Future-proof against schema changes
- Follows Medusa patterns

### Priority 2: Add Missing Event Emission

**Add to workflows**:
```typescript
// After product updates
const eventBusService = container.resolve('event-bus');
await eventBusService.emit('product.updated', {
  id: productId,
  data: updatedProduct
});
```

**Benefits**:
- Triggers Meilisearch auto-sync
- Notifies other subscribers
- Maintains data consistency

### Priority 3: Implement Cache Invalidation

**Add to API routes after data changes**:
```typescript
import { refetchEntity } from '@medusajs/framework/utils';

// After updating product
await refetchEntity('product', productId, req.scope);
```

---

## Legacy Code Cleanup

### Files Requiring Cleanup

**1. Manual Sync Code** (No longer needed with auto-sync)
```
src/api/admin/products/assign-uncategorized/route.ts (lines 52-96)
- Remove manual Meilisearch sync
- Remove manual category sync
- Keep only the workflow execution
```

**2. Duplicate Type Definitions**
```
src/admin/routes/products/by-category/page.tsx
- Remove duplicate Product type
- Use shared types from modules
```

**3. Hardcoded Configuration**
```
Various files with hardcoded currency codes
- Replace with dynamic store configuration
- Use currency helper utilities
```

### Cleanup Strategy

**Step 1: Identify Dead Code**
```bash
# Find unused imports
npx ts-unused-exports tsconfig.json

# Find unreferenced files
npx unimported

# Find duplicate code
npx jscpd src/
```

**Step 2: Safe Removal Process**
1. Comment out code first (don't delete immediately)
2. Deploy and test for 48 hours
3. If no issues, remove commented code
4. Update tests to reflect changes

**Step 3: Consolidation**
1. Extract duplicate logic to shared utilities
2. Create shared type definitions
3. Use consistent patterns across similar components

---

## Testing Integration

### Current State
- ✅ 1 integration test (`health.spec.ts`)
- ❌ No tests for custom modules
- ❌ No workflow testing
- ❌ No API route validation testing

### Recommended Testing Strategy

**Integration Tests with Medusa Test Utils**:
```typescript
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ api }) => {
    describe('Product Category Assignment', () => {
      it('should assign category via workflow', async () => {
        // Test the workflow, not direct SQL
        const response = await api.post('/admin/products/assign-uncategorized', {
          category_id: 'cat_123',
          dry_run: false
        });

        expect(response.status).toBe(202);
        expect(response.data.job_id).toBeDefined();
      });

      it('should trigger Meilisearch sync automatically', async () => {
        // Verify auto-sync works (no manual sync needed)
        // ...
      });
    });
  }
});
```

**Unit Tests for Workflows**:
```typescript
import { assignProductCategoriesWorkflow } from '../workflows/assign-categories';

describe('Assign Categories Workflow', () => {
  it('should emit events after assignment', async () => {
    const mockEventBus = jest.fn();
    // Test event emission
  });

  it('should handle compensation on failure', async () => {
    // Test rollback functionality
  });
});
```

---

## Performance Considerations

### Query Optimization

**Current**: Multiple individual queries
```typescript
// ❌ N+1 query problem
for (const productId of productIds) {
  const product = await query.graph({
    entity: 'product',
    fields: ['id', 'title'],
    filters: { id: productId }
  });
}
```

**Recommended**: Batch queries
```typescript
// ✅ Single query with filters
const products = await query.graph({
  entity: 'product',
  fields: ['id', 'title', 'categories.*'],
  filters: { id: { $in: productIds } }
});
```

### Workflow Optimization

**Use Batch Operations**:
```typescript
// ✅ Process in batches, not individually
const BATCH_SIZE = 100;
for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
  const batch = productIds.slice(i, i + BATCH_SIZE);
  await processBatch(batch);
}
```

---

## Security Best Practices

### Input Validation

**Always validate API inputs**:
```typescript
import { z } from 'zod';

const assignCategorySchema = z.object({
  product_ids: z.array(z.string()).min(1).max(1000),
  category_id: z.string().min(1),
  dry_run: z.boolean().default(false),
});

export const POST = async (req, res) => {
  const body = assignCategorySchema.parse(req.body);
  // Validated and type-safe!
};
```

### Authorization

**Check permissions before operations**:
```typescript
// Verify user has permission to modify products
const user = req.auth_context?.actor;
if (!user || !user.permissions?.includes('product:write')) {
  return res.status(403).json({ error: 'Insufficient permissions' });
}
```

---

## Future Architecture Direction

### Recommended Migrations

**1. SDK Migration** (High Priority)
- Replace raw fetch with Medusa JS SDK
- Create custom hooks wrapping SDK calls
- Consistent error handling and type safety

**2. DataTable Migration** (High Priority)
- Replace custom table components with Medusa UI DataTable
- Remove duplicate pagination/sorting logic
- Consistent table behavior across admin

**3. Service Layer Migration** (Medium Priority)
- Replace direct SQL with Medusa service calls
- Proper event emission and cache invalidation
- Future-proof against schema changes

**4. Testing Implementation** (Medium Priority)
- Integration tests for all custom modules
- Workflow testing with compensation validation
- API route validation testing

### Long-term Vision

**Target Architecture**:
```
Frontend (Admin UI)
├─ Medusa UI Components (DataTable, etc.)
├─ SDK Hooks (useProducts, useSuppliers, etc.)
└─ React Query (caching, state management)

Backend (API Routes)
├─ Zod Validation (input/output schemas)
├─ Medusa Services (not direct SQL)
└─ Workflows (complex business logic)

Testing
├─ Integration Tests (API routes)
├─ Workflow Tests (business logic)
└─ E2E Tests (critical user flows)
```

---

## Implementation Checklist

### Phase 1: Foundation (Weeks 1-2)
- [ ] Create SDK hooks for all custom modules
- [ ] Add Zod validation to critical API routes
- [ ] Document patterns in coding standards
- [ ] Update one reference implementation (suppliers page)

### Phase 2: Migration (Weeks 2-3)
- [ ] Migrate all admin tables to Medusa DataTable
- [ ] Replace direct SQL with service calls in workflows
- [ ] Add proper event emission to workflows
- [ ] Remove deprecated shared hooks

### Phase 3: Quality (Weeks 3-4)
- [ ] Add integration tests for all custom modules
- [ ] Test workflow compensation functions
- [ ] Validate API input/output schemas
- [ ] Performance testing and optimization

### Phase 4: Cleanup (Week 4+)
- [ ] Remove manual sync code (now automatic)
- [ ] Consolidate duplicate type definitions
- [ ] Remove unused utilities and components
- [ ] Update documentation to reflect changes

---

## Key Lessons Learned

### React Query Integration
**Discovery**: Custom pagination hooks create dual state with React Query, leading to race conditions and timing bugs.

**Solution**: Use simple `useState` for query-dependent state, reserve shared hooks for UI-only state.

### Currency Handling
**Discovery**: Hardcoded currency handling doesn't scale and creates maintenance burden.

**Solution**: Dynamic currency fetching from Medusa Store Module, with proper ISO 4217 validation.

### Documentation Management
**Discovery**: 87+ scattered MD files make information hard to find and maintain.

**Solution**: Consolidated structure in `.cursor/docs/` with clear hierarchy and single source of truth.

### Medusa Service Integration
**Discovery**: Direct SQL bypasses Medusa's event system and caching.

**Solution**: Use Medusa services for all data operations, emit proper events, handle cache invalidation.

---

## References

### Official Medusa Documentation
- [Medusa v2 Architecture](https://docs.medusajs.com/learn/introduction/architecture)
- [Commerce Modules](https://docs.medusajs.com/learn/fundamentals/modules/commerce-modules)
- [Workflows](https://docs.medusajs.com/learn/fundamentals/workflows)
- [Admin SDK](https://docs.medusajs.com/resources/admin-sdk)
- [JS SDK](https://docs.medusajs.com/resources/js-sdk)
- [DataTable Component](https://docs.medusajs.com/resources/admin-components/components/data-table)

### Testing Resources
- [Integration Testing](https://docs.medusajs.com/learn/debugging-and-testing/testing-tools/integration-tests)
- [Test Utils](https://docs.medusajs.com/references/test-utils)

### Examples
- [Quote Management](https://docs.medusajs.com/resources/examples/guides/quote-management)
- [Custom Admin Routes](https://docs.medusajs.com/learn/fundamentals/admin/routes)
- [Workflow Examples](https://docs.medusajs.com/resources/examples#workflows)

---

This guide provides the foundation for aligning our implementation with Medusa v2 best practices while maintaining the working functionality we've built.
