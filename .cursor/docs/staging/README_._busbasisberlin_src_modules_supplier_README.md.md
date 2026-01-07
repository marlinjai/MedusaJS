# Supplier Module

Complete supplier management system with contact information, addresses, product relationships, and pricing data.

## Overview

The Supplier module provides comprehensive supplier management functionality, including supplier information, contacts, addresses, and product-supplier relationships with pricing and lead time data.

## Features

### Core Functionality

- **Supplier Management**: Complete CRUD operations for suppliers
- **Contact Management**: Multiple contacts per supplier with emails and phones
- **Address Management**: Multiple addresses per supplier
- **Product Relationships**: Many-to-many relationship between products and suppliers
- **Pricing Data**: Net and gross pricing per supplier-product relationship
- **Lead Time Tracking**: Supplier-specific lead times and delivery times
- **Primary Supplier**: Mark primary supplier per product
- **CSV Import**: Import suppliers from CSV files (JTL VAP format compatible)

### Supplier Information

- Company details (name, addition, VAT ID)
- Bank information (IBAN, BIC, account details)
- Business status and language
- Lead time in days
- Website and notes

### Product-Supplier Relationships

- Multiple entries per supplier (e.g., different oil grades)
- Variant names and descriptions
- Net and gross pricing (supplier prices)
- Supplier SKU and product names
- VAT rates and currency
- Lead times and delivery times
- Minimum order quantities
- Stock information from supplier
- Merge stock capability

## Data Models

### Supplier

```typescript
{
	id: string;
	supplier_number: string | null;
	customer_number: string | null;
	internal_key: string | null;
	company: string;
	company_addition: string | null;
	vat_id: string | null;
	status: string; // default: 'active'
	is_active: boolean; // default: true
	language: string; // default: 'Deutsch'
	lead_time: number | null; // in days
	website: string | null;
	note: string | null;
	// Bank details
	bank_name: string | null;
	bank_code: string | null;
	account_number: string | null;
	account_holder: string | null;
	iban: string | null;
	bic: string | null;
}
```

### Contact

```typescript
{
	id: string;
	supplier_id: string;
	first_name: string | null;
	last_name: string | null;
	position: string | null;
	department: string | null;
	// ... contact details
}
```

### ContactEmail & ContactPhone

Separate models for email addresses and phone numbers linked to contacts.

### SupplierAddress

```typescript
{
	id: string;
	supplier_id: string;
	address_type: string; // 'billing', 'shipping', 'headquarters'
	street: string | null;
	city: string | null;
	postal_code: string | null;
	country: string | null;
	// ... address details
}
```

### ProductSupplier

```typescript
{
	id: string;
	product_id: string;
	supplier_id: string;
	variant_name: string | null; // e.g., "5W-30"
	variant_description: string | null;
	is_primary: boolean; // default: false
	supplier_price_netto: number | null; // in euros
	supplier_price_brutto: number | null; // in euros
	supplier_sku: string | null;
	supplier_product_name: string | null;
	supplier_vat_rate: number | null;
	supplier_currency: string; // default: 'EUR'
	supplier_lead_time: number | null; // in days
	supplier_delivery_time: number | null; // in days
	supplier_min_order_qty: number | null;
	supplier_stock: number | null;
	// ... other fields
}
```

## API Endpoints

### Admin Endpoints

- `GET /admin/suppliers` - List suppliers
- `POST /admin/suppliers` - Create supplier
- `GET /admin/suppliers/:id` - Get supplier details
- `PUT /admin/suppliers/:id` - Update supplier
- `DELETE /admin/suppliers/:id` - Delete supplier

## Usage Examples

### Creating a Supplier

```typescript
const supplierService = req.scope.resolve(SUPPLIER_MODULE);
const supplier = await supplierService.createSuppliers({
	company: 'ACME Supplies',
	supplier_number: 'SUP-001',
	vat_id: 'DE123456789',
	is_active: true,
});
```

### Importing from CSV

```typescript
const supplierService = req.scope.resolve(SUPPLIER_MODULE);
const suppliers = await supplierService.importFromCsv(csvData);
```

### Getting Product Suppliers

```typescript
const supplierService = req.scope.resolve(SUPPLIER_MODULE);
const relationships = await supplierService.getProductSuppliers(productId);
```

## Admin UI

The supplier module includes admin UI with:

- Supplier list with filtering
- Supplier detail page with full editing
- Contact management
- Address management
- Product-supplier relationship management

## CSV Import Format

The module supports CSV import compatible with JTL VAP system export format:

- Lieferantennummer (Supplier Number)
- Firma (Company)
- UstID (VAT ID)
- Status
- Sprache (Language)
- Lieferzeit (Lead Time)
- Bank details (IBAN, BIC, etc.)
- Contact information
- Address information

## Migration

Run migrations to create database tables:

```bash
npx medusa db:migrate
```

The module includes multiple migrations for schema evolution.

## Related Documentation

- See backend [README](../../README.md) for general setup instructions
