---
description: "Medusa v2 API patterns: Zod validation, workflows, services, and backend best practices"
alwaysApply: false
---

# Medusa API Development Patterns

## Input Validation - Zod Schemas (REQUIRED)

**✅ REQUIRED Pattern**:
```typescript
import { z } from 'zod';
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

// Define validation schema
const listResourceSchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(250).default(50),
  offset: z.coerce.number().min(0).default(0),
  sort_by: z.string().optional(),
  sort_direction: z.enum(['asc', 'desc']).default('desc'),
});

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    // Validate and parse - this gives you type safety!
    const params = listResourceSchema.parse(req.query);

    // Use validated params
    const data = await service.list(params);
    return res.json({ data });

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

**❌ AVOID Pattern**:
```typescript
// Don't use unvalidated query parameters
export const GET = async (req, res) => {
  const { search } = req.query; // Could be anything!
  // No type safety, no validation
};
```

## Route Structure

**Standard Route Pattern**:
```typescript
// route.ts
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

  try {
    // 1. Validate input with Zod
    const params = schema.parse(req.query);

    // 2. Resolve services
    const service = req.scope.resolve('service_name');

    // 3. Fetch data using Medusa services (not raw SQL)
    const data = await service.list(params);

    // 4. Return standardized response
    return res.json({
      [resource]: data.items,
      stats: data.stats,
    });

  } catch (error) {
    logger.error(`[ROUTE] Error:`, error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
};
```

## Workflow Patterns

**✅ USE Workflows for Complex Operations**:
```typescript
import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

export const complexOperationWorkflow = createWorkflow(
  'complex-operation',
  function (input: OperationInput) {
    // Step 1: Validate input
    const validation = validateInputStep(input);

    // Step 2: Main operation using Medusa services
    const result = performOperationStep(validation);

    // Step 3: Emit events for subscribers
    const events = emitEventsStep(result);

    // Step 4: Update external systems
    const sync = syncExternalStep(result);

    return new WorkflowResponse(result);
  }
);
```

**❌ AVOID: Complex Logic in Routes**:
```typescript
// Don't put business logic directly in API routes
export const POST = async (req, res) => {
  // 50+ lines of business logic here ❌
  // Use workflows instead!
};
```

## Service Layer Patterns

**✅ USE Medusa Services (Not Raw SQL)**:
```typescript
// Correct approach
const productModuleService = req.scope.resolve(Modules.PRODUCT);
await productModuleService.updateProducts(productId, {
  categories: [{ id: categoryId }]
});

// Emit events for subscribers
const eventBusService = req.scope.resolve('event-bus');
await eventBusService.emit('product.updated', {
  id: productId,
  data: updatedProduct
});
```

**❌ AVOID: Direct SQL**:
```typescript
// Don't bypass Medusa's event system
await knex.raw(`INSERT INTO product_category_product ...`); // ❌
```

## Currency Handling

**✅ DYNAMIC Pattern**:
```typescript
// Fetch store currencies dynamically
import { getStoreSupportedCurrencies } from '@/utils/currency-helper';

const currencies = await getStoreSupportedCurrencies(req.scope);

// Build currency field map dynamically
const CURRENCY_FIELD_MAP = new Map();
currencies.forEach(currency => {
  CURRENCY_FIELD_MAP.set(`price_${currency.code}`, currency.code);
});
```

**❌ AVOID: Hardcoded**:
```typescript
// Don't hardcode currency mappings
const CURRENCY_FIELD_MAP = {
  price_eur: 'eur', // Hardcoded!
  price_usd: 'usd', // Hardcoded!
};
```

## Error Handling

**Standardized Error Responses**:
```typescript
// Validation error
if (error instanceof z.ZodError) {
  return res.status(400).json({
    error: 'Validation error',
    details: error.errors,
  });
}

// Not found
if (!resource) {
  return res.status(404).json({
    error: 'Not found',
    message: 'Resource not found',
  });
}

// Server error
logger.error('[ROUTE] Error:', error);
return res.status(500).json({
  error: 'Internal server error',
  message: error.message,
});
```

## Query Graph Usage

**For Linked Relations**:
```typescript
// Use query.graph for linked relations (variants.prices, sales_channels)
const product = await query.graph({
  entity: 'product',
  fields: [
    'id',
    'title',
    'variants.id',
    'variants.prices.*',        // Linked relation
    'variants.images.id',
    'variants.images.url',
    'sales_channels.id',        // Linked relation
  ],
  filters: { id: productId },
});
```

**For Direct Relations**:
```typescript
// Use service methods for direct module relations
const productModuleService = req.scope.resolve(Modules.PRODUCT);
const product = await productModuleService.retrieveProduct(productId, {
  relations: ['variants', 'images', 'categories']
});
```

## Response Formatting

**List Endpoints**:
```typescript
return res.json({
  [resource]: items,
  stats: {
    total: count,
    active: activeCount,
    inactive: inactiveCount,
    // Resource-specific stats
  },
});
```

**Detail Endpoints**:
```typescript
return res.json({
  [resource]: item,
  // Include loaded relations
});
```

## Common Mistakes to Avoid

1. **Don't create shared hooks for pagination/sorting** - Use DataTable instead
2. **Don't use raw SQL in routes** - Use Medusa services
3. **Don't skip input validation** - Always use Zod schemas
4. **Don't put business logic in routes** - Use workflows
5. **Don't hardcode currency codes** - Fetch dynamically from store
6. **Don't forget event emission** - Emit events after data changes

This rule ensures all API development follows Medusa v2 best practices and maintains consistency across the codebase.
