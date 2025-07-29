/**
 * route.ts
 * Admin API routes for individual supplier operations
 * Updated to work with the new relational structure (ContactPhone, ContactEmail models)
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { SUPPLIER_MODULE } from '../../../../modules/supplier';
import { Contact } from '../../../../modules/supplier/models/contact';
import { SupplierAddress } from '../../../../modules/supplier/models/supplier-address';
import SupplierModuleService from '../../../../modules/supplier/service';

interface ContactData extends Partial<Contact> {
	phones?: Array<{ number?: string; label?: string }>;
	emails?: Array<{ email?: string; label?: string }>;
}

interface UpdateSupplierData {
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

// GET /admin/suppliers/[id] - Get specific supplier
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
	const supplierService: SupplierModuleService =
		req.scope.resolve(SUPPLIER_MODULE);
	const { id } = req.params;

	try {
		// Use the auto-generated retrieveSupplier method
		const supplier = await supplierService.retrieveSupplier(id);

		if (!supplier) {
			return res.status(404).json({
				error: 'Supplier not found',
				message: `Supplier with ID ${id} does not exist`,
			});
		}

		res.json({
			supplier,
		});
	} catch (error) {
		console.error('Error retrieving supplier:', error);
		res.status(500).json({
			error: 'Failed to retrieve supplier',
			message: error.message,
		});
	}
};

// PUT /admin/suppliers/[id] - Update specific supplier with full relational structure
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
	const supplierService: SupplierModuleService =
		req.scope.resolve(SUPPLIER_MODULE);
	const { id } = req.params;

	try {
		const data = req.body as UpdateSupplierData;

		// Validate required fields
		if (data.company !== undefined && !data.company) {
			return res.status(400).json({
				error: 'Validation error',
				message: 'Company name cannot be empty',
			});
		}

		// Extract supplier data (remove contacts/addresses)
		const { contacts, addresses, ...supplierData } = data;

		// Update the supplier first
		const updatePayload = { id, ...supplierData };
		const updatedSuppliers = await supplierService.updateSuppliers([
			updatePayload,
		]);

		if (!updatedSuppliers || updatedSuppliers.length === 0) {
			return res.status(404).json({
				error: 'Supplier not found',
				message: `Supplier with ID ${id} does not exist`,
			});
		}

		// Handle contacts update - for simplicity, we'll delete all existing and recreate
		if (contacts) {
			// Delete existing contacts and their related phones/emails
			const existingContacts = await supplierService.listContacts({
				supplier_id: id,
			});
			for (const contact of existingContacts) {
				// Delete phones for this contact
				const existingPhones = await supplierService.listContactPhones({
					contact_id: contact.id,
				});
				for (const phone of existingPhones) {
					await supplierService.deleteContactPhones(phone.id);
				}

				// Delete emails for this contact
				const existingEmails = await supplierService.listContactEmails({
					contact_id: contact.id,
				});
				for (const email of existingEmails) {
					await supplierService.deleteContactEmails(email.id);
				}

				// Delete the contact
				await supplierService.deleteContacts(contact.id);
			}

			// Create new contacts and their related phones/emails
			for (const contactData of contacts) {
				const { phones, emails, ...contactFields } = contactData;

				// Create the contact
				const createdContacts = await supplierService.createContacts([
					{
						...contactFields,
						supplier_id: id,
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

		// Handle addresses update - for simplicity, we'll delete all existing and recreate
		if (addresses) {
			// Delete existing addresses
			const existingAddresses = await supplierService.listSupplierAddresses({
				supplier_id: id,
			});
			for (const address of existingAddresses) {
				await supplierService.deleteSupplierAddresses(address.id);
			}

			// Create new addresses
			for (const addressData of addresses) {
				await supplierService.createSupplierAddresses([
					{
						...addressData,
						supplier_id: id,
					},
				]);
			}
		}

		// Get the complete supplier with details
		const supplierWithDetails =
			await supplierService.getSupplierWithDetails(id);

		res.json({
			supplier: supplierWithDetails,
		});
	} catch (error) {
		console.error('Error updating supplier:', error);
		res.status(500).json({
			error: 'Failed to update supplier',
			message: error.message,
		});
	}
};

// DELETE /admin/suppliers/[id] - Delete specific supplier
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
	const supplierService: SupplierModuleService =
		req.scope.resolve(SUPPLIER_MODULE);
	const { id } = req.params;

	try {
		// First, delete all related contacts and their phones/emails
		const existingContacts = await supplierService.listContacts({
			supplier_id: id,
		});
		for (const contact of existingContacts) {
			// Delete phones for this contact
			const existingPhones = await supplierService.listContactPhones({
				contact_id: contact.id,
			});
			for (const phone of existingPhones) {
				await supplierService.deleteContactPhones(phone.id);
			}

			// Delete emails for this contact
			const existingEmails = await supplierService.listContactEmails({
				contact_id: contact.id,
			});
			for (const email of existingEmails) {
				await supplierService.deleteContactEmails(email.id);
			}

			// Delete the contact
			await supplierService.deleteContacts(contact.id);
		}

		// Delete all related addresses
		const existingAddresses = await supplierService.listSupplierAddresses({
			supplier_id: id,
		});
		for (const address of existingAddresses) {
			await supplierService.deleteSupplierAddresses(address.id);
		}

		// Delete any product-supplier relationships
		const existingProductRelationships =
			await supplierService.listProductSuppliers({ supplier_id: id });
		for (const relationship of existingProductRelationships) {
			await supplierService.deleteProductSuppliers(relationship.id);
		}

		// Finally, delete the supplier itself
		await supplierService.deleteSuppliers(id);

		res.status(204).send();
	} catch (error) {
		console.error('Error deleting supplier:', error);
		res.status(500).json({
			error: 'Failed to delete supplier',
			message: error.message,
		});
	}
};
