/**
 * service.ts
 * Service for managing suppliers
 */
import { MedusaService } from "@medusajs/framework/utils"
import supplier, { Supplier } from "./models/supplier"


/**
 * SupplierService extends the MedusaService factory,
 * which automatically generates CRUD operations for the supplier model.
 */
class SupplierService extends MedusaService({
  supplier,
}) {
  /**
   * Import suppliers from CSV data
   * @param csvData - array of supplier data objects from CSV
   * @return array of created suppliers
   */
  async importFromCsv(csvData: any[]): Promise<Supplier[]> {
    const createdSuppliers: Supplier[] = []     

    for (const row of csvData) {
      // Map CSV columns to supplier fields
      const supplierData = {
        supplier_number: row.Lieferantennummer || null,
        customer_number: row['Eigene Kd-Nr'] || null,
        internal_key: row['Interner Schlüssel'] || null,
        salutation: row.Anrede || null,
        first_name: row.Vorname || null,
        last_name: row.Nachname || null,
        company: row.Firma || null,
        company_addition: row.Firmenzusatz || null,
        contact: row.Kontakt || null,
        street: row.Strasse || null,
        postal_code: row.PLZ || null,
        city: row.Ort || null,
        country: row['Land / ISO (2-stellig)'] || null,
        phone: row['Tel Zentrale'] || null,
        phone_direct: row['Tel Durchwahl'] || null,
        fax: row.Fax || null,
        email: row.Email || null,
        website: row.WWW || null,
        note: row.Anmerkung || null,
        vat_id: row.UstID || null,
        status: row.Status || 'active',
        active: row.Aktiv === 'Y',
        language: row.Sprache === 'Deutsch' ? 'de' : (row.Sprache === 'Englisch' ? 'en' : 'de'),
        delivery_time: row.Lieferzeit || 0,
        contact_salutation: row['Anrede-Ansprechpartner'] || null,
        contact_first_name: row['Vorname-Ansprechpartner'] || null,
        contact_last_name: row['Name-Ansprechpartner'] || null,
        contact_phone: row['Tel-Ansprechpartner'] || null,
        contact_mobile: row['Mobil-Ansprechpartner'] || null,
        contact_fax: row['Fax-Ansprechpartner'] || null,
        contact_email: row['Email-Ansprechpartner'] || null,
        contact_department: row['Abteilung-Ansprechpartner'] || null,
        bank_name: row.BankName || null,
        bank_code: row.BLZ || null,
        account_number: row.KontoNr || null,
        account_holder: row.Inhaber || null,
        iban: row.IBAN || null,
        bic: row.BIC || null,
      }

      try {
        const supplier = await this.createSuppliers(supplierData as any)
        createdSuppliers.push(supplier)
      } catch (error) {
        console.error(`Error importing supplier: ${error.message}`)
      }
    }

    return createdSuppliers
  }
}

export default SupplierService 