/**
 * import/route.ts
 * Admin API route for importing manual customers from CSV
 * Handles CSV import with field mapping functionality
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { MANUAL_CUSTOMER_MODULE } from '../../../../modules/manual-customer';
import ManualCustomerService from '../../../../modules/manual-customer/service';

// POST /admin/manual-customers/import - Import manual customers from CSV
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
	const manualCustomerService: ManualCustomerService = req.scope.resolve(
		MANUAL_CUSTOMER_MODULE,
	);

	try {
		const { csvData, fieldMapping, options } = req.body as {
			csvData: any[];
			fieldMapping: Record<string, string>;
			options?: {
				dryRun?: boolean;
				strictMode?: boolean;
				validate?: boolean;
			};
		};

		console.log(
			`Import request received: ${csvData?.length || 0} rows, options:`,
			options,
		);

		// Validate input
		if (!csvData || !Array.isArray(csvData)) {
			console.error('Invalid CSV data:', typeof csvData);
			return res.status(400).json({
				error: 'Invalid CSV data',
				message: 'csvData must be an array of objects',
			});
		}

		if (!fieldMapping || typeof fieldMapping !== 'object') {
			console.error('Invalid field mapping:', typeof fieldMapping);
			return res.status(400).json({
				error: 'Invalid field mapping',
				message:
					'fieldMapping must be an object mapping CSV columns to customer fields',
			});
		}

		// Log first few rows for debugging
		console.log('Sample CSV data (first 2 rows):', csvData.slice(0, 2));

		// If validate-only mode, run validation and return
		if (options?.validate) {
			console.log('Running validation only...');
			const validation = await manualCustomerService.validateImport(
				csvData,
				fieldMapping,
			);

			return res.json({
				validation,
				message: validation.valid
					? 'Validation passed. Ready to import.'
					: 'Validation failed. Please fix errors before importing.',
			});
		}

		// Perform the import (with optional dry-run)
		const results = await manualCustomerService.importFromCSV(
			csvData,
			fieldMapping,
			options,
		);

		console.log('Import completed successfully:', results);

		// Build response message
		let message = options?.dryRun
			? `Dry-run completed. Would import ${results.imported} customers and update ${results.updated} existing customers.`
			: `Import completed. ${results.imported} customers imported, ${results.updated} updated, ${results.skipped} skipped.`;

		if (results.warnings && results.warnings.length > 0) {
			message += ` ${results.warnings.length} warnings.`;
		}

		res.json({
			results,
			message,
		});
	} catch (error) {
		console.error('Critical error during import:', error);
		console.error(
			'Error stack:',
			error instanceof Error ? error.stack : 'No stack available',
		);

		res.status(500).json({
			code: 'import_error',
			type: 'import_error',
			message:
				error instanceof Error
					? error.message
					: 'Unknown error occurred during import',
			details: error instanceof Error ? error.stack : undefined,
		});
	}
};

// GET /admin/manual-customers/import/template - Get field mapping template
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
	try {
		// Return available fields for mapping
		const availableFields = {
			customer_number: 'Customer Number (Kundennummer)',
			internal_key: 'Internal Key (Interner Schlüssel)',
			salutation: 'Salutation (Anrede)',
			title: 'Title (Titel)',
			first_name: 'First Name (Vorname)',
			last_name: 'Last Name (Nachname)',
			company: 'Company (Firma)',
			company_addition: 'Company Addition (Firmenzusatz)',
			email: 'Email (E-Mail)',
			phone: 'Phone (Tel)',
			fax: 'Fax (Fax)',
			mobile: 'Mobile (Mobil)',
			website: 'Website (Homepage/WWW)',
			street: 'Street (Strasse)',
			address_addition: 'Address Addition (Adresszusatz)',
			street_number: 'Street Number',
			postal_code: 'Postal Code (PLZ)',
			city: 'City (Ort)',
			country: 'Country (Land)',
			state: 'State (Bundesland)',
			vat_id: 'VAT ID (Ust-ID)',
			tax_number: 'Tax Number (Steuernummer)',
			customer_type: 'Customer Type (legacy, walk-in, business)',
			customer_group: 'Customer Group (Kundengruppe)',
			status: 'Status (active, inactive, blocked)',
			source: 'Source',
			notes: 'Notes',
			birthday: 'Birthday (Geburtstag)',
			ebay_name: 'eBay Name (eBay-Name)',
			language: 'Language (Sprache)',
			preferred_contact_method: 'Preferred Contact Method',
			legacy_customer_id: 'Legacy Customer ID',
			legacy_system_reference: 'Legacy System Reference',
		};

		const sampleMapping = {
			Kundennummer: 'customer_number',
			'Interner Schlüssel': 'internal_key',
			Anrede: 'salutation',
			Titel: 'title',
			Vorname: 'first_name',
			Nachname: 'last_name',
			Firma: 'company',
			Firmenzusatz: 'company_addition',
			'E-Mail': 'email',
			Tel: 'phone',
			Fax: 'fax',
			Mobil: 'mobile',
			'Homepage (WWW)': 'website',
			Strasse: 'street',
			Adresszusatz: 'address_addition',
			PLZ: 'postal_code',
			Ort: 'city',
			Bundesland: 'state',
			Land: 'country',
			'Ust-ID': 'vat_id',
			Steuernummer: 'tax_number',
			Kundengruppe: 'customer_group',
			Sprache: 'language',
			Geburtstag: 'birthday',
			'eBay-Name': 'ebay_name',
		};

		res.json({
			availableFields,
			sampleMapping,
			message: 'Field mapping template and available fields',
		});
	} catch (error) {
		console.error('Error getting import template:', error);
		res.status(500).json({
			error: 'Failed to get import template',
			message: error instanceof Error ? error.message : 'Unknown error',
		});
	}
};
