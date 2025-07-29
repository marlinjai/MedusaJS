/**
 * manual-customer.ts
 * Manual customer model for legacy customers and walk-in customers
 * Handles customers who don't have email addresses or complete information
 */
import { InferTypeOf } from '@medusajs/framework/types';
import { model } from '@medusajs/framework/utils';

const manualCustomer = model.define('manual_customer', {
	id: model.id().primaryKey(),

	// Basic identification - only UUID is required
	// We use a separate customer_number for tracking
	customer_number: model.text().nullable(), // Internal customer number for tracking
	internal_key: model.text().nullable(), // Interner Schlüssel

	// Personal information - all optional for maximum flexibility
	salutation: model.text().nullable(), // Anrede (Mr., Mrs., Dr., etc.)
	title: model.text().nullable(), // Titel (academic or professional titles)
	first_name: model.text().nullable(),
	last_name: model.text().nullable(),
	company: model.text().nullable(), // For business customers
	company_addition: model.text().nullable(), // Firmenzusatz

	// Contact information - all optional
	email: model.text().nullable(),
	phone: model.text().nullable(),
	fax: model.text().nullable(),
	mobile: model.text().nullable(),
	website: model.text().nullable(), // Homepage (WWW)

	// Address information - all optional and stored as text for flexibility
	street: model.text().nullable(),
	address_addition: model.text().nullable(), // Adresszusatz
	street_number: model.text().nullable(),
	postal_code: model.text().nullable(),
	city: model.text().nullable(),
	country: model.text().nullable(),
	state: model.text().nullable(),

	// Business information - optional
	vat_id: model.text().nullable(),
	tax_number: model.text().nullable(),

	// Customer type and status
	customer_type: model.text().default('walk-in'), // 'legacy', 'walk-in', 'business'
	customer_group: model.text().nullable(), // Kundengruppe
	status: model.text().default('active'), // 'active', 'inactive', 'blocked'

	// Source tracking
	source: model.text().nullable(), // 'csv-import', 'manual-entry', 'pos-system'
	import_reference: model.text().nullable(), // Reference to original import (e.g., CSV row)

	// Customer linking - connection to core Medusa customers
	core_customer_id: model.text().nullable(), // Foreign key to core customer when linked
	is_linked: model.boolean().default(false), // Whether this manual customer is linked to a core customer
	linked_at: model.dateTime().nullable(), // When the linking occurred
	linking_method: model.text().nullable(), // 'email-match', 'manual-link', 'phone-match', 'name-match'

	// Additional flexible data
	notes: model.text().nullable(), // Free text notes
	additional_info: model.text().nullable(), // JSON string for any additional data
	birthday: model.dateTime().nullable(), // Geburtstag
	ebay_name: model.text().nullable(), // eBay-Name

	// Preferences
	language: model.text().default('de'),
	preferred_contact_method: model.text().nullable(), // 'email', 'phone', 'mail'

	// Purchase history tracking
	total_purchases: model.number().default(0), // Total number of purchases
	total_spent: model.number().default(0), // Total amount spent in cents
	last_purchase_date: model.dateTime().nullable(),

	// Legacy customer specific fields
	legacy_customer_id: model.text().nullable(), // Original customer ID from legacy system
	legacy_system_reference: model.text().nullable(), // Reference to original system

	// Timestamps
	first_contact_date: model.dateTime().nullable(), // When customer first contacted us
	last_contact_date: model.dateTime().nullable(), // Last interaction date
});

export type ManualCustomer = InferTypeOf<typeof manualCustomer>;
export default manualCustomer;
