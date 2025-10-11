# Quick Start: Idempotent Import

## 🎉 Your Import Script is Now Fully Idempotent!

Re-run imports as many times as you need - no duplicates will be created!

---

## ⚡ Quick Usage

### Standard Import (Recommended)
```bash
cd busbasisberlin
npx tsx src/scripts/import-manual-customers.ts data/customers.csv
```

This will:
1. ✅ Automatically validate your CSV
2. ✅ Show what will be created vs updated
3. ✅ Warn about potential issues
4. ✅ Ask for confirmation
5. ✅ Import safely with idempotency

---

## 🔍 What Makes It Idempotent?

The script now checks for existing customers using:

1. **customer_number** (Priority 1)
2. **internal_key** (Priority 2)  
3. **legacy_customer_id** (Priority 3)
4. **email** (Priority 4, for business/legacy customers)

If ANY of these match an existing customer, it will **UPDATE** instead of creating a duplicate.

---

## ✅ What You'll See

### First Import
```
📊 Validation Results:
   Will create: 100 new customers
   Will update: 0 existing customers

✅ Idempotency Check: All records are new

📊 Results:
   - Imported: 100 new customers
   - Updated: 0 existing customers
```

### Second Import (Same File)
```
📊 Validation Results:
   Will create: 0 new customers
   Will update: 100 existing customers

✅ Idempotency Check: 100 existing customers will be updated

📊 Results:
   - Imported: 0 new customers
   - Updated: 100 existing customers ✅ NO DUPLICATES!
```

---

## 🚨 Important CSV Requirements

For best idempotency, ensure your CSV has at least ONE of these:
- ✅ `Kundennummer` (customer_number)
- ✅ `Interner Schlüssel` (internal_key)
- ✅ `E-Mail` (email) - for business/legacy customers
- ✅ Legacy customer ID

**⚠️ Warning:** Rows without ANY identifier will create duplicates on re-import.

---

## 🧪 Testing Your Import

### Option 1: Validation Only (No Changes)
```bash
# Using API directly
curl -X POST http://localhost:9000/admin/manual-customers/import \
  -H "Content-Type: application/json" \
  -d '{
    "csvData": [...],
    "fieldMapping": {...},
    "options": { "validate": true }
  }'
```

### Option 2: Dry-Run (Preview)
```bash
curl -X POST http://localhost:9000/admin/manual-customers/import \
  -H "Content-Type: application/json" \
  -d '{
    "csvData": [...],
    "fieldMapping": {...},
    "options": { "dryRun": true }
  }'
```

---

## 📋 Example CSV Format

### ✅ Good - Has customer_number
```csv
Kundennummer;Vorname;Nachname;E-Mail
CUST001;John;Doe;john@test.com
CUST002;Jane;Smith;jane@test.com
```
**Result:** Fully idempotent ✅

### ✅ Good - Has internal_key
```csv
Kundennummer;Interner Schlüssel;Vorname;Nachname
;KEY-001;John;Doe
;KEY-002;Jane;Smith
```
**Result:** Idempotent via internal_key ✅

### ⚠️ Warning - No unique identifiers
```csv
Kundennummer;Vorname;Nachname
;John;Doe
;Jane;Smith
```
**Result:** Will create duplicates on re-import ⚠️
**Fix:** Add customer_number, internal_key, or email

---

## 🎯 Common Scenarios

### Scenario 1: Updating Existing Customers
**Goal:** Update customer data without creating duplicates

**Solution:** Just re-import the CSV with updated data
```bash
npx tsx src/scripts/import-manual-customers.ts customers.csv
```
The script will detect existing customers and update them!

### Scenario 2: Adding New Customers to Existing Database
**Goal:** Add new customers without affecting existing ones

**Solution:** Same command! The script handles both:
```bash
npx tsx src/scripts/import-manual-customers.ts new-customers.csv
```
- Existing customers → Updated
- New customers → Created

### Scenario 3: Not Sure If Customers Exist?
**Goal:** Preview what will happen

**Solution:** The script shows this automatically during validation!
```
📊 Validation Results:
   Will create: 25 new customers
   Will update: 75 existing customers
```

---

## 🆘 Troubleshooting

### "Will create duplicates" warning
**Cause:** Row has no unique identifier
**Fix:** Add customer_number, internal_key, or email to CSV

### Email matching not working
**Cause:** Email matching only works for business/legacy customers
**Fix:** Ensure customer_type is 'business' or 'legacy'

### Import is slow
**Cause:** Large CSV file
**Solution:** Normal - the script checks for duplicates for each row
**Future:** Database indexes will speed this up

---

## 📚 More Information

- **Full Implementation Details:** See `IMPLEMENTATION_SUMMARY.md`
- **Testing Guide:** See `IDEMPOTENCY_TESTING_GUIDE.md`
- **Technical Analysis:** See `IDEMPOTENCY_ANALYSIS.md`

---

## ✨ Key Benefits

✅ **Safe Re-imports:** Run the same import multiple times
✅ **No Duplicates:** Existing customers are updated, not duplicated
✅ **Clear Feedback:** Know exactly what will happen before it happens
✅ **Multiple Identifiers:** Works even without customer_number
✅ **Automatic Validation:** Catches issues before importing
✅ **Production Ready:** Comprehensive error handling and logging

---

## 💡 Pro Tips

1. **Always review validation results** before confirming import
2. **Use dry-run mode** when testing new CSV files
3. **Include unique identifiers** in your CSV for best results
4. **Re-import is safe** - don't worry about running it twice
5. **Check warnings** - they highlight potential future issues

---

## 🎓 Remember

**The import is now idempotent, which means:**
- ✅ You can safely re-run imports
- ✅ Existing customers will be updated, not duplicated
- ✅ You'll see exactly what will happen before it happens
- ✅ Data quality is protected with validation

**Happy Importing! 🚀**
