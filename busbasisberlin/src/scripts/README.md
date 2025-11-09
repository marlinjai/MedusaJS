# Custom CLI Scripts

Custom CLI scripts are functions to execute through Medusa's CLI tool. This is useful when creating custom Medusa tooling to run as a CLI tool.

> Learn more about custom CLI scripts in [this documentation](https://docs.medusajs.com/learn/fundamentals/custom-cli-scripts).

## Available Scripts

### Product & Inventory Management

#### `assign-default-shipping-profile.ts`
Assigns the default shipping profile to all products that don't have one.

```bash
npx medusa exec ./src/scripts/assign-default-shipping-profile.ts
```

**When to use:**
- After importing products without shipping profiles
- When fixing "No shipping methods available" errors
- After database migrations

#### `cleanup-s3-files.ts`
Removes orphaned files from Supabase Storage that are no longer referenced by any product.

```bash
npx medusa exec ./src/scripts/cleanup-s3-files.ts
```

**Features:**
- Scans all product images for references
- Compares with files in storage bucket
- Removes unreferenced files safely
- Logs all deletions for audit trail

**When to use:**
- After bulk product deletions
- During regular maintenance (monthly recommended)
- To reclaim storage space

### CSV Import Scripts

#### `import-products-with-relations.ts`
Imports products from CSV with categories, suppliers, and pricing.

```bash
npx tsx src/scripts/import-products-with-relations.ts data/products.csv
```

**Features:**
- ✅ Idempotent (safe to re-run, no duplicates)
- ✅ Automatic validation before import
- ✅ Category auto-creation and hierarchy
- ✅ Supplier relationships
- ✅ Batch processing with progress tracking
- ✅ Detailed error reporting

**Performance:**
- Batch size: 50 products
- Parallel batches: 3
- ~100-150 products/minute

**CSV Format:**
```csv
sku,title,description,price,category,supplier_name,supplier_sku
PROD-001,"Product Name","Description",49.99,"Category > Subcategory","Supplier Inc","SUP-SKU-001"
```

#### `import-manual-customers.ts`
Imports legacy customers with full idempotency support.

```bash
npx tsx src/scripts/import-manual-customers.ts data/customers.csv
```

**Idempotency Strategy:**
Checks for existing customers using (in priority order):
1. `customer_number` (Priority 1)
2. `internal_key` (Priority 2)
3. `legacy_customer_id` (Priority 3)
4. `email` (Priority 4, for business/legacy customers)

**First Import:**
```
📊 Validation Results:
   Will create: 100 new customers
   Will update: 0 existing customers
```

**Second Import (Same File):**
```
📊 Validation Results:
   Will create: 0 new customers
   Will update: 100 existing customers
✅ NO DUPLICATES!
```

**Performance Optimizations:**
- Bulk lookups (99% faster than N+1 queries)
- Bulk database operations (95% faster)
- Optimized batch size: 50 customers
- Parallel batches: 3
- ~200-300 customers/minute

**CSV Requirements:**
For best idempotency, ensure CSV has at least ONE of:
- ✅ `Kundennummer` (customer_number)
- ✅ `Interner Schlüssel` (internal_key)
- ✅ `E-Mail` (email)
- ✅ Legacy customer ID

**CSV Format:**
```csv
Kundennummer,Firma,Vorname,Nachname,E-Mail,Interner Schlüssel
KD-001,"Company GmbH","John","Doe","john@company.com","INTERNAL-001"
```

## How to Create a Custom CLI Script

To create a custom CLI script, create a TypeScript or JavaScript file under the `src/scripts` directory. The file must default export a function.

### Basic Example

Create `src/scripts/my-script.ts`:

```typescript
import { ExecArgs } from '@medusajs/framework/types';

export default async function myScript({ container }: ExecArgs) {
  const productModuleService = container.resolve('product');

  const [, count] = await productModuleService.listAndCountProducts();

  console.log(`You have ${count} product(s)`);
}
```

The function receives a `container` parameter, which is an instance of the Medusa Container. Use it to resolve resources in your Medusa application.

### Run the Script

```bash
npx medusa exec ./src/scripts/my-script.ts
```

### Script with Arguments

Your script can accept arguments from the command line:

```typescript
import { ExecArgs } from '@medusajs/framework/types';

export default async function myScript({ args }: ExecArgs) {
  console.log(`The arguments you passed: ${args}`);
}
```

Pass arguments after the file path:

```bash
npx medusa exec ./src/scripts/my-script.ts arg1 arg2
```

## Import Best Practices

### 1. Always Validate Before Import

Run imports with validation to preview changes:

```typescript
// Example validation output
📊 Validation Results:
   Total rows: 1000
   Valid rows: 950
   Invalid rows: 50
   Will create: 800 new records
   Will update: 150 existing records

⚠️  Issues Found:
   - Row 25: Missing required field 'sku'
   - Row 47: Invalid price format
   - Row 103: Category not found
```

### 2. Use Idempotent Patterns

Always check for existing records before creating:

```typescript
// ✅ GOOD: Idempotent
const existing = await service.findBy({ sku: productData.sku });
if (existing) {
  await service.update(existing.id, productData);
} else {
  await service.create(productData);
}

// ❌ BAD: Creates duplicates
await service.create(productData);
```

### 3. Optimize with Bulk Operations

Use bulk operations instead of individual queries:

```typescript
// ✅ GOOD: Bulk operation (fast)
const skus = batch.map(p => p.sku);
const existingMap = await findBySKUs(skus); // Single query

// ❌ BAD: N+1 queries (extremely slow)
for (let product of batch) {
  const existing = await findBySKU(product.sku); // Query per product
}
```

**Performance Impact:**
- For 1,000 products:
  - Individual queries: ~10-15 minutes
  - Bulk operations: ~1-2 minutes

### 4. Use Batch Processing

Process large datasets in batches with progress tracking:

```typescript
const BATCH_SIZE = 50;
const PARALLEL_BATCHES = 3;

for (let i = 0; i < data.length; i += BATCH_SIZE) {
  const batch = data.slice(i, i + BATCH_SIZE);
  await processBatch(batch);

  // Progress tracking
  const processed = Math.min(i + BATCH_SIZE, data.length);
  console.log(`Progress: ${processed}/${data.length} (${Math.round(processed/data.length*100)}%)`);
}
```

### 5. Handle Errors Gracefully

Log errors but continue processing:

```typescript
const errors: ImportError[] = [];

for (let row of data) {
  try {
    await processRow(row);
  } catch (error) {
    errors.push({
      row: row.lineNumber,
      data: row,
      error: error.message
    });
    // Continue processing other rows
  }
}

// Report all errors at the end
if (errors.length > 0) {
  console.error(`\n❌ ${errors.length} errors occurred:`);
  errors.forEach(e => {
    console.error(`  Row ${e.row}: ${e.error}`);
  });
}
```

### 6. Add Confirmation for Production

Always ask for confirmation before modifying data:

```typescript
import * as readline from 'readline';

async function confirmImport(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Proceed with import? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

// Usage
const proceed = await confirmImport();
if (!proceed) {
  console.log('Import cancelled');
  process.exit(0);
}
```

### 7. Performance Monitoring

Track and report performance metrics:

```typescript
const startTime = Date.now();
let processedCount = 0;

// ... processing ...

const duration = Date.now() - startTime;
const throughput = processedCount / (duration / 1000 / 60);

console.log(`\n📊 Performance:`);
console.log(`  Duration: ${Math.round(duration / 1000)}s`);
console.log(`  Throughput: ${Math.round(throughput)} records/minute`);
```

## Execution in Production

### Local Development

```bash
# Run locally with tsx
npx tsx src/scripts/my-script.ts

# Or with Medusa CLI
npx medusa exec ./src/scripts/my-script.ts
```

### Production Server (Docker)

Scripts must be executed inside the Docker container:

```bash
# SSH to server
ssh deploy@your-server.de

# Determine active deployment (blue or green)
cd /opt/medusa-app/busbasisberlin
ACTIVE=$(cat .deployment-state 2>/dev/null || echo "green")

# Execute script in active container
docker exec medusa_backend_server_$ACTIVE \
  npx medusa exec ./src/scripts/my-script.js
```

**Important:**
- Scripts run from compiled `.js` files in `.medusa/server/src/scripts/`
- TypeScript files are compiled during Docker build
- Always use `.js` extension when executing in production

### Script Availability in Docker

The `src/` directory is explicitly copied into the production Docker image:

```dockerfile
# Dockerfile line 50
COPY --from=builder /server/src ./src
```

This ensures all scripts in `src/scripts/` are available for execution via `medusa exec`.

## Troubleshooting

### "Cannot find module" Error

**Cause:** Script references don't exist in compiled output.

**Solution:** Ensure imports are from compiled modules:
```typescript
// ✅ GOOD
import { SomeService } from '../modules/some-module/service';

// ❌ BAD (won't exist in compiled output)
import { SomeType } from './types-only-file';
```

### "Permission Denied" Error

**Cause:** Script file lacks execute permissions.

**Solution:**
```bash
chmod +x src/scripts/my-script.ts
```

### Slow Import Performance

**Symptoms:**
- Import taking hours for thousands of records
- High database CPU usage
- Progress bar barely moving

**Diagnosis:**
```typescript
// Add timing to identify bottlenecks
console.time('Lookup');
const existing = await findExisting(sku);
console.timeEnd('Lookup'); // Shows time per lookup
```

**Solutions:**
1. Use bulk lookups (see Best Practices #3)
2. Increase batch size (50-100 recommended)
3. Add database indexes for lookup fields
4. Use parallel batch processing

### Idempotency Issues

**Symptoms:**
- Duplicate records created on re-import
- "Already exists" errors

**Diagnosis:**
- Check if lookup fields are properly indexed
- Verify CSV has unique identifiers
- Test with small dataset first

**Solutions:**
1. Add multiple identifier checks (see customer import example)
2. Use upsert operations when available
3. Log all create vs update decisions

## Testing Scripts

### Test with Small Dataset First

```bash
# Create test CSV with 10-20 rows
head -n 20 data/full-dataset.csv > data/test-dataset.csv

# Run import
npx tsx src/scripts/import-script.ts data/test-dataset.csv

# Verify results in Admin UI
```

### Dry Run Mode

Add a `--dry-run` flag to your scripts:

```typescript
export default async function myScript({ args }: ExecArgs) {
  const dryRun = args.includes('--dry-run');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }

  // ... processing ...

  if (!dryRun) {
    await service.create(data);
  } else {
    console.log('Would create:', data);
  }
}
```

### Rollback Preparation

Before running destructive scripts:

1. **Backup database:**
```bash
docker exec medusa_postgres pg_dump -U postgres medusa > backup.sql
```

2. **Test on staging first**

3. **Keep rollback script ready:**
```bash
# Restore from backup if needed
docker exec -i medusa_postgres psql -U postgres medusa < backup.sql
```

## Additional Resources

- [Medusa CLI Scripts Documentation](https://docs.medusajs.com/learn/fundamentals/custom-cli-scripts)
- [Medusa Container & Dependency Injection](https://docs.medusajs.com/learn/fundamentals/container)
- [Module Development](https://docs.medusajs.com/learn/fundamentals/modules)
