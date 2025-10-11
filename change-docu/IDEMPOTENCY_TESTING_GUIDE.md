# Idempotency Testing Guide

## Overview
This guide explains how to test the improved idempotent import functionality for manual customers.

## What We've Implemented

### ✅ Completed Features

1. **Multi-Key Duplicate Detection**
   - Checks customer_number (Priority 1)
   - Checks internal_key (Priority 2)
   - Checks legacy_customer_id (Priority 3)
   - Checks email for business/legacy customers (Priority 4)

2. **Pre-Import Validation**
   - Validates all rows before importing
   - Identifies which customers will be created vs updated
   - Warns about rows missing unique identifiers
   - Blocks import if critical errors are found

3. **Dry-Run Mode**
   - Run import without making changes
   - Preview what would happen
   - See potential duplicates that would be updated

4. **Improved Import Reference**
   - Timestamp-based import references
   - Format: `import-2025-10-10T12-30-45-row-123`
   - Unique across multiple import sessions

5. **Better Error Handling**
   - Warnings for missing identifiers
   - Detailed error messages with row numbers
   - Option for strict mode (stop on first error)

6. **Enhanced Script Output**
   - Two-step process: validation → import
   - Clear summary of what will happen
   - Idempotency status reporting
   - Helpful tips after import

## Testing Scenarios

### Test 1: Basic Idempotency with Customer Numbers

**Goal:** Verify that re-importing the same CSV doesn't create duplicates

**Steps:**
1. Create test CSV with customer numbers:
```csv
Kundennummer;Vorname;Nachname;E-Mail;Firma
CUST001;John;Doe;john@test.com;Acme Corp
CUST002;Jane;Smith;jane@test.com;Beta Inc
CUST003;Bob;Johnson;bob@test.com;
```

2. First import:
```bash
cd busbasisberlin
npx tsx src/scripts/import-manual-customers.ts ../test-customers.csv
```

3. Expected output:
```
✅ Idempotency Check: All records are new
📊 Results:
   - Imported: 3 new customers
   - Updated: 0 existing customers
```

4. Second import (same file):
```bash
npx tsx src/scripts/import-manual-customers.ts ../test-customers.csv
```

5. Expected output:
```
✅ Idempotency Check: 3 existing customers will be updated
📊 Results:
   - Imported: 0 new customers
   - Updated: 3 existing customers
```

**✅ Pass Criteria:** Second import updates all 3 customers, creates 0 duplicates

---

### Test 2: Idempotency with Missing Customer Numbers

**Goal:** Verify fallback to other unique identifiers

**Steps:**
1. Create test CSV without customer numbers but with emails:
```csv
Kundennummer;Vorname;Nachname;E-Mail;Firma;Kundengruppe
;John;Doe;john@legacy.com;OldCorp;legacy
;Jane;Smith;jane@legacy.com;LegacyInc;legacy
```

2. First import - Expected:
```
⚠️ Warnings:
   - Row 1: No unique identifier found
   
📊 Results:
   - Imported: 2 new customers
   - Updated: 0 existing customers
```

3. Second import - Expected:
```
✅ Idempotency Check: 2 existing customers will be updated
📊 Results:
   - Imported: 0 new customers
   - Updated: 2 existing customers (matched by email)
```

**✅ Pass Criteria:** Email matching works for legacy/business customers

---

### Test 3: Dry-Run Mode

**Goal:** Verify dry-run doesn't make changes

**Steps:**
1. Use API directly with dry-run option:
```bash
curl -X POST http://localhost:9000/admin/manual-customers/import \
  -H "Content-Type: application/json" \
  -d '{
    "csvData": [
      {"Kundennummer": "TEST001", "Vorname": "Test", "Nachname": "User"}
    ],
    "fieldMapping": {
      "Kundennummer": "customer_number",
      "Vorname": "first_name",
      "Nachname": "last_name"
    },
    "options": {
      "dryRun": true
    }
  }'
```

2. Expected response:
```json
{
  "message": "Dry-run completed. Would import 1 customers and update 0 existing customers.",
  "results": {
    "imported": 1,
    "updated": 0,
    "skipped": 0,
    "warnings": [],
    "errors": []
  }
}
```

3. Verify no customer was actually created in the database

**✅ Pass Criteria:** No database changes occur during dry-run

---

### Test 4: Validation-Only Mode

**Goal:** Verify validation catches issues

**Steps:**
1. Create CSV with problematic data:
```csv
Kundennummer;Vorname;Nachname;E-Mail
;;;
VALID001;Valid;User;valid@test.com
```

2. Call validation endpoint:
```bash
curl -X POST http://localhost:9000/admin/manual-customers/import \
  -H "Content-Type: application/json" \
  -d '{
    "csvData": [
      {"Kundennummer": "", "Vorname": "", "Nachname": "", "E-Mail": ""},
      {"Kundennummer": "VALID001", "Vorname": "Valid", "Nachname": "User", "E-Mail": "valid@test.com"}
    ],
    "fieldMapping": {
      "Kundennummer": "customer_number",
      "Vorname": "first_name",
      "Nachname": "last_name",
      "E-Mail": "email"
    },
    "options": {
      "validate": true
    }
  }'
```

3. Expected response:
```json
{
  "validation": {
    "valid": false,
    "totalRows": 2,
    "potentialDuplicates": 0,
    "missingIdentifiers": 2,
    "errors": [
      "Row 1: Missing all identifying fields..."
    ],
    "warnings": [
      "Row 1: No unique identifier. Re-importing this row will create duplicates.",
      "Row 2: No unique identifier. Re-importing this row will create duplicates."
    ],
    "summary": {
      "willCreate": 1,
      "willUpdate": 0,
      "willSkip": 1
    }
  }
}
```

