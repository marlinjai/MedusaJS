import { ExecArgs } from '@medusajs/framework/types';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import { resolve } from 'path';
import SupplierService from '../modules/supplier/service';

export default async function updateSuppliers({ container }: ExecArgs) {
  const logger = container.resolve('logger');
  logger.info('Starting supplier update...');

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

  let updatedCount = 0;
  let notFoundCount = 0;

  for (const record of records) {
    const internalKey = record['Interner Schlüssel'];

    if (!internalKey) {
      logger.warn(`Skipping record without Interner Schlüssel: ${JSON.stringify(record)}`);
      continue;
    }

    try {
      // Find existing supplier by internal key
      const existingSuppliers = await supplierService.listSuppliers({ internal_key: internalKey });

      if (existingSuppliers.length === 0) {
        logger.warn(`Supplier with internal key ${internalKey} not found. Skipping update.`);
        notFoundCount++;
        continue;
      }

      const existingSupplier = existingSuppliers[0];

      // Map CSV data to supplier model - only basic supplier fields
      const updateData = {
        id: existingSupplier.id,
        supplier_number: record.Lieferantennummer || null,
        customer_number: record['Eigene Kd-Nr'] || null,
        internal_key: internalKey,
        company: record.Firma || `Supplier ${internalKey}`,
        company_addition: record.Firmenzusatz || null,
        vat_id: record.UstID || null,
        status: record.Status || 'active',
        is_active: record.Aktiv === 'Y',
        language: record.Sprache || 'Deutsch',
        lead_time: record.Lieferzeit ? parseInt(record.Lieferzeit, 10) : null,
        website: record.WWW || null,
        note: record.Anmerkung || null,
        bank_name: record.BankName || null,
        bank_code: record.BLZ || null,
        account_number: record.KontoNr || null,
        account_holder: record.Inhaber || null,
        iban: record.IBAN || null,
        bic: record.BIC || null,
      };

      await supplierService.updateSuppliers([updateData]);

      // Update or create main contact
      if (record.Anrede || record.Vorname || record.Nachname || record['Tel-Ansprechpartner'] || record.Email) {
        const phones: Array<{ type: string; number: string; label: string }> = [];
        if (record['Tel-Ansprechpartner']) {
          phones.push({ type: 'main', number: record['Tel-Ansprechpartner'], label: 'Main Office' });
        }
        if (record['Mobil-Ansprechpartner']) {
          phones.push({ type: 'mobile', number: record['Mobil-Ansprechpartner'], label: 'Mobile' });
        }
        if (record['Fax-Ansprechpartner']) {
          phones.push({ type: 'fax', number: record['Fax-Ansprechpartner'], label: 'Fax' });
        }

        const emails: Array<{ type: string; email: string; label: string }> = [];
        if (record['Email-Ansprechpartner']) {
          emails.push({ type: 'main', email: record['Email-Ansprechpartner'], label: 'Main Email' });
        }

        // Check if main contact already exists
        const existingContacts = await supplierService.listContacts({
          supplier_id: existingSupplier.id,
          is_main_contact: true,
        });

        const contactData = {
          supplier_id: existingSupplier.id,
          salutation: record['Anrede-Ansprechpartner'] || null,
          first_name: record['Vorname-Ansprechpartner'] || null,
          last_name: record['Name-Ansprechpartner'] || null,
          department: record['Abteilung-Ansprechpartner'] || null,
          is_main_contact: true,
          contact_type: 'main',
          phones: phones.length > 0 ? { phones } : null,
          emails: emails.length > 0 ? { emails } : null,
          is_active: true,
        };

        if (existingContacts.length > 0) {
          // Update existing main contact
          await supplierService.updateContacts([
            {
              id: existingContacts[0].id,
              ...contactData,
            },
          ]);
          logger.info(`Updated main contact for supplier: ${updateData.company}`);
        } else {
          // Create new main contact
          await supplierService.createContacts(contactData);
          logger.info(`Created main contact for supplier: ${updateData.company}`);
        }
      }

      // Update or create main address
      if (record.Strasse || record.PLZ || record.Ort) {
        // Check if main address already exists
        const existingAddresses = await supplierService.listSupplierAddresses({
          supplier_id: existingSupplier.id,
          address_type: 'main',
        });

        const addressData = {
          supplier_id: existingSupplier.id,
          address_type: 'main',
          label: 'Main Address',
          is_default: true,
          street: record.Strasse || '',
          postal_code: record.PLZ || '',
          city: record.Ort || '',
          country: record['Land / ISO (2-stellig)'] || 'DE',
          country_name: record['Land / ISO (2-stellig)'] || 'Germany',
          is_active: true,
        };

        if (existingAddresses.length > 0) {
          // Update existing main address
          await supplierService.updateSupplierAddresses([
            {
              id: existingAddresses[0].id,
              ...addressData,
            },
          ]);
          logger.info(`Updated main address for supplier: ${updateData.company}`);
        } else {
          // Create new main address
          await supplierService.createSupplierAddresses(addressData);
          logger.info(`Created main address for supplier: ${updateData.company}`);
        }
      }

      logger.info(`Successfully updated supplier: ${updateData.company} (${internalKey})`);
      updatedCount++;
    } catch (error) {
      logger.error(`Failed to update supplier with internal key ${internalKey}. Error: ${error.message}`);
    }
  }

  logger.info(`Update completed. Updated: ${updatedCount}, Not found: ${notFoundCount}`);
}
