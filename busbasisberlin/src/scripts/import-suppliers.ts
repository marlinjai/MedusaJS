import { ExecArgs } from '@medusajs/framework/types';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

// Helper to safely get a field or null
const safe = (row: any, key: string) => (row[key] && row[key].trim() !== '' ? row[key].trim() : null);

// Helper to split multiple emails/phones
const splitMulti = (val: string | null | undefined) =>
  val
    ? val
        .split(/[;,]/)
        .map((s: string) => s.trim())
        .filter(Boolean)
    : [];

export default async function importSuppliers({ container, args }: ExecArgs) {
  const csvPath = args[0] || path.join(__dirname, '../../data/JTL-Export-Lieferantendaten-02052025.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found:', csvPath);
    process.exit(1);
  }
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    delimiter: ';',
    skip_empty_lines: true,
  });

  const supplierService = container.resolve('supplier');

  let imported = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of records) {
    try {
      // Map supplier fields
      const supplierData: any = {
        supplier_number: safe(row, 'Lieferantennummer'),
        customer_number: safe(row, 'Eigene Kd-Nr'),
        internal_key: safe(row, 'Interner Schlüssel'),
        company: safe(row, 'Firma') || 'Unbekannt',
        company_addition: safe(row, 'Firmenzusatz'),
        vat_id: safe(row, 'UstID'),
        status: safe(row, 'Status') || 'active',
        is_active: row['Aktiv'] === 'Y' || row['Aktiv'] === '1',
        language: safe(row, 'Sprache') || 'Deutsch',
        lead_time: row['Lieferzeit'] ? parseInt(row['Lieferzeit']) : null,
        website: safe(row, 'WWW'),
        note: safe(row, 'Anmerkung'),
        bank_name: safe(row, 'BankName'),
        bank_code: safe(row, 'BLZ'),
        account_number: safe(row, 'KontoNr'),
        account_holder: safe(row, 'Inhaber'),
        iban: safe(row, 'IBAN'),
        bic: safe(row, 'BIC'),
      };

      // Contacts
      const emails = splitMulti(safe(row, 'Email')).map(email => ({ email, label: 'primär' }));
      const phones = [
        ...splitMulti(safe(row, '1. Telefonnummer')).map(number => ({ number, label: 'primär' })),
        ...splitMulti(safe(row, '2. Telefonnummer')).map(number => ({ number, label: 'sekundär' })),
        ...splitMulti(safe(row, 'Tel Mobil')).map(number => ({ number, label: 'mobil' })),
        ...splitMulti(safe(row, 'Fax')).map(number => ({ number, label: 'fax' })),
      ];
      const contacts =
        row['Vorname'] || row['Nachname'] || emails.length > 0 || phones.length > 0
          ? [
              {
                salutation: safe(row, 'Anrede'),
                first_name: safe(row, 'Vorname'),
                last_name: safe(row, 'Nachname'),
                department: null,
                phones,
                emails,
              },
            ]
          : [];

      // Address
      const addresses =
        row['Strasse'] || row['PLZ'] || row['Ort']
          ? [
              {
                label: 'Hauptsitz',
                street: safe(row, 'Strasse'),
                street_number: null,
                postal_code: safe(row, 'PLZ'),
                city: safe(row, 'Ort'),
                country_name: safe(row, 'Land'),
                state: null,
                phone: null,
                email: null,
                is_default: true,
              },
            ]
          : [];

      // Import supplier
      await supplierService.createSuppliers({
        ...supplierData,
        contacts,
        addresses,
      });
      imported++;
    } catch (err: any) {
      failed++;
      errors.push(`Row ${imported + failed}: ${err.message}`);
      continue;
    }
  }

  console.log(`Import finished. Imported: ${imported}, Failed: ${failed}`);
  if (errors.length > 0) {
    console.log('Errors:');
    errors.forEach(e => console.log(e));
  }
}
