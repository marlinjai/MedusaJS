import { ExecArgs } from '@medusajs/framework/types';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import { resolve } from 'path';
import { v4 as uuidv4 } from 'uuid';
import SupplierService from '../modules/supplier/service';

export default async function importSuppliers({ container }: ExecArgs) {
  const logger = container.resolve('logger');
  logger.info('Starting supplier import...');

  const supplierService: SupplierService = container.resolve('supplier');

  const filePath = resolve(__dirname, '..', '..', '..', 'data', 'JTL-Export-Lieferantendaten-02052025.csv');
  logger.info(`Reading data from: ${filePath}`);

  let fileContent;
  try {
    // Try UTF-8 first, then fallback to latin1
    fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });
  } catch (error) {
    try {
      fileContent = fs.readFileSync(filePath, { encoding: 'latin1' });
    } catch (error2) {
      logger.error(`Error reading the CSV file: ${error2.message}`);
      return;
    }
  }

  const records = parse(fileContent, {
    delimiter: ';',
    columns: true,
    skip_empty_lines: true,
  });

  logger.info(`Found ${records.length} records in the CSV file.`);

  // Get all existing suppliers to check for duplicates
  let existingSuppliers;
  try {
    existingSuppliers = await supplierService.listSuppliers({});
  } catch (error) {
    logger.error(`Error fetching existing suppliers: ${error.message}`);
    return;
  }

  // Create a set of existing supplier numbers for fast lookup
  const existingSupplierNumbers = new Set(existingSuppliers.map(s => s.supplier_number).filter(Boolean));
  const existingInternalKeys = new Set(existingSuppliers.map(s => s.internal_key).filter(Boolean));

  let importedCount = 0;
  let skippedCount = 0;

  for (const record of records) {
    // Handle both possible encodings of the column name
    const internalKey = record['Interner Schlüssel'] || record['Interner SchlÃ¼ssel'] || uuidv4();
    const supplierNumber = record.Lieferantennummer || null;

    // Check if supplier already exists by supplier number or internal key
    if ((supplierNumber && existingSupplierNumbers.has(supplierNumber)) || existingInternalKeys.has(internalKey)) {
      logger.info(`Supplier already exists. Skipping: ${supplierNumber || internalKey}`);
      skippedCount++;
      continue;
    }

    try {
      // Map CSV data to supplier model with fallbacks
      const supplierData = {
        supplier_number: supplierNumber,
        customer_number: record['Eigene Kd-Nr'] || null,
        internal_key: internalKey,
        salutation: record.Anrede || null,
        first_name: record.Vorname || null,
        last_name: record.Nachname || null,
        company: record.Firma || `Supplier ${internalKey}`, // Generate company name if missing
        email: record.Email || null,
        phone: record.Telefon || null,
        mobile: record.Mobil || null,
        fax: record.Fax || null,
        website: record.Website || null,
        street: record.Straße || record.StraÃe || null, // Handle encoding
        house_number: record.Hausnummer || null,
        postal_code: record.PLZ || null,
        city: record.Ort || null,
        country: record.Land || null,
        tax_number: record.Steuernummer || null,
        vat_number: record.UStIdNr || null,
        bank_name: record.Bank || null,
        iban: record.IBAN || null,
        bic: record.BIC || null,
      };

      await supplierService.createSuppliers([supplierData]);
      logger.info(`Successfully created supplier: ${supplierData.company} (${internalKey})`);
      importedCount++;

      // Add to our tracking sets to avoid duplicates within this import
      if (supplierNumber) existingSupplierNumbers.add(supplierNumber);
      existingInternalKeys.add(internalKey);
    } catch (error) {
      logger.error(`Failed to import supplier with internal key ${internalKey}. Error: ${error.message}`);
    }
  }

  logger.info(`Import completed. Imported: ${importedCount}, Skipped: ${skippedCount}`);
}
