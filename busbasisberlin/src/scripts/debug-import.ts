/**
 * debug-import.ts
 * Debug script to understand why only 1 supplier was imported
 */
import { ExecArgs } from '@medusajs/framework/types';
import { parse } from 'csv-parse/sync';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import SupplierService from '../modules/supplier/service';

interface VAPSupplier {
  Lieferantennummer: string;
  'Eigene Kd-Nr': string;
  'Interner Schlüssel': string;
  Anrede: string;
  Vorname: string;
  Nachname: string;
  Firma: string;
  Firmenzusatz: string;
  Kontakt: string;
  Strasse: string;
  PLZ: string;
  Ort: string;
  'Land / ISO (2-stellig)': string;
  'Tel Zentrale': string;
  'Tel Durchwahl': string;
  Fax: string;
  Email: string;
  WWW: string;
  Anmerkung: string;
  UstID: string;
  Status: string;
  Aktiv: string;
  Sprache: string;
  Lieferzeit: string;
  'Anrede-Ansprechpartner': string;
  'Vorname-Ansprechpartner': string;
  'Name-Ansprechpartner': string;
  'Tel-Ansprechpartner': string;
  'Mobil-Ansprechpartner': string;
  'Fax-Ansprechpartner': string;
  'Email-Ansprechpartner': string;
  'Abteilung-Ansprechpartner': string;
  BankName: string;
  BLZ: string;
  KontoNr: string;
  Inhaber: string;
  IBAN: string;
  BIC: string;
}

export default async function debugImport({ container }: ExecArgs) {
  console.log('🔍 Debugging import process...\n');

  const supplierService = container.resolve('supplier') as SupplierService;
  const csvPath = join(process.cwd(), '..', 'data', 'JTL-Export-Lieferantendaten-02052025.csv');

  if (!existsSync(csvPath)) {
    console.error('❌ CSV file not found');
    return;
  }

  const csvContent = readFileSync(csvPath, 'utf-8');
  const suppliers: VAPSupplier[] = parse(csvContent, {
    columns: true,
    delimiter: ';',
    skip_empty_lines: true,
  });

  console.log(`📊 Found ${suppliers.length} suppliers in CSV`);
  console.log('📝 First 3 suppliers from CSV:');
  suppliers.slice(0, 3).forEach((supplier, index) => {
    console.log(`${index + 1}. ${supplier.Firma} (${supplier.Lieferantennummer})`);
  });

  // Check existing suppliers
  const existingSuppliers = await supplierService.listSuppliers();
  console.log(`\n📋 Found ${existingSuppliers.length} existing suppliers in database`);

  // Test the first few suppliers from CSV
  console.log('\n🧪 Testing import for first 3 suppliers...');

  for (let i = 0; i < Math.min(3, suppliers.length); i++) {
    const csvSupplier = suppliers[i];
    console.log(`\n--- Testing supplier ${i + 1}: ${csvSupplier.Firma} ---`);

    const supplierData = {
      supplier_number: csvSupplier.Lieferantennummer || null,
      customer_number: csvSupplier['Eigene Kd-Nr'] || null,
      internal_key: csvSupplier['Interner Schlüssel'] || null,
      salutation: csvSupplier.Anrede || null,
      first_name: csvSupplier.Vorname || null,
      last_name: csvSupplier.Nachname || null,
      company: csvSupplier.Firma || 'Unknown Company',
      company_addition: csvSupplier.Firmenzusatz || null,
      contact: csvSupplier.Kontakt || null,
      street: csvSupplier.Strasse || null,
      postal_code: csvSupplier.PLZ || null,
      city: csvSupplier.Ort || null,
      country: csvSupplier['Land / ISO (2-stellig)'] || null,
      phone: csvSupplier['Tel Zentrale'] || null,
      phone_direct: csvSupplier['Tel Durchwahl'] || null,
      fax: csvSupplier.Fax || null,
      email: csvSupplier.Email || null,
      website: csvSupplier.WWW || null,
      note: csvSupplier.Anmerkung || null,
      vat_id: csvSupplier.UstID || null,
      status: csvSupplier.Status || 'active',
      is_active: csvSupplier.Aktiv === 'Y',
      language: csvSupplier.Sprache || 'Deutsch',
      lead_time: csvSupplier.Lieferzeit ? parseInt(csvSupplier.Lieferzeit) : null,
      contact_salutation: csvSupplier['Anrede-Ansprechpartner'] || null,
      contact_first_name: csvSupplier['Vorname-Ansprechpartner'] || null,
      contact_last_name: csvSupplier['Name-Ansprechpartner'] || null,
      contact_phone: csvSupplier['Tel-Ansprechpartner'] || null,
      contact_mobile: csvSupplier['Mobil-Ansprechpartner'] || null,
      contact_fax: csvSupplier['Fax-Ansprechpartner'] || null,
      contact_email: csvSupplier['Email-Ansprechpartner'] || null,
      contact_department: csvSupplier['Abteilung-Ansprechpartner'] || null,
      bank_name: csvSupplier.BankName || null,
      bank_code: csvSupplier.BLZ || null,
      account_number: csvSupplier.KontoNr || null,
      account_holder: csvSupplier.Inhaber || null,
      iban: csvSupplier.IBAN || null,
      bic: csvSupplier.BIC || null,
    };

    console.log(`Company: ${supplierData.company}`);
    console.log(`Supplier Number: ${supplierData.supplier_number}`);

    try {
      // Check if supplier already exists
      const existingSuppliers = await supplierService.listSuppliers({
        where: {
          $or: [{ supplier_number: supplierData.supplier_number }, { company: supplierData.company }],
        },
      });

      console.log(`Existing suppliers found: ${existingSuppliers.length}`);

      if (existingSuppliers.length === 0) {
        console.log('Creating new supplier...');
        const newSupplier = await supplierService.createSuppliers(supplierData);
        console.log(`✅ Created supplier with ID: ${newSupplier.id}`);
      } else {
        console.log(`⏭️ Supplier already exists: ${existingSuppliers[0].company}`);
      }
    } catch (error) {
      console.error(`❌ Error:`, error);
    }
  }

  console.log('\n✅ Debug completed!');
}
