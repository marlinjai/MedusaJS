import { ExecArgs } from '@medusajs/framework/types';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import { resolve } from 'path';
import SupplierService from '../modules/supplier/service';

export default async function importSuppliers({ container }: ExecArgs) {
  const logger = container.resolve('logger');
  logger.info('Starting supplier import...');

  const supplierService: SupplierService = container.resolve('supplier');

  const filePath = resolve(__dirname, '..', '..', '..', 'data', 'JTL-Export-Lieferantendaten-02052025.csv');
  logger.info(`Reading data from: ${filePath}`);

  let fileContent;
  try {
    // Use UTF-8 encoding to properly handle umlauts
    fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });
  } catch (error) {
    logger.error(`Error reading the CSV file: ${error.message}`);
    return;
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
    const internalKey = record['Interner Schlüssel'];
    const supplierNumber = record.Lieferantennummer || null;

    // Only skip if internal key is truly missing
    if (!internalKey) {
      logger.warn(`Skipping record without Interner Schlüssel: ${JSON.stringify(record)}`);
      continue;
    }

    // Check if supplier already exists by supplier number or internal key
    if ((supplierNumber && existingSupplierNumbers.has(supplierNumber)) || existingInternalKeys.has(internalKey)) {
      logger.info(`Supplier already exists. Skipping: ${supplierNumber || internalKey}`);
      skippedCount++;
      continue;
    }

    try {
      // Map CSV data to supplier model - EXACT column mapping
      const supplierData = {
        supplier_number: supplierNumber,
        customer_number: record['Eigene Kd-Nr'] || null,
        internal_key: internalKey,
        salutation: record.Anrede || null,
        first_name: record.Vorname || null,
        last_name: record.Nachname || null,
        company: record.Firma || `Supplier ${internalKey}`,
        company_addition: record.Firmenzusatz || null,
        contact: record.Kontakt || null,
        street: record.Strasse || null,
        postal_code: record.PLZ || null,
        city: record.Ort || null,
        country: record['Land / ISO (2-stellig)'] || null,
        phone: record['Tel Zentrale'] || null,
        phone_direct: record['Tel Durchwahl'] || null,
        fax: record.Fax || null,
        email: record.Email || null,
        website: record.WWW || null,
        note: record.Anmerkung || null,
        vat_id: record.UstID || null,
        status: record.Status || 'active',
        is_active: record.Aktiv === 'Y',
        language: record.Sprache || 'Deutsch',
        lead_time: record.Lieferzeit ? parseInt(record.Lieferzeit, 10) : null,
        contact_salutation: record['Anrede-Ansprechpartner'] || null,
        contact_first_name: record['Vorname-Ansprechpartner'] || null,
        contact_last_name: record['Name-Ansprechpartner'] || null,
        contact_phone: record['Tel-Ansprechpartner'] || null,
        contact_mobile: record['Mobil-Ansprechpartner'] || null,
        contact_fax: record['Fax-Ansprechpartner'] || null,
        contact_email: record['Email-Ansprechpartner'] || null,
        contact_department: record['Abteilung-Ansprechpartner'] || null,
        bank_name: record.BankName || null,
        bank_code: record.BLZ || null,
        account_number: record.KontoNr || null,
        account_holder: record.Inhaber || null,
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
