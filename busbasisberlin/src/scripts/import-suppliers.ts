import { ExecArgs } from '@medusajs/framework/types';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

// Helper to safely get a field or null
const safe = (row: any, key: string) =>
	row[key] && row[key].trim() !== '' ? row[key].trim() : null;

// Helper to split multiple emails/phones
const splitMulti = (val: string | null | undefined) =>
	val
		? val
				.split(/[;,]/)
				.map((s: string) => s.trim())
				.filter(Boolean)
		: [];

export default async function importSuppliers({ container, args }: ExecArgs) {
	const csvPath =
		args[0] ||
		path.join(
			__dirname,
			'../../../data/JTL-Export-Lieferantendaten-02052025.csv',
		);
	if (!fs.existsSync(csvPath)) {
		console.error('CSV file not found:', csvPath);
		return;
	}

	const supplierService = container.resolve('supplier');
	const csvContent = fs.readFileSync(csvPath, 'utf-8');
	const records = parse(csvContent, {
		columns: true,
		delimiter: ';',
		skip_empty_lines: true,
	});

	console.log(`Found ${records.length} suppliers to import/update...`);

	let created = 0;
	let updated = 0;
	let failed = 0;
	const errors: string[] = [];

	for (const [index, row] of records.entries()) {
		try {
			const companyName = safe(row, 'Firma') || `Unknown Company ${index + 1}`;
			console.log(
				`\nProcessing supplier ${index + 1}/${records.length}: ${companyName}`,
			);

			// 1. Check if supplier already exists
			const existingSuppliers = await supplierService.listSuppliers();
			let existingSupplier = existingSuppliers.find(
				s =>
					s.company === companyName ||
					(safe(row, 'Lieferantennummer') &&
						s.supplier_number === safe(row, 'Lieferantennummer')),
			);

			let supplier;
			if (existingSupplier) {
				console.log(`  ↻ Found existing supplier: ${existingSupplier.company}`);

				// Update existing supplier with any missing data
				const updateData = {
					id: existingSupplier.id,
					// Only update fields that are currently null/empty and we have data for
					company_addition:
						existingSupplier.company_addition || safe(row, 'Firmenzusatz'),
					supplier_number:
						existingSupplier.supplier_number || safe(row, 'Lieferantennummer'),
					customer_number:
						existingSupplier.customer_number || safe(row, 'Eigene Kd-Nr'),
					internal_key:
						existingSupplier.internal_key || safe(row, 'Interner Schlüssel'),
					vat_id: existingSupplier.vat_id || safe(row, 'UstID'),
					status: existingSupplier.status || safe(row, 'Status') || 'active',
					is_active:
						existingSupplier.is_active !== undefined
							? existingSupplier.is_active
							: safe(row, 'Aktiv') === 'Y',
					language:
						existingSupplier.language || safe(row, 'Sprache') || 'Deutsch',
					lead_time:
						existingSupplier.lead_time ||
						(safe(row, 'Lieferzeit')
							? parseInt(safe(row, 'Lieferzeit')!)
							: null),
					website: existingSupplier.website || safe(row, 'WWW'),
					note: existingSupplier.note || safe(row, 'Anmerkung'),
					bank_name: existingSupplier.bank_name || safe(row, 'BankName'),
					bank_code: existingSupplier.bank_code || safe(row, 'BLZ'),
					account_number:
						existingSupplier.account_number || safe(row, 'KontoNr'),
					account_holder:
						existingSupplier.account_holder || safe(row, 'Inhaber'),
					iban: existingSupplier.iban || safe(row, 'IBAN'),
					bic: existingSupplier.bic || safe(row, 'BIC'),
				};

				await supplierService.updateSuppliers([updateData]);
				supplier = { ...existingSupplier, ...updateData };
				console.log(`  ✓ Updated supplier: ${supplier.company}`);
				updated++;
			} else {
				// Create new supplier
				const supplierData = {
					company: companyName,
					company_addition: safe(row, 'Firmenzusatz'),
					supplier_number: safe(row, 'Lieferantennummer'),
					customer_number: safe(row, 'Eigene Kd-Nr'),
					internal_key: safe(row, 'Interner Schlüssel'),
					vat_id: safe(row, 'UstID'),
					status: safe(row, 'Status') || 'active',
					is_active: safe(row, 'Aktiv') === 'Y',
					language: safe(row, 'Sprache') || 'Deutsch',
					lead_time: safe(row, 'Lieferzeit')
						? parseInt(safe(row, 'Lieferzeit')!)
						: null,
					website: safe(row, 'WWW'),
					note: safe(row, 'Anmerkung'),
					bank_name: safe(row, 'BankName'),
					bank_code: safe(row, 'BLZ'),
					account_number: safe(row, 'KontoNr'),
					account_holder: safe(row, 'Inhaber'),
					iban: safe(row, 'IBAN'),
					bic: safe(row, 'BIC'),
				};

				const createdSuppliers = await supplierService.createSuppliers([
					supplierData,
				]);
				supplier = createdSuppliers[0];
				console.log(`  ✓ Created new supplier: ${supplier.company}`);
				created++;
			}

			// 2. Handle contacts - check if contact already exists
			const hasContactData =
				safe(row, 'Anrede') ||
				safe(row, 'Vorname') ||
				safe(row, 'Nachname') ||
				safe(row, '1. Telefonnummer') ||
				safe(row, 'Email');

			if (hasContactData) {
				const existingContacts = await supplierService.listContacts({
					supplier_id: supplier.id,
				});

				// Check if we already have a main contact with the same name
				const existingMainContact = existingContacts.find(
					c =>
						c.is_main_contact &&
						c.first_name === safe(row, 'Vorname') &&
						c.last_name === safe(row, 'Nachname'),
				);

				let contact;
				if (existingMainContact) {
					console.log(
						`    ↻ Found existing contact: ${existingMainContact.first_name} ${existingMainContact.last_name}`,
					);
					contact = existingMainContact;
				} else if (existingContacts.length === 0) {
					// Only create contact if no contacts exist yet
					const contactData = {
						supplier_id: supplier.id,
						salutation: safe(row, 'Anrede'),
						first_name: safe(row, 'Vorname'),
						last_name: safe(row, 'Nachname'),
						department: null,
						is_main_contact: true,
						contact_type: 'main',
						is_active: true,
					};

					const createdContacts = await supplierService.createContacts([
						contactData,
					]);
					contact = createdContacts[0];
					console.log(
						`    ✓ Created contact: ${contact.first_name} ${contact.last_name}`,
					);
				} else {
					console.log(
						`    ⚠ Skipping contact creation - contacts already exist`,
					);
					contact = existingContacts[0]; // Use first existing contact for phones/emails
				}

				if (contact) {
					// 3. Add phone numbers (only if they don't already exist)
					const existingPhones = await supplierService.listContactPhones({
						contact_id: contact.id,
					});
					const phoneNumbers = [
						{ number: safe(row, '1. Telefonnummer'), label: 'Primär' },
						{ number: safe(row, '2. Telefonnummer'), label: 'Sekundär' },
						{ number: safe(row, 'Tel Mobil'), label: 'Mobil' },
						{ number: safe(row, 'Fax'), label: 'Fax' },
					].filter(phone => phone.number);

					for (const phone of phoneNumbers) {
						const phoneExists = existingPhones.some(
							p => p.number === phone.number,
						);
						if (!phoneExists) {
							await supplierService.createContactPhones([
								{
									contact_id: contact.id,
									number: phone.number!,
									label: phone.label,
									is_active: true,
								},
							]);
							console.log(
								`      ✓ Added phone: ${phone.number} (${phone.label})`,
							);
						} else {
							console.log(`      ⚠ Phone already exists: ${phone.number}`);
						}
					}

					// 4. Add email addresses (only if they don't already exist)
					const existingEmails = await supplierService.listContactEmails({
						contact_id: contact.id,
					});
					const emails = splitMulti(safe(row, 'Email'));
					for (const [emailIndex, email] of emails.entries()) {
						const emailExists = existingEmails.some(e => e.email === email);
						if (!emailExists) {
							await supplierService.createContactEmails([
								{
									contact_id: contact.id,
									email: email,
									label: emailIndex === 0 ? 'Primär' : 'Sekundär',
									is_active: true,
								},
							]);
							console.log(`      ✓ Added email: ${email}`);
						} else {
							console.log(`      ⚠ Email already exists: ${email}`);
						}
					}
				}
			}

			// 5. Handle addresses - check if address already exists
			const hasAddressData =
				safe(row, 'Strasse') || safe(row, 'PLZ') || safe(row, 'Ort');

			if (hasAddressData) {
				const existingAddresses = await supplierService.listSupplierAddresses({
					supplier_id: supplier.id,
				});

				// Check if we already have an address with the same street/city
				const addressExists = existingAddresses.some(
					a =>
						a.street === safe(row, 'Strasse') &&
						a.city === safe(row, 'Ort') &&
						a.postal_code === safe(row, 'PLZ'),
				);

				if (!addressExists) {
					const addressData = {
						supplier_id: supplier.id,
						label:
							existingAddresses.length === 0
								? 'Hauptsitz'
								: `Adresse ${existingAddresses.length + 1}`,
						is_default: existingAddresses.length === 0, // First address is default
						street: safe(row, 'Strasse'),
						postal_code: safe(row, 'PLZ'),
						city: safe(row, 'Ort'),
						country_name: safe(row, 'Land') || 'Deutschland',
						is_active: true,
					};

					await supplierService.createSupplierAddresses([addressData]);
					console.log(
						`    ✓ Created address: ${addressData.street}, ${addressData.postal_code} ${addressData.city}`,
					);
				} else {
					console.log(`    ⚠ Address already exists`);
				}
			}
		} catch (error) {
			failed++;
			const errorMsg = `Row ${index + 1} (${row.Firma || 'Unknown'}): ${error.message}`;
			errors.push(errorMsg);
			console.error(`  ✗ ${errorMsg}`);
		}
	}

	// Print summary
	console.log('\n' + '='.repeat(60));
	console.log('IMPORT/UPDATE SUMMARY');
	console.log('='.repeat(60));
	console.log(`Total suppliers processed: ${records.length}`);
	console.log(`New suppliers created: ${created}`);
	console.log(`Existing suppliers updated: ${updated}`);
	console.log(`Failed: ${failed}`);

	if (errors.length > 0) {
		console.log('\nErrors:');
		errors.forEach(error => console.log(`  - ${error}`));
	}

	console.log('\nImport/Update completed!');
}
