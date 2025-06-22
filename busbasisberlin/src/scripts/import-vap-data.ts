/**
 * import-vap-data.ts
 * Comprehensive import script for VAP system data
 * Imports suppliers from CSV and handles product images
 */
import { ExecArgs } from '@medusajs/framework/types';
import { parse } from 'csv-parse/sync';
import { existsSync, readFileSync, readdirSync } from 'fs';
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

interface VAPProduct {
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
  'EK Netto (für GLD)': string;
  UVP: string;
  'Steuersatz in %': string;
  'Lagerbestand Gesamt': string;
  'In Aufträgen': string;
  Verfügbar: string;
  Fehlbestand: string;
  Mindestabnahme: string;
  Abnahmeintervall: string;
  Mindestlagerbestand: string;
  'Beschaffungszeit manuell ermitteln (Tage)': string;
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

export default async function importVAPData({ container }: ExecArgs) {
  console.log('🚀 Starting VAP data import...');

  try {
    // Step 1: Import Suppliers
    await importSuppliers(container);

    // Step 2: Import Products and Supplier Relationships
    await importProductsAndRelationships(container);

    // Step 3: Handle Product Images
    await handleProductImages(container);

    console.log('✅ VAP data import completed successfully!');
  } catch (error) {
    console.error('❌ Error during VAP data import:', error);
    throw error;
  }
}

async function importSuppliers(container: any) {
  console.log('📋 Importing suppliers...');

  const supplierService = container.resolve('supplier') as SupplierService;
  const csvPath = join(process.cwd(), '..', 'data', 'JTL-Export-Lieferantendaten-02052025.csv');

  if (!existsSync(csvPath)) {
    console.warn('⚠️ Supplier CSV file not found, skipping supplier import');
    return;
  }

  const csvContent = readFileSync(csvPath, 'utf-8');
  const suppliers: VAPSupplier[] = parse(csvContent, {
    columns: true,
    delimiter: ';',
    skip_empty_lines: true,
  });

  console.log(`📊 Found ${suppliers.length} suppliers in CSV`);

  // Get all existing suppliers for comparison
  const existingSuppliers = await supplierService.listSuppliers();
  const existingSupplierNumbers = new Set(existingSuppliers.map(s => s.supplier_number));
  const existingCompanyNames = new Set(existingSuppliers.map(s => s.company));

  let createdCount = 0;
  let skippedCount = 0;

  for (const csvSupplier of suppliers) {
    try {
      // Map CSV data to our model
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

      // Check if supplier already exists by supplier number or company name
      const existsByNumber = supplierData.supplier_number && existingSupplierNumbers.has(supplierData.supplier_number);
      const existsByCompany = existingCompanyNames.has(supplierData.company);

      if (!existsByNumber && !existsByCompany) {
        await supplierService.createSuppliers(supplierData);
        console.log(`✅ Created supplier: ${supplierData.company}`);
        createdCount++;

        // Update our sets to avoid duplicates in the same import
        if (supplierData.supplier_number) {
          existingSupplierNumbers.add(supplierData.supplier_number);
        }
        existingCompanyNames.add(supplierData.company);
      } else {
        console.log(`⏭️ Supplier already exists: ${supplierData.company}`);
        skippedCount++;
      }
    } catch (error) {
      console.error(`❌ Error importing supplier ${csvSupplier.Firma}:`, error);
    }
  }

  console.log(`✅ Supplier import completed: ${createdCount} created, ${skippedCount} skipped`);
}

async function importProductsAndRelationships(container: any) {
  console.log('📦 Importing products and supplier relationships...');

  const supplierService = container.resolve('supplier') as SupplierService;
  const csvPath = join(process.cwd(), '..', 'data', 'artikeldaten started cleanup.csv');

  if (!existsSync(csvPath)) {
    console.warn('⚠️ Product CSV file not found, skipping product import');
    return;
  }

  const csvContent = readFileSync(csvPath, 'utf-8');
  const products: VAPProduct[] = parse(csvContent, {
    columns: true,
    delimiter: ';',
    skip_empty_lines: true,
  });

  console.log(`📊 Found ${products.length} products in CSV`);

  // Get all suppliers for lookup
  const allSuppliers = await supplierService.listSuppliers({});
  const supplierMap = new Map();

  for (const supplier of allSuppliers) {
    supplierMap.set(supplier.company, supplier.id);
    if (supplier.supplier_number) {
      supplierMap.set(supplier.supplier_number, supplier.id);
    }
  }

  for (const csvProduct of products) {
    try {
      // Find supplier by name
      const supplierId = supplierMap.get(csvProduct.Lieferant);

      if (!supplierId) {
        console.warn(`⚠️ Supplier not found for product ${csvProduct.Artikelnummer}: ${csvProduct.Lieferant}`);
        continue;
      }

      // Create product-supplier relationship data
      const relationshipData = {
        product_id: csvProduct.Artikelnummer,
        supplier_id: supplierId,
        is_primary: csvProduct['Ist Standardlieferant'] === '1',
        supplier_price: csvProduct['EK Netto'] ? parseFloat(csvProduct['EK Netto']) * 100 : null, // Convert to cents
        supplier_sku: csvProduct['Lieferanten-Art.Nr.'] || null,
        supplier_product_name: csvProduct['Lieferanten Artikelname'] || null,
        supplier_vat_rate: csvProduct['USt. in %'] ? parseFloat(csvProduct['USt. in %']) : null,
        supplier_price_gross: csvProduct['EK Brutto'] ? parseFloat(csvProduct['EK Brutto']) * 100 : null,
        supplier_currency: csvProduct.Währung || 'EUR',
        supplier_lead_time: csvProduct['Lieferanten Lieferzeit']
          ? parseInt(csvProduct['Lieferanten Lieferzeit'])
          : null,
        supplier_delivery_time: csvProduct.Lieferfrist ? parseInt(csvProduct.Lieferfrist) : null,
        supplier_min_order_qty: csvProduct['Mindestabnahme Lieferant']
          ? parseInt(csvProduct['Mindestabnahme Lieferant'])
          : null,
        supplier_order_interval: csvProduct['Lieferant Abnahmeintervall']
          ? parseInt(csvProduct['Lieferant Abnahmeintervall'])
          : null,
        supplier_stock: csvProduct.Lieferantenbestand ? parseFloat(csvProduct.Lieferantenbestand) : null,
        supplier_comment: csvProduct.Kommentar || null,
        supplier_merge_stock: csvProduct['Lagerbestand zusammenführen'] === '1',
        is_dropshipping: csvProduct['Ist Dropshippingartikel'] === '1',
        use_supplier_lead_time: csvProduct['Lieferzeit vom Lieferanten beziehen'] === '1',
        is_active: true,
      };

      // Check if relationship already exists
      const existingRelationships = await supplierService.getProductsForSupplier(supplierId);
      const existingRelationship = existingRelationships.find(rel => rel.product_id === relationshipData.product_id);

      if (!existingRelationship) {
        await supplierService.linkProductToSupplier(
          relationshipData.product_id,
          relationshipData.supplier_id,
          relationshipData,
        );
        console.log(`✅ Linked product ${csvProduct.Artikelnummer} to supplier ${csvProduct.Lieferant}`);
      } else {
        console.log(`⏭️ Relationship already exists for product ${csvProduct.Artikelnummer}`);
      }
    } catch (error) {
      console.error(`❌ Error importing product relationship for ${csvProduct.Artikelnummer}:`, error);
    }
  }

  console.log('✅ Product and relationship import completed');
}

async function handleProductImages(container: any) {
  console.log('🖼️ Processing product images...');

  const imagesDir = join(process.cwd(), '..', 'data', 'artikelbilder');

  if (!existsSync(imagesDir)) {
    console.warn('⚠️ Product images directory not found');
    return;
  }

  const imageFiles = readdirSync(imagesDir);
  console.log(`📸 Found ${imageFiles.length} image files`);

  // Group images by product number
  const productImages = new Map<string, string[]>();

  for (const imageFile of imageFiles) {
    // Extract product number from filename (e.g., "AB-01-010-1.jpg" -> "AB-01-010")
    const match = imageFile.match(/^([A-Z]+-\d+-\d+)/);
    if (match) {
      const productNumber = match[1];
      if (!productImages.has(productNumber)) {
        productImages.set(productNumber, []);
      }
      productImages.get(productNumber)!.push(imageFile);
    }
  }

  console.log(`📦 Found images for ${productImages.size} products`);

  // Here you would typically:
  // 1. Upload images to your file storage (S3, local, etc.)
  // 2. Create file records in Medusa
  // 3. Associate files with products

  // For now, we'll just log the image information
  for (const [productNumber, images] of productImages) {
    console.log(`📸 Product ${productNumber}: ${images.length} images`);
    images.forEach(img => console.log(`   - ${img}`));
  }

  console.log('✅ Product image processing completed');
}
