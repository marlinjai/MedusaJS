# Manual Customer Module

Flexible customer management system for legacy customers, walk-in customers, and customers without complete information.

## Overview

The Manual Customer module provides a flexible customer management system designed to handle customers who may not have email addresses or complete information. It's particularly useful for managing legacy customers, walk-in customers, and customers imported from other systems.

## Features

### Core Functionality

- **Flexible Data Model**: All fields optional except ID (maximum flexibility)
- **Customer Numbering**: Automatic customer number generation
- **Customer Types**: Support for legacy, walk-in, and business customers
- **Core Customer Linking**: Link manual customers to Medusa core customers
- **Purchase History**: Track total purchases and spending
- **CSV Import**: Import customers from CSV files
- **Multiple Contact Methods**: Email, phone, fax, mobile
- **Address Management**: Flexible address storage

### Customer Types

- **legacy**: Customers from legacy systems
- **walk-in**: In-store customers
- **business**: Business customers

### Customer Linking

Manual customers can be linked to core Medusa customers:

- Email match
- Phone match
- Name match
- Manual linking

## Data Models

### ManualCustomer

```typescript
{
	id: string;
	customer_number: string | null; // Auto-generated
	internal_key: string | null;

	// Personal Information (all optional)
	salutation: string | null;
	title: string | null;
	first_name: string | null;
	last_name: string | null;
	company: string | null;
	company_addition: string | null;

	// Contact Information (all optional)
	email: string | null;
	phone: string | null;
	fax: string | null;
	mobile: string | null;
	website: string | null;

	// Address Information (all optional)
	street: string | null;
	address_addition: string | null;
	street_number: string | null;
	postal_code: string | null;
	city: string | null;
	country: string | null;
	state: string | null;

	// Business Information
	vat_id: string | null;
	tax_number: string | null;

	// Customer Type and Status
	customer_type: 'legacy' | 'walk-in' | 'business';
	customer_group: string | null;
	status: 'active' | 'inactive' | 'blocked';

	// Source Tracking
	source: 'csv-import' | 'manual-entry' | 'pos-system';
	import_reference: string | null;

	// Customer Linking
	core_customer_id: string | null;
	is_linked: boolean;
	linked_at: Date | null;
	linking_method: string | null;

	// Purchase History
	total_purchases: number; // default: 0
	total_spent: number; // default: 0 (in cents)
	last_purchase_date: Date | null;

	// Additional Fields
	notes: string | null;
	additional_info: string | null; // JSON string
	birthday: Date | null;
	ebay_name: string | null;
	language: string; // default: 'de'
	preferred_contact_method: string | null;

	// Legacy System References
	legacy_customer_id: string | null;
	legacy_system_reference: string | null;

	// Timestamps
	first_contact_date: Date | null;
	last_contact_date: Date | null;
}
```

## API Endpoints

### Admin Endpoints

- `GET /admin/manual-customers` - List manual customers
- `POST /admin/manual-customers` - Create manual customer
- `GET /admin/manual-customers/:id` - Get customer details
- `PUT /admin/manual-customers/:id` - Update customer
- `DELETE /admin/manual-customers/:id` - Delete customer
- `POST /admin/manual-customers/import` - Import from CSV

## Usage Examples

### Creating a Manual Customer

```typescript
const manualCustomerService = req.scope.resolve(MANUAL_CUSTOMER_MODULE);
const customer = await manualCustomerService.createManualCustomerWithNumber({
	first_name: 'John',
	last_name: 'Doe',
	phone: '+49 30 12345678',
	customer_type: 'walk-in',
});
```

### Generating Customer Number

```typescript
const customerNumber = await manualCustomerService.generateCustomerNumber();
// Returns: "KC-00001", "KC-00002", etc.
```

### Linking to Core Customer

```typescript
await manualCustomerService.linkToCoreCustomer(
	manualCustomerId,
	coreCustomerId,
	'email-match',
);
```

## Admin UI

The manual customer module includes admin UI with:

- Customer list with filtering
- Customer detail page with full editing
- Customer number display
- Linking to core customers
- Purchase history display

## CSV Import

The module supports CSV import with flexible column mapping:

- Maps common CSV columns to customer fields
- Handles missing data gracefully
- Supports various source formats

## Migration

Run migrations to create database tables:

```bash
npx medusa db:migrate
```

The module includes migrations for schema creation.

## Related Documentation

- See backend [README](../../README.md) for general setup instructions
