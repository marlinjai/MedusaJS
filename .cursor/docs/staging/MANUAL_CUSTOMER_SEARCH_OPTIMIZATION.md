# Manual Customer Search Optimization - Medusa Best Practices Verification

## Context

We have a custom `manual_customer` module in our Medusa application with **13,637+ customer records**. The current search implementation is extremely slow because it loads ALL customers into memory and filters them with JavaScript.

## Current Implementation (SLOW)

**File**: `busbasisberlin/src/modules/manual-customer/service.ts` (lines 149-175)

```typescript
async searchCustomers(searchTerm: string): Promise<ManualCustomer[]> {
    if (!searchTerm || searchTerm.trim() === '') {
        return [];
    }

    // ❌ PROBLEM: Loads ALL 13,637 customers into memory
    const allCustomers = await this.listManualCustomers({});
    const term = searchTerm.toLowerCase().trim();

    // ❌ PROBLEM: Filters in JavaScript (slow)
    return allCustomers.filter(customer => {
        const searchableFields = [
            customer.customer_number,
            customer.first_name,
            customer.last_name,
            customer.company,
            customer.email,
            customer.phone,
            customer.mobile,
            customer.city,
            customer.legacy_customer_id,
            customer.internal_key,
        ];

        return searchableFields.some(
            field => field && field.toLowerCase().includes(term),
        );
    });
}
```

**Performance**:

- Loads 13,637+ records into memory on every search
- No database-level filtering
- No index utilization
- Extremely slow user experience

## Proposed Solution

### 1. Add PostgreSQL Full-Text Search Indexes (pg_trgm)

**New Migration**: `Migration20250108000000.ts`

```sql
-- Enable trigram extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add GIN indexes for fast ILIKE queries
CREATE INDEX "IDX_manual_customer_company_trgm"
    ON "manual_customer" USING gin (company gin_trgm_ops)
    WHERE deleted_at IS NULL;

CREATE INDEX "IDX_manual_customer_fullname_trgm"
    ON "manual_customer" USING gin (
        (COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) gin_trgm_ops
    )
    WHERE deleted_at IS NULL;

-- Similar indexes for email, phone, mobile, city
```

### 2. Rewrite Search to Use Database Queries

**Updated Method**: Use Medusa's query builder or raw SQL with proper WHERE clauses

```typescript
async searchCustomers(searchTerm: string): Promise<ManualCustomer[]> {
    if (!searchTerm || searchTerm.trim() === '') {
        return [];
    }

    const term = searchTerm.trim();

    // ✅ Use database-level filtering with indexes
    return await this.listManualCustomers({
        $or: [
            { company: { $ilike: `%${term}%` } },
            { first_name: { $ilike: `%${term}%` } },
            { last_name: { $ilike: `%${term}%` } },
            { email: { $ilike: `%${term}%` } },
            { phone: { $ilike: `%${term}%` } },
            { mobile: { $ilike: `%${term}%` } },
            { customer_number: { $ilike: `%${term}%` } },
            { city: { $ilike: `%${term}%` } },
        ],
    }, {
        take: 50, // Limit results
    });
}
```

**Expected Performance Improvement**:

- From: ~3-5 seconds (loading 13,637 records)
- To: ~50-200ms (indexed database query)

## Questions for Medusa Docs AI

### 1. Custom Module Best Practices

**Question**: Is our approach correct for implementing custom search on a custom module created with `MedusaService`?

Our module extends `MedusaService`:

```typescript
class ManualCustomerService extends MedusaService({
	manualCustomer,
}) {
	async searchCustomers(searchTerm: string): Promise<ManualCustomer[]> {
		// Search implementation
	}
}
```

**Specific concerns**:

- Should we use `this.listManualCustomers()` with filters (as shown above)?
- Or should we use the underlying ORM directly?
- Or should we use `query.graph()` for custom modules?

### 2. Database Index Strategy

**Question**: Is using pg_trgm GIN indexes the recommended approach for fuzzy text search in Medusa v2?

Our approach:

- Enable `pg_trgm` extension
- Create GIN indexes on searchable text fields
- Use `$ilike` queries in filters

**Alternatives we considered**:

- Full-text search (ts_vector/ts_query)
- Meilisearch integration (but manual_customer is not synced to Meilisearch)
- Plain B-tree indexes with ILIKE

### 3. Query Builder Syntax

**Question**: What is the correct syntax for OR queries in Medusa v2 with MedusaService?

We're proposing:

```typescript
await this.listManualCustomers(
	{
		$or: [
			{ company: { $ilike: `%${term}%` } },
			{ first_name: { $ilike: `%${term}%` } },
			// ...
		],
	},
	{
		take: 50,
	},
);
```

**Is this correct for Medusa v2?**

- Does `MedusaService` support `$or` operator?
- Does it support `$ilike` operator?
- Should we use a different approach?

### 4. Migration Best Practices

**Question**: Is our migration structure correct for adding indexes to a custom module?

Our migration:

```typescript
export class Migration20250108000000 extends Migration {
	override async up(): Promise<void> {
		this.addSql(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
		this.addSql(`CREATE INDEX IF NOT EXISTS ...`);
	}

	override async down(): Promise<void> {
		this.addSql(`DROP INDEX IF EXISTS ...`);
	}
}
```

**Questions**:

- Is it safe to enable extensions in migrations?
- Should we check if extension exists before creating it?
- Is `IF NOT EXISTS` safe for production deployments?

### 5. Alternative: Should We Use Meilisearch?

**Question**: Should we sync `manual_customer` to Meilisearch for better search performance?

**Current State**:

- Products: ✅ Synced to Meilisearch
- Categories: ✅ Synced to Meilisearch
- Manual Customers: ❌ NOT synced

**Trade-offs**:

- Pro: Fastest search, fuzzy matching, typo tolerance
- Con: Additional complexity, sync overhead
- Con: Manual customers change frequently (13k+ records)

**Our preference**: Start with pg_trgm, add Meilisearch later if needed

## System Architecture

```mermaid
graph TB
    AdminUI[Admin UI - Manual Customers Page] -->|Search Request| API[/admin/manual-customers?search=term]
    API --> Service[ManualCustomerService.searchCustomers]
    Service --> Database[(PostgreSQL<br/>13,637 customers)]
    Database -->|With Indexes| FastResults[50-200ms response]

    style AdminUI fill:#bbf
    style Database fill:#bfb
    style FastResults fill:#fbf
```

## Expected Outcome

After implementing this optimization:

1. **Search Speed**: From 3-5 seconds → 50-200ms
2. **User Experience**: Instant search results as user types
3. **Scalability**: Can handle 50k+ customers without degradation
4. **Medusa Compliance**: Uses standard Medusa patterns and PostgreSQL features

## Request for Medusa AI

Please review this optimization approach and confirm:

1. ✅ Is the `$or` and `$ilike` syntax correct for `MedusaService.list*()` methods?
2. ✅ Are pg_trgm GIN indexes safe and recommended for Medusa v2?
3. ✅ Is the migration structure correct?
4. ✅ Any other recommended optimizations or best practices we should follow?

Thank you!
