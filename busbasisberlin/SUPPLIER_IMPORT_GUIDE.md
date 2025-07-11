# Enhanced Supplier Import System Guide

## Overview

This guide covers the enhanced supplier management system with separate netto/brutto pricing, variant support, and Notion-style admin interface.

## 🚀 New Features

### Database Schema Enhancements

- **Variant Support**: Multiple entries per supplier with names and descriptions
- **Separate Pricing**: `supplier_price_netto` and `supplier_price_brutto` fields
- **VAT Rates**: `supplier_vat_rate` field for tax calculations
- **Sorting**: `sort_order` field for drag & drop functionality
- **Favorites**: `is_favorite` field for quick access

### Admin Interface Improvements

- **Notion-Style Widget**: Hierarchical display with inline editing
- **16-Column Layout**: Complete field coverage including descriptions and VAT rates
- **Drag & Drop**: Reorder variants within supplier groups
- **Enhanced Actions**: Copy relationships, add variants, mark favorites

### Import Script Enhancements

- **Correct Price Parsing**: German number format (comma as decimal separator)
- **Enhanced Supplier Data**: Separate netto/brutto pricing from CSV
- **Meaningful Variants**: Auto-generated names based on manufacturer and product details
- **VAT Rate Import**: Automatic parsing of supplier VAT rates

## 📋 Step-by-Step Process

### 1. Clean Database (Start Fresh)

```bash
cd busbasisberlin
npx medusa exec ./src/scripts/cleanup-database.ts
```

This will:

- Remove all product-supplier relationships
- Delete all products and categories
- Clean up orphaned records
- Verify complete cleanup

### 2. Run Enhanced Import

```bash
npm run import-products
```

The enhanced import now:

- Uses `EK Netto` and `EK Brutto` for supplier pricing
- Uses `Std. VK Brutto` for customer selling prices
- Parses German price format correctly (20,97 → €20.97)
- Creates meaningful variant names
- Imports VAT rates from `USt. in %` column

### 3. Verify in Admin Panel

1. Navigate to any product in the admin panel
2. Check the **Suppliers** widget at the bottom
3. Verify you see:
   - Hierarchical supplier display
   - Separate Netto/Brutto price columns
   - VAT rate column
   - Variant names and descriptions
   - Drag & drop functionality

## 🎯 Widget Features

### Table Columns (16 total)

| Column | Field       | Type     | Description                |
| ------ | ----------- | -------- | -------------------------- |
| 1      | Drag        | Handle   | Reorder variants           |
| 2-3    | Variant     | Text     | Product variant name       |
| 4-5    | Description | Textarea | Variant description        |
| 6      | Netto €     | Number   | Supplier price without VAT |
| 7      | Brutto €    | Number   | Supplier price with VAT    |
| 8      | VAT %       | Number   | VAT rate (e.g., 19.0%)     |
| 9-10   | SKU         | Text     | Supplier part number       |
| 11     | Lead Time   | Number   | Days until delivery        |
| 12     | Stock       | Number   | Available quantity         |
| 13     | Primary     | Checkbox | Main supplier flag         |
| 14     | Favorite    | Star     | Quick access marker        |
| 15     | Notes       | Textarea | Additional information     |
| 16     | Actions     | Menu     | Copy/Delete options        |

### Inline Editing

- **Click any cell** to edit in-place
- **Enter** to save, **Escape** to cancel
- **Tab** to move between fields
- **No modals** - everything editable inline

### Actions

- **Add Variant**: Create multiple entries per supplier
- **Copy Relationship**: Duplicate with modifications
- **Delete**: Remove individual relationships
- **Drag & Drop**: Reorder variants within groups

## 🔧 CSV Field Mappings

### Pricing Fields

- `EK Netto` → `supplier_price_netto` (Supplier purchase price without VAT)
- `EK Brutto` → `supplier_price_brutto` (Supplier purchase price with VAT)
- `USt. in %` → `supplier_vat_rate` (VAT rate percentage)
- `Std. VK Brutto` → Product selling price (customer price)

### Supplier Fields

- `Lieferant` → Supplier company name
- `Hersteller` → Manufacturer (used for variant names)
- `Lieferanten-Art.Nr.` → Supplier SKU
- `Lieferanten Artikelname` → Supplier product name
- `Verkaufseinheit` → Sales unit (used for variant names)

### Additional Fields

- `Lieferanten Lieferzeit` → Lead time in days
- `Lieferantenbestand` → Supplier stock quantity
- `Mindestabnahme Lieferant` → Minimum order quantity
- `Ist Standardlieferant` → Primary supplier flag

## 🔍 Verification Steps

### 1. Check Database Schema

```bash
cd busbasisberlin
npx medusa db:migrate
```

### 2. Verify Price Parsing

Look for log entries like:

```
Price parsing: "20,97" -> "20.97" -> 20.97 -> 2097 cents (20.97€)
```

### 3. Check Widget Display

- Open any product in admin
- Verify all 16 columns are visible
- Test inline editing on different field types
- Try drag & drop reordering

### 4. Test Enhanced Features

- Add multiple variants for same supplier
- Mark suppliers as favorites
- Use copy functionality
- Test VAT rate calculations

## 🛠️ Troubleshooting

### Widget Not Showing New Fields

1. Clear browser cache
2. Restart Medusa development server
3. Check console for TypeScript errors

### Price Parsing Issues

1. Verify German number format in CSV (comma as decimal)
2. Check console logs for price parsing debug info
3. Ensure correct column names in CSV

### Missing Supplier Relationships

1. Verify supplier exists in database
2. Check supplier name matches exactly
3. Review import logs for relationship creation

### Database Migration Issues

1. Run `npx medusa db:migrate` again
2. Check migration files in supplier module
3. Verify database connection

## 🎉 Success Indicators

✅ **Database**: Migration20250103000000 executed successfully
✅ **Import**: Products show separate netto/brutto pricing
✅ **Widget**: 16-column layout with all fields visible
✅ **Functionality**: Inline editing and drag & drop working
✅ **Pricing**: German format parsed correctly (20,97 → €20.97)

The enhanced system transforms your basic supplier management into a professional, Notion-like interface with comprehensive pricing separation and variant support!
