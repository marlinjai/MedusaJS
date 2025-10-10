/**
 * import-manual-customers.ts
 * Script to import manual customers from CSV file
 * Usage: npx tsx src/scripts/import-manual-customers.ts [csv-file-path]
 */
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import path from 'path';

// Default field mapping - matches the German CSV columns
const DEFAULT_FIELD_MAPPING = {
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

async function importManualCustomers(csvFilePath?: string) {
	try {
		// Use provided file path or default
		const filePath =
			csvFilePath || path.join(process.cwd(), 'data', 'manual-customers.csv');

		console.log(`Reading CSV file: ${filePath}`);

		// Read and parse CSV file
		const csvContent = readFileSync(filePath, 'utf-8');
		const records = parse(csvContent, {
			columns: true,
			skip_empty_lines: true,
			trim: true,
			delimiter: ';', // German CSV uses semicolon delimiter
		});

		console.log(`Found ${records.length} records in CSV`);

		// Display first few rows for verification
		console.log('\nFirst 3 records:');
		records.slice(0, 3).forEach((record, index) => {
			console.log(`${index + 1}:`, record);
		});

		// Show available CSV columns
		const csvColumns = Object.keys(records[0] || {});
		console.log('\nAvailable CSV columns:', csvColumns);

		// Show default mapping
		console.log('\nDefault field mapping:');
		Object.entries(DEFAULT_FIELD_MAPPING).forEach(([csvField, dbField]) => {
			console.log(`  "${csvField}" -> ${dbField}`);
		});

		// Step 1: Run validation first
		console.log('\n🔍 Step 1: Validating CSV data...');
		const validationData = {
			csvData: records,
			fieldMapping: DEFAULT_FIELD_MAPPING,
			options: { validate: true },
		};

		const validationResponse = await fetch(
			'http://localhost:9000/admin/manual-customers/import',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(validationData),
			},
		);

		const validationResult = await validationResponse.json();

		if (!validationResponse.ok) {
			console.error('\n❌ Validation request failed:', validationResult.message);
			return;
		}

		const validation = validationResult.validation;

		// Display validation results
		console.log('\n📊 Validation Results:');
		console.log(`   Total rows: ${validation.totalRows}`);
		console.log(`   Will create: ${validation.summary.willCreate} new customers`);
		console.log(
			`   Will update: ${validation.summary.willUpdate} existing customers`,
		);
		console.log(`   Will skip: ${validation.summary.willSkip} invalid rows`);
		console.log(
			`   Missing identifiers: ${validation.missingIdentifiers} rows (risk of duplicates on re-import)`,
		);

		// Show warnings if any
		if (validation.warnings.length > 0) {
			console.log(`\n⚠️  Warnings (${validation.warnings.length}):`);
			validation.warnings.slice(0, 10).forEach((warning: string) => {
				console.log(`   - ${warning}`);
			});
			if (validation.warnings.length > 10) {
				console.log(
					`   ... and ${validation.warnings.length - 10} more warnings`,
				);
			}
		}

		// Show errors if any
		if (validation.errors.length > 0) {
			console.log(`\n❌ Errors (${validation.errors.length}):`);
			validation.errors.forEach((error: string) => {
				console.log(`   - ${error}`);
			});
			console.log(
				'\n⛔ Cannot proceed with import due to validation errors. Please fix the data and try again.',
			);
			return;
		}

		// Show idempotency status
		if (validation.summary.willUpdate > 0) {
			console.log(
				`\n✅ Idempotency Check: ${validation.summary.willUpdate} existing customers will be updated (no duplicates will be created)`,
			);
		} else {
			console.log('\n✅ Idempotency Check: All records are new');
		}

		// Ask for confirmation
		const response = await askForConfirmation(
			'\n🚀 Do you want to proceed with the import? (y/n): ',
		);

		if (response.toLowerCase() !== 'y') {
			console.log('Import cancelled.');
			return;
		}

		// Step 2: Perform actual import
		console.log('\n📥 Step 2: Importing customers...');
		const importData = {
			csvData: records,
			fieldMapping: DEFAULT_FIELD_MAPPING,
			options: { strictMode: false },
		};

		const apiResponse = await fetch(
			'http://localhost:9000/admin/manual-customers/import',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(importData),
			},
		);

		const result = await apiResponse.json();

		if (apiResponse.ok) {
			console.log('\n✅ Import completed successfully!');
			console.log(`📊 Results:`);
			console.log(`   - Imported: ${result.results.imported} new customers`);
			console.log(`   - Updated: ${result.results.updated} existing customers`);
			console.log(`   - Skipped: ${result.results.skipped} rows`);

			if (result.results.warnings && result.results.warnings.length > 0) {
				console.log(`\n⚠️  Warnings (${result.results.warnings.length}):`);
				result.results.warnings.slice(0, 5).forEach((warning: string) => {
					console.log(`   - ${warning}`);
				});
				if (result.results.warnings.length > 5) {
					console.log(
						`   ... and ${result.results.warnings.length - 5} more warnings`,
					);
				}
			}

			if (result.results.errors && result.results.errors.length > 0) {
				console.log(`\n❌ Errors (${result.results.errors.length}):`);
				result.results.errors.forEach((error: string) => {
					console.log(`   - ${error}`);
				});
			}

			// Show idempotency confirmation
			console.log(
				'\n💡 Tip: You can safely re-run this import. Existing customers will be updated instead of creating duplicates.',
			);
		} else {
			console.error('\n❌ Import failed:', result.message);
			if (result.error) {
				console.error('Error details:', result.error);
			}
		}
	} catch (error) {
		console.error('❌ Error during import:', error);
	}
}

function askForConfirmation(question: string): Promise<string> {
	return new Promise(resolve => {
		const readline = require('readline').createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		readline.question(question, (answer: string) => {
			readline.close();
			resolve(answer);
		});
	});
}

// Example CSV format
function showExampleCSV() {
	console.log(`
📋 Example CSV format:

First Name,Last Name,Company,Email,Phone,Mobile,Street,ZIP,City,Country,Customer Type,Status,Notes,Legacy ID,VAT ID
John,Doe,Acme Corp,john@acme.com,+49123456789,+49987654321,Main St 123,12345,Berlin,Germany,business,active,Good customer,LEGACY001,DE123456789
Jane,Smith,,jane@example.com,+49111222333,,Oak Ave 456,54321,Munich,Germany,walk-in,active,,LEGACY002,
Anonymous,,,,,,,,,Germany,walk-in,active,Cash customer,,

📝 Notes:
- CSV headers must match the field mapping (case-sensitive)
- Empty values are allowed for optional fields
- Customer Type can be: legacy, walk-in, business
- Status can be: active, inactive, blocked
- At least one of: first_name, last_name, or company must be provided
`);
}

// Main execution
if (require.main === module) {
	const args = process.argv.slice(2);

	if (args.includes('--help') || args.includes('-h')) {
		console.log(`
🔧 Manual Customer Import Script

Usage: npx tsx src/scripts/import-manual-customers.ts [csv-file-path]

Options:
  --help, -h     Show this help message
  --example      Show example CSV format

Examples:
  npx tsx src/scripts/import-manual-customers.ts
  npx tsx src/scripts/import-manual-customers.ts ./data/customers.csv
  npx tsx src/scripts/import-manual-customers.ts --example
`);
		process.exit(0);
	}

	if (args.includes('--example')) {
		showExampleCSV();
		process.exit(0);
	}

	const csvFilePath = args[0];
	importManualCustomers(csvFilePath);
}
