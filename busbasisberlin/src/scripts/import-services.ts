/**
 * import-services.ts
 * Script to import services from CSV (Arbeitspositionen only)
 * Run with: npx medusa exec ./src/scripts/import-services.ts
 */
import { ExecArgs } from '@medusajs/framework/types';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';

import { SERVICE_MODULE } from '../modules/service';
import ServiceService from '../modules/service/service';

// CSV interface matching the actual structure
interface ArticleData {
	Artikelnummer: string;
	'Interner Schlüssel': string;
	'EAN/Barcode': string;
	HAN: string;
	Artikelname: string;
	'Druck Kurzbeschreibung': string;
	'Druck Beschreibung': string;
	Anmerkung: string;
	'Std. VK Brutto': string;
	'Std. VK Netto': string;
	'Steuersatz in %': string;
	'Lagerbestand Gesamt': string;
	'In Aufträgen': string;
	Verfügbar: string;
	Fehlbestand: string;
	Mindestabnahme: string;
	Abnahmeintervall: string;
	Mindestlagerbestand: string;
	'Artikelgewicht in KG': string;
	Versandgewicht: string;
	Versandklasse: string;
	Breite: string;
	Höhe: string;
	Länge: string;
	Verkaufseinheit: string;
	'Inhalt/Menge': string;
	Mengeneinheit: string;
	Aktiv: string;
	Preisliste: string;
	'Top Artikel': string;
	Hersteller: string;
	Warengruppe: string;
	Sortiernummer: string;
	'UN-Nummer': string;
	Einkaufsliste: string;
	'Im Zulauf': string;
	'letzter Bearbeitungszeitpunkt': string;
	'Kategorie Level 1': string;
	'Kategorie Level 2': string;
	'Kategorie Level 3': string;
	'Kategorie Level 4': string;
	'Lagerbestand Standardlager': string;
	Lieferant: string;
	'Lieferanten-Art.Nr.': string;
	'Lieferanten Artikelname': string;
	'USt. in %': string;
	'EK Brutto': string;
	'EK Netto': string;
	Währung: string;
	'Lieferanten Lieferzeit': string;
	Lieferfrist: string;
	'Mindestabnahme Lieferant': string;
	'Lieferant Abnahmeintervall': string;
	Lieferantenbestand: string;
	Kommentar: string;
	'Lagerbestand zusammenführen': string;
	'Ist Dropshippingartikel': string;
	'Lieferzeit vom Lieferanten beziehen': string;
	'Ist Standardlieferant': string;
}

/**
 * Main import function
 */
export default async function importServices({ container }: ExecArgs) {
	const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
	const serviceService: ServiceService = container.resolve(SERVICE_MODULE);

	logger.info('Starting service import from CSV...');

	// Path to CSV file
	const csvPath = path.resolve(
		process.cwd(),
		'..',
		'data',
		'artikeldaten started cleanup.csv',
	);

	if (!fs.existsSync(csvPath)) {
		logger.error(`CSV file not found at: ${csvPath}`);
		throw new Error(`CSV file not found: ${csvPath}`);
	}

	logger.info(`Reading CSV from: ${csvPath}`);

	// Read and parse CSV
	const fileContent = fs.readFileSync(csvPath, 'utf-8');
	const records = parse(fileContent, {
		columns: true,
		skip_empty_lines: true,
		delimiter: ';',
		relax_column_count: true,
		trim: true,
	}) as ArticleData[];

	logger.info(`Total records in CSV: ${records.length}`);

	// Filter for Arbeitspositionen only
	const serviceRecords = records.filter(
		record => record['Kategorie Level 1'] === 'Arbeitspositionen',
	);

	logger.info(
		`Found ${serviceRecords.length} Arbeitspositionen records to import`,
	);

	// Clear existing services first
	logger.info('Clearing existing services...');
	const existingServices = await serviceService.listServices({});
	logger.info(`Found ${existingServices.length} existing services to delete`);

	for (const service of existingServices) {
		await serviceService.deleteServices([service.id]);
	}
	logger.info('Existing services cleared');

	// Import services
	let successCount = 0;
	let errorCount = 0;
	const errors: Array<{ record: string; error: string }> = [];

	for (const record of serviceRecords) {
		try {
			// Parse price from CSV (Std. VK Brutto is already gross price)
			const priceStr = record['Std. VK Brutto'].replace(',', '.');
			const priceInEuros = parseFloat(priceStr) || 0;
			const priceInCents = Math.round(priceInEuros * 100);

			// Determine service type based on description or default to "Pauschal"
			let serviceType = 'Pauschal';
			const title = record.Artikelname || '';
			if (title.toLowerCase().includes('std.') || title.includes('min.')) {
				serviceType = 'Stunden';
			}

			// Create service
			await serviceService.createServices({
				title: record.Artikelname || 'Unbekannter Service',
				description: record['Druck Beschreibung'] || null,
				short_description: record['Druck Kurzbeschreibung'] || null,
				service_code: record.Artikelnummer || null,

				// Category hierarchy
				category: record['Kategorie Level 2'] || null, // Keep for backward compatibility
				category_level_1: record['Kategorie Level 1'] || null,
				category_level_2: record['Kategorie Level 2'] || null,
				category_level_3: record['Kategorie Level 3'] || null,
				category_level_4: record['Kategorie Level 4'] || null,

				service_type: serviceType,

				// Pricing
				base_price: priceInCents > 0 ? priceInCents : null,
				hourly_rate: serviceType === 'Stunden' ? priceInCents : null,
				currency_code: 'EUR',

				// Status
				is_active: record.Aktiv === 'Y',
				status: record.Aktiv === 'Y' ? 'active' : 'inactive',

				// Additional info
				notes: record.Anmerkung || null,
			});

			successCount++;

			if (successCount % 10 === 0) {
				logger.info(`Imported ${successCount} services...`);
			}
		} catch (error) {
			errorCount++;
			errors.push({
				record: record.Artikelnummer || 'Unknown',
				error: error instanceof Error ? error.message : String(error),
			});
			logger.error(
				`Error importing service ${record.Artikelnummer}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	// Summary
	logger.info('\n=== Import Summary ===');
	logger.info(`Total Arbeitspositionen records: ${serviceRecords.length}`);
	logger.info(`Successfully imported: ${successCount}`);
	logger.info(`Failed imports: ${errorCount}`);

	if (errors.length > 0) {
		logger.info('\nFirst 10 errors:');
		errors.slice(0, 10).forEach(err => {
			logger.error(`  ${err.record}: ${err.error}`);
		});
	}

	// Category statistics
	const categoryStats = new Map<string, number>();
	for (const record of serviceRecords) {
		const cat = record['Kategorie Level 2'] || 'Uncategorized';
		categoryStats.set(cat, (categoryStats.get(cat) || 0) + 1);
	}

	logger.info('\n=== Category Distribution ===');
	Array.from(categoryStats.entries())
		.sort((a, b) => b[1] - a[1])
		.forEach(([category, count]) => {
			logger.info(`  ${category}: ${count} services`);
		});

	logger.info('\nService import completed!');
}