**✅ Pass Criteria:** Validation identifies problematic rows

---

### Test 5: Update Existing Customers

**Goal:** Verify updates preserve IDs and update fields

**Steps:**
1. First import with basic data:
```csv
Kundennummer;Vorname;Nachname;E-Mail
UPDATE001;Old;Name;old@test.com
```

2. Note the customer ID from the database

3. Second import with updated data:
```csv
Kundennummer;Vorname;Nachname;E-Mail;Tel
UPDATE001;New;Name;new@test.com;+4912345
```

4. Verify:
   - Customer ID remains the same
   - Name and email are updated
   - Phone number is added
   - No duplicate customer was created

**✅ Pass Criteria:** Customer is updated in-place, not duplicated

---

### Test 6: Mixed New and Existing

**Goal:** Verify correct handling of mixed data

**Steps:**
1. Import 3 customers initially
2. Create CSV with:
   - 2 existing customers (will update)
   - 3 new customers (will create)
   - 1 invalid customer (will skip)

3. Expected validation output:
```
📊 Validation Results:
   Total rows: 6
   Will create: 3 new customers
   Will update: 2 existing customers
   Will skip: 1 invalid rows
```

4. Expected import output:
```
📊 Results:
   - Imported: 3 new customers
   - Updated: 2 existing customers
   - Skipped: 1 rows
```

**✅ Pass Criteria:** Correct counts for create/update/skip

---

### Test 7: Internal Key Fallback

**Goal:** Verify internal_key is used when customer_number is missing

**Steps:**
1. Create CSV with internal_key:
```csv
Kundennummer;Interner Schlüssel;Vorname;Nachname
;INTERNAL-KEY-001;Test;User
```

2. First import - should create customer

3. Create second CSV with same internal_key:
```csv
Kundennummer;Interner Schlüssel;Vorname;Nachname;Tel
;INTERNAL-KEY-001;Updated;Name;+4912345
```

4. Second import - should update, not create duplicate

**✅ Pass Criteria:** Internal key prevents duplicates

---

### Test 8: Large Import Performance

**Goal:** Verify performance with many rows

**Steps:**
1. Generate CSV with 1000+ rows
2. Run import
3. Re-run same import
4. Measure time and verify no duplicates

**✅ Pass Criteria:** 
- Import completes in reasonable time (<2 min for 1000 rows)
- Re-import correctly identifies all as updates
- No duplicates created

---

## Manual Testing Checklist

Use this checklist when testing:

- [ ] Test 1: Basic idempotency with customer numbers
- [ ] Test 2: Idempotency with missing customer numbers  
- [ ] Test 3: Dry-run mode doesn't make changes
- [ ] Test 4: Validation catches errors
- [ ] Test 5: Updates preserve customer IDs
- [ ] Test 6: Mixed new and existing customers
- [ ] Test 7: Internal key fallback works
- [ ] Test 8: Performance with large files

## Automated Testing

To create automated tests, add to `busbasisberlin/src/modules/manual-customer/__tests__/service.test.ts`:

```typescript
describe('ManualCustomerService - Import Idempotency', () => {
  it('should not create duplicates when importing same data twice', async () => {
    const csvData = [
      { Kundennummer: 'TEST001', Vorname: 'John', Nachname: 'Doe' }
    ];
    const fieldMapping = {
      Kundennummer: 'customer_number',
      Vorname: 'first_name', 
      Nachname: 'last_name'
    };

    // First import
    const result1 = await service.importFromCSV(csvData, fieldMapping);
    expect(result1.imported).toBe(1);
    expect(result1.updated).toBe(0);

    // Second import - should update, not create duplicate
    const result2 = await service.importFromCSV(csvData, fieldMapping);
    expect(result2.imported).toBe(0);
    expect(result2.updated).toBe(1);

    // Verify only one customer exists
    const customers = await service.listManualCustomers({});
    const testCustomers = customers.filter(c => c.customer_number === 'TEST001');
    expect(testCustomers.length).toBe(1);
  });

  it('should use email fallback for customers without customer_number', async () => {
    // Test implementation...
  });

  it('should provide accurate validation results', async () => {
    // Test implementation...
  });
});
```

## Success Metrics

The implementation is successful if:

1. ✅ Re-importing same CSV creates 0 duplicates
2. ✅ Multiple unique identifiers work (customer_number, internal_key, email)
3. ✅ Validation accurately predicts import results
4. ✅ Dry-run mode makes no database changes
5. ✅ Updates preserve customer IDs
6. ✅ Clear warnings for rows at risk of duplication
7. ✅ Performance is acceptable for real-world data volumes

## Troubleshooting

### Issue: Duplicates still being created

**Check:**
- Does the CSV have any unique identifier (customer_number, internal_key, email, legacy_customer_id)?
- Is the customer_type set correctly for email matching? (Only works for 'business' and 'legacy')
- Are there whitespace issues in the identifiers?

### Issue: Validation is too slow

**Solution:**
- Consider adding database indexes on lookup fields
- Implement batch lookups instead of one-by-one
- Add caching for repeated lookups

### Issue: Email matching not working

**Check:**
- Is customer_type set to 'business' or 'legacy'?
- Email matching only works for these types to avoid false positives with walk-in customers

## Next Steps

After testing, consider:

1. Add database indexes for performance:
   - Index on `customer_number`
   - Index on `internal_key`
   - Index on `email`
   - Index on `legacy_customer_id`

2. Add transaction support for atomic imports

3. Add import history/audit trail

4. Create automated regression tests

5. Add monitoring/metrics for import operations
