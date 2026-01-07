/**
 * route.ts
 * Admin API routes for supplier management
 * Updated to work with the new relational structure (ContactPhone, ContactEmail models)
 * Includes Zod validation for input validation and type safety
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { z } from 'zod';

import { SUPPLIER_MODULE } from '../../../modules/supplier';
import { Contact } from '../../../modules/supplier/models/contact';
import { SupplierAddress } from '../../../modules/supplier/models/supplier-address';
import SupplierModuleService from '../../../modules/supplier/service';

// Zod validation schemas
const listSuppliersSchema = z.object({
	search: z.string().optional(),
	limit: z.coerce.number().min(1).max(250).default(50),
	offset: z.coerce.number().min(0).default(0),
	sort_by: z.string().optional(),
	sort_direction: z.enum(['asc', 'desc']).optional(),
	withDetails: z.enum(['true', 'false']).optional(),
});

const contactPhoneSchema = z.object({
	number: z.string().optional(),
	label: z.string().optional(),
});

const contactEmailSchema = z.object({
	email: z.string().email().optional(),
	label: z.string().optional(),
});

const contactSchema = z.object({
	salutation: z.string().optional(),
	first_name: z.string().optional(),
	last_name: z.string().optional(),
	position: z.string().optional(),
	department: z.string().optional(),
	phones: z.array(contactPhoneSchema).optional(),
	emails: z.array(contactEmailSchema).optional(),
});

const addressSchema = z.object({
	label: z.string().optional(),
	company_addition: z.string().optional(),
	street: z.string().optional(),
	postal_code: z.string().optional(),
	city: z.string().optional(),
	country_name: z.string().optional(),
	phone: z.string().optional(),
	fax: z.string().optional(),
	email: z.string().email().optional(),
});

const createSupplierSchema = z.object({
	// Required fields
	company: z.string().min(1, 'Company name is required'),

	// Optional core fields
	company_addition: z.string().optional(),
	supplier_number: z.string().optional(),
	customer_number: z.string().optional(),
	internal_key: z.string().optional(),
	website: z.string().url().optional().or(z.literal('')),
	vat_id: z.string().optional(),
	status: z.string().optional(),
	is_active: z.boolean().optional(),
	language: z.string().optional(),
	lead_time: z.number().min(0).optional(),

	// Bank information
	bank_name: z.string().optional(),
	bank_code: z.string().optional(),
	account_number: z.string().optional(),
	account_holder: z.string().optional(),
	iban: z.string().optional(),
	bic: z.string().optional(),
	note: z.string().optional(),

	// Related data
	contacts: z.array(contactSchema).optional(),
	addresses: z.array(addressSchema).optional(),
});

interface ContactData extends Partial<Contact> {
	phones?: Array<{ number?: string; label?: string }>;
	emails?: Array<{ email?: string; label?: string }>;
}

interface CreateSupplierData {
	// Core supplier fields
	company: string;
	company_addition?: string;
	supplier_number?: string;
	customer_number?: string;
	internal_key?: string;
	website?: string;
	vat_id?: string;
	status?: string;
	is_active?: boolean;
	language?: string;
	lead_time?: number;
	bank_name?: string;
	bank_code?: string;
	account_number?: string;
	account_holder?: string;
	iban?: string;
	bic?: string;
	note?: string;

	// Related data
	contacts?: ContactData[];
	addresses?: Partial<SupplierAddress>[];
}

// GET /admin/suppliers - List all suppliers
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
	const supplierService: SupplierModuleService =
		req.scope.resolve(SUPPLIER_MODULE);

	try {
		// Validate query parameters
		const params = listSuppliersSchema.parse(req.query);

		// Check if we want suppliers with details (new optimized endpoint)
		const withDetails = params.withDetails === 'true';

		if (withDetails) {
			// Get ALL suppliers first to calculate accurate stats
			const allSuppliers = await supplierService.listSuppliers();

			// Calculate total statistics from all suppliers
			const stats = {
				total: allSuppliers.length,
				active: allSuppliers.filter(s => s.is_active).length,
				inactive: allSuppliers.filter(s => !s.is_active).length,
				withVatId: allSuppliers.filter(s => s.vat_id).length,
				withBankInfo: allSuppliers.filter(s => s.bank_name || s.iban).length,
				// These will be calculated from paginated results
				withContacts: 0,
				withAddresses: 0,
			};

			// Apply pagination to supplier list
			const startIndex = params.offset;
			const endIndex = startIndex + params.limit;
			const paginatedSuppliers = allSuppliers.slice(startIndex, endIndex);

			// Get details only for paginated suppliers (not all)
			const suppliersWithDetails = await Promise.all(
				paginatedSuppliers.map(async supplier => {
					try {
						return await supplierService.getSupplierWithDetails(supplier.id);
					} catch (error) {
						console.error(
							`Error fetching details for supplier ${supplier.id}:`,
							error,
						);
						// Return basic supplier data if details fetch fails
						return {
							...supplier,
							contacts: [],
							addresses: [],
						};
					}
				}),
			);

			// Update stats with paginated results
			stats.withContacts = suppliersWithDetails.filter(
				s => s.contacts && s.contacts.length > 0,
			).length;
			stats.withAddresses = suppliersWithDetails.filter(
				s => s.addresses && s.addresses.length > 0,
			).length;

			res.json({
				suppliers: suppliersWithDetails,
				stats,
				count: suppliersWithDetails.length,
				offset: params.offset,
				limit: params.limit,
			});
		} else {
			// Original behavior - return basic supplier list with pagination
			const allSuppliers = await supplierService.listSuppliers();

			// Apply pagination
			const startIndex = params.offset;
			const endIndex = startIndex + params.limit;
			const paginatedSuppliers = allSuppliers.slice(startIndex, endIndex);

			res.json({
				suppliers: paginatedSuppliers,
				count: paginatedSuppliers.length,
				offset: params.offset,
				limit: params.limit,
				total: allSuppliers.length,
			});
		}
	} catch (error) {
		// Handle Zod validation errors
		if (error instanceof z.ZodError) {
			return res.status(400).json({
				error: 'Validation error',
				details: error.errors,
			});
		}

		console.error('Error fetching suppliers:', error);
		res.status(500).json({
			error: 'Failed to fetch suppliers',
			message: error.message,
		});
	}
};

// POST /admin/suppliers - Create a new supplier with full relational structure
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
	const supplierService: SupplierModuleService =
		req.scope.resolve(SUPPLIER_MODULE);

	try {
		// Validate request body with Zod
		const data = createSupplierSchema.parse(req.body);
		console.log('Validated supplier data:', JSON.stringify(data, null, 2));

		// Extract supplier data (remove contacts/addresses)
		const { contacts, addresses, ...supplierData } = data;
		console.log(
			'Supplier data to create:',
			JSON.stringify(supplierData, null, 2),
		);

		// Create the supplier first
		const createdSuppliers = await supplierService.createSuppliers([
			supplierData,
		]);
		console.log('Created suppliers:', createdSuppliers);

		if (!createdSuppliers || createdSuppliers.length === 0) {
			return res.status(500).json({ error: 'Supplier creation failed' });
		}

		const createdSupplier = createdSuppliers[0];
		console.log('Created supplier ID:', createdSupplier.id);

		// Create contacts and their related phones/emails
		if (contacts && contacts.length > 0) {
			for (const contactData of contacts) {
				const { phones, emails, ...contactFields } = contactData;

				// Create the contact
				const createdContacts = await supplierService.createContacts([
					{
						...contactFields,
						supplier_id: createdSupplier.id,
					},
				]);

				if (createdContacts && createdContacts.length > 0) {
					const createdContact = createdContacts[0];

					// Create phone numbers for this contact
					if (phones && phones.length > 0) {
						for (const phone of phones) {
							if (phone.number) {
								await supplierService.createContactPhones([
									{
										contact_id: createdContact.id,
										number: phone.number,
										label: phone.label || undefined,
									},
								]);
							}
						}
					}

					// Create email addresses for this contact
					if (emails && emails.length > 0) {
						for (const email of emails) {
							if (email.email) {
								await supplierService.createContactEmails([
									{
										contact_id: createdContact.id,
										email: email.email,
										label: email.label || undefined,
									},
								]);
							}
						}
					}
				}
			}
		}

		// Create addresses
		if (addresses && addresses.length > 0) {
			for (const addressData of addresses) {
				await supplierService.createSupplierAddresses([
					{
						...addressData,
						supplier_id: createdSupplier.id,
					},
				]);
			}
		}

		// Get the complete supplier with details
		const supplierWithDetails = await supplierService.getSupplierWithDetails(
			createdSupplier.id,
		);

		res.status(201).json({
			supplier: supplierWithDetails,
		});
	} catch (error) {
		// Handle Zod validation errors
		if (error instanceof z.ZodError) {
			return res.status(400).json({
				error: 'Validation error',
				details: error.errors,
			});
		}

		console.error('Error creating supplier:', error);
		res.status(500).json({
			error: 'Failed to create supplier',
			message: error.message,
		});
	}
};
