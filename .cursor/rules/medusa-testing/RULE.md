---
description: "Medusa v2 testing patterns: integration tests, workflow tests, and API validation"
alwaysApply: false
---

# Medusa Testing Patterns

## Integration Testing with Medusa Test Utils

**✅ REQUIRED Pattern**:
```typescript
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ api }) => {
    describe('Suppliers API', () => {
      let supplierId: string;

      it('should list suppliers with pagination', async () => {
        const response = await api.get('/admin/suppliers?limit=10&offset=0');

        expect(response.status).toBe(200);
        expect(response.data.suppliers).toBeDefined();
        expect(response.data.suppliers.length).toBeLessThanOrEqual(10);
        expect(response.data.stats).toBeDefined();
        expect(response.data.stats.total).toBeGreaterThanOrEqual(0);
      });

      it('should create a supplier', async () => {
        const response = await api.post('/admin/suppliers', {
          company: 'Test Supplier',
          email: 'test@example.com',
        });

        expect(response.status).toBe(200);
        expect(response.data.supplier).toBeDefined();
        expect(response.data.supplier.company).toBe('Test Supplier');

        supplierId = response.data.supplier.id;
      });

      it('should validate input with Zod', async () => {
        try {
          await api.post('/admin/suppliers', {
            company: '', // Invalid - empty string
          });
          fail('Should have thrown validation error');
        } catch (error) {
          expect(error.response.status).toBe(400);
          expect(error.response.data.error).toBe('Validation error');
        }
      });
    });
  },
});
```

## Workflow Testing

**Test Workflow Execution**:
```typescript
import { createOfferWorkflow } from '../workflows/offer/create-offer';

describe('Create Offer Workflow', () => {
  it('should create offer and reserve inventory', async () => {
    const result = await createOfferWorkflow.run({
      input: {
        customer_id: 'cust_123',
        items: [{ product_id: 'prod_123', quantity: 2 }]
      }
    });

    expect(result.offer).toBeDefined();
    expect(result.offer.offer_number).toMatch(/ANG-\d{5}/);
    expect(result.reservations).toHaveLength(1);
  });

  it('should handle compensation on failure', async () => {
    // Test rollback functionality
    const mockFailure = jest.fn().mockRejectedValue(new Error('Test failure'));

    try {
      await createOfferWorkflow.run({
        input: { /* invalid input */ }
      });
      fail('Should have failed');
    } catch (error) {
      // Verify compensation steps ran
      expect(mockFailure).toHaveBeenCalled();
    }
  });
});
```

## Service Testing

**Unit Tests for Services**:
```typescript
describe('SupplierService', () => {
  let supplierService: SupplierService;

  beforeEach(() => {
    supplierService = new SupplierService(container, logger);
  });

  it('should create supplier with contacts', async () => {
    const supplier = await supplierService.create({
      company: 'Test Supplier',
      contacts: [{ email: 'test@example.com' }]
    });

    expect(supplier.company).toBe('Test Supplier');
    expect(supplier.contacts).toHaveLength(1);
    expect(supplier.contacts[0].email).toBe('test@example.com');
  });

  it('should validate required fields', async () => {
    await expect(supplierService.create({
      company: '', // Invalid
    })).rejects.toThrow('Company name is required');
  });
});
```

## API Endpoint Testing

**CRUD Operations Testing**:
```typescript
describe('Resource API', () => {
  describe('GET /admin/resource', () => {
    it('should return paginated results', async () => {
      const response = await api.get('/admin/resource?limit=5');

      expect(response.status).toBe(200);
      expect(response.data.resource).toHaveLength(5);
      expect(response.data.stats.total).toBeGreaterThanOrEqual(5);
    });

    it('should filter by search term', async () => {
      const response = await api.get('/admin/resource?search=test');

      expect(response.status).toBe(200);
      // Verify search filtering works
    });

    it('should sort by specified field', async () => {
      const response = await api.get('/admin/resource?sort_by=created_at&sort_direction=desc');

      expect(response.status).toBe(200);
      // Verify sorting works
    });
  });

  describe('POST /admin/resource', () => {
    it('should create resource with valid data', async () => {
      const response = await api.post('/admin/resource', validData);

      expect(response.status).toBe(200);
      expect(response.data.resource).toBeDefined();
    });

    it('should reject invalid data', async () => {
      try {
        await api.post('/admin/resource', invalidData);
        fail('Should have thrown');
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('Validation error');
      }
    });
  });
});
```

## Event Testing

**Test Event Emission**:
```typescript
describe('Product Events', () => {
  it('should emit product.updated after modification', async () => {
    const eventSpy = jest.fn();
    eventBusService.emit = eventSpy;

    await productService.update(productId, { title: 'New Title' });

    expect(eventSpy).toHaveBeenCalledWith('product.updated', {
      id: productId,
      data: expect.objectContaining({ title: 'New Title' })
    });
  });
});
```

## Database Testing

**Test Data Setup**:
```typescript
describe('Database Operations', () => {
  beforeEach(async () => {
    // Clean test data
    await cleanupTestData();

    // Setup test fixtures
    await createTestFixtures();
  });

  afterEach(async () => {
    // Cleanup after each test
    await cleanupTestData();
  });
});
```

## Test File Structure

**File Naming**:
```
integration-tests/
├── http/
│   ├── suppliers.spec.ts       # API endpoint tests
│   ├── offers.spec.ts          # API endpoint tests
│   └── products.spec.ts        # API endpoint tests
├── workflows/
│   ├── offer-workflows.spec.ts # Workflow tests
│   └── sync-workflows.spec.ts  # Workflow tests
└── services/
    ├── supplier.service.spec.ts # Service unit tests
    └── offer.service.spec.ts    # Service unit tests
```

## Test Coverage Goals

**Critical Paths** (must have tests):
- All CRUD operations for custom modules
- Workflow execution and compensation
- Input validation (Zod schema enforcement)
- Event emission and handling
- Error scenarios (4xx, 5xx responses)

**Test Template**:
```typescript
// [module].spec.ts
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ api }) => {
    describe('[Module] API', () => {
      // Test all CRUD operations
      // Test validation
      // Test error handling
      // Test business logic
    });
  },
});
```

## Mocking Patterns

**Mock External Services**:
```typescript
// Mock email service
const mockEmailService = {
  send: jest.fn().mockResolvedValue({ id: 'email_123' }),
};

// Mock file storage
const mockStorageService = {
  upload: jest.fn().mockResolvedValue({ url: 'https://example.com/file.pdf' }),
};
```

**Mock Workflows**:
```typescript
// Mock workflow execution
const mockWorkflow = {
  run: jest.fn().mockResolvedValue({ success: true }),
};
```

This rule ensures comprehensive testing coverage following Medusa's testing patterns and best practices.
