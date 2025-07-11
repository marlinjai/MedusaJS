/**
 * service.ts
 * Service for managing suppliers, contacts, and addresses
 */
import { MedusaService } from '@medusajs/framework/utils';

import contact, { Contact } from './models/contact';
import contactEmail, { ContactEmail } from './models/contact-email';
import contactPhone, { ContactPhone } from './models/contact-phone';
import productSupplier, { ProductSupplier } from './models/product-supplier';
import supplier, { Supplier } from './models/supplier';
import supplierAddress, { SupplierAddress } from './models/supplier-address';

// Interface for grouped supplier relationships
interface GroupedSupplierRelationship {
  supplier: Supplier;
  relationships: ProductSupplier[];
  totalRelationships: number;
  primaryRelationship?: ProductSupplier;
}

/**
 * SupplierService extends the MedusaService factory,
 * which automatically generates CRUD operations for all supplier-related models.
 */
class SupplierService extends MedusaService({
  supplier,
  contact,
  contactPhone,
  contactEmail,
  supplierAddress,
  productSupplier,
}) {
  /**
   * Import suppliers from CSV data with contacts and addresses
   * @param csvData - array of supplier data objects from CSV
   * @return array of created suppliers
   */
  async importFromCsv(csvData: any[]): Promise<Supplier[]> {
    const createdSuppliers: Supplier[] = [];

    for (const row of csvData) {
      // Map CSV columns to supplier fields
      const supplierData = {
        supplier_number: row.Lieferantennummer || null,
        customer_number: row['Eigene Kd-Nr'] || null,
        internal_key: row['Interner Schlüssel'] || null,
        company: row.Firma || 'Unknown Company',
        company_addition: row.Firmenzusatz || null,
        vat_id: row.UstID || null,
        status: row.Status || 'active',
        is_active: true,
        language: row.Sprache || 'Deutsch',
        lead_time: row.Lieferzeit ? parseInt(row.Lieferzeit) : null,
        website: row.WWW || null,
        note: row.Anmerkung || null,
        bank_name: row.Bank || null,
        bank_code: row.BLZ || null,
        account_number: row.Kontonummer || null,
        iban: row.IBAN || null,
        bic: row.BIC || null,
      };

      try {
        const createdSupplier = await this.createSuppliers(supplierData as any);
        createdSuppliers.push(createdSupplier);

        // Create main contact if contact data exists
        if (row.Anrede || row.Vorname || row.Nachname || row['1. Telefonnummer'] || row.Email) {
          const phones: Array<{ type: string; number: string; label: string }> = [];
          if (row['1. Telefonnummer']) {
            phones.push({ type: 'main', number: row['1. Telefonnummer'], label: 'Main Office' });
          }
          if (row['2. Telefonnummer']) {
            phones.push({ type: 'secondary', number: row['2. Telefonnummer'], label: 'Alternative' });
          }
          if (row['Tel Mobil']) {
            phones.push({ type: 'mobile', number: row['Tel Mobil'], label: 'Mobile' });
          }
          if (row.Fax) {
            phones.push({ type: 'fax', number: row.Fax, label: 'Fax' });
          }

          const emails: Array<{ type: string; email: string; label: string }> = [];
          if (row.Email) {
            emails.push({ type: 'main', email: row.Email, label: 'Main Email' });
          }

          const contactData = {
            supplier_id: createdSupplier.id,
            salutation: row.Anrede || null,
            first_name: row.Vorname || null,
            last_name: row.Nachname || null,
            is_main_contact: true,
            contact_type: 'main',
            phones: phones.length > 0 ? { phones } : null,
            emails: emails.length > 0 ? { emails } : null,
            is_active: true,
          };

          await this.createContacts(contactData);
        }

        // Create main address if address data exists
        if (row.Strasse || row.PLZ || row.Ort) {
          const addressData = {
            supplier_id: createdSupplier.id,
            address_type: 'main',
            label: 'Main Address',
            is_default: true,
            street: row.Strasse || '',
            postal_code: row.PLZ || '',
            city: row.Ort || '',
            country: row.Land || 'DE',
            country_name: row.Land || 'Germany',
            is_active: true,
          };

          await this.createSupplierAddresses(addressData);
        }
      } catch (error) {
        console.error(`Error importing supplier: ${error.message}`);
      }
    }

    return createdSuppliers;
  }

  /**
   * NEW: Get suppliers for a product grouped by supplier with all their relationships
   * @param productId - product ID
   * @return array of grouped supplier relationships
   */
  async getGroupedSuppliersForProduct(productId: string): Promise<GroupedSupplierRelationship[]> {
    const relationships = await this.listProductSuppliers({
      product_id: productId,
      is_active: true,
    });

    // Group relationships by supplier
    const groupedMap = new Map<string, GroupedSupplierRelationship>();

    for (const relationship of relationships) {
      const supplierId = relationship.supplier_id;

      if (!groupedMap.has(supplierId)) {
        // Get supplier details
        const supplier = await this.retrieveSupplier(supplierId);

        groupedMap.set(supplierId, {
          supplier,
          relationships: [],
          totalRelationships: 0,
          primaryRelationship: undefined,
        });
      }

      const group = groupedMap.get(supplierId)!;
      group.relationships.push(relationship);
      group.totalRelationships++;

      // Track primary relationship
      if (relationship.is_primary) {
        group.primaryRelationship = relationship;
      }
    }

    // Sort relationships within each group by sort_order and variant_name
    for (const group of groupedMap.values()) {
      group.relationships.sort((a, b) => {
        // First by sort_order
        if (a.sort_order !== b.sort_order) {
          return (a.sort_order || 0) - (b.sort_order || 0);
        }
        // Then by variant_name
        const nameA = a.variant_name || a.supplier_product_name || '';
        const nameB = b.variant_name || b.supplier_product_name || '';
        return nameA.localeCompare(nameB);
      });
    }

    return Array.from(groupedMap.values());
  }

  /**
   * Get suppliers for a specific product (legacy method for backward compatibility)
   * @param productId - product ID
   * @return array of suppliers with their relationship data
   */
  async getSuppliersForProduct(productId: string): Promise<ProductSupplier[]> {
    return await this.listProductSuppliers({
      product_id: productId,
      is_active: true,
    });
  }

  /**
   * Get products for a specific supplier
   * @param supplierId - supplier ID
   * @return array of product-supplier relationships
   */
  async getProductsForSupplier(supplierId: string): Promise<ProductSupplier[]> {
    return await this.listProductSuppliers({
      supplier_id: supplierId,
      is_active: true,
    });
  }

  /**
   * Get all contacts for a supplier
   * @param supplierId - supplier ID
   * @return array of contacts
   */
  async getContactsForSupplier(supplierId: string): Promise<Contact[]> {
    return await this.listContacts({
      supplier_id: supplierId,
      is_active: true,
    });
  }

  /**
   * Get all addresses for a supplier
   * @param supplierId - supplier ID
   * @return array of addresses
   */
  async getAddressesForSupplier(supplierId: string): Promise<SupplierAddress[]> {
    return await this.listSupplierAddresses({
      supplier_id: supplierId,
      is_active: true,
    });
  }

  /**
   * Get supplier with all related data (contacts and addresses)
   * @param supplierId - supplier ID
   * @return supplier with contacts and addresses (including phones and emails)
   */
  async getSupplierWithDetails(supplierId: string): Promise<
    Supplier & {
      contacts: (Contact & { phones: ContactPhone[]; emails: ContactEmail[] })[];
      addresses: SupplierAddress[];
    }
  > {
    const supplier = await this.retrieveSupplier(supplierId);
    const contacts = await this.getContactsForSupplier(supplierId);
    const addresses = await this.getAddressesForSupplier(supplierId);

    // For each contact, fetch their phones and emails
    const contactsWithDetails = await Promise.all(
      contacts.map(async contact => {
        const phones = await this.listContactPhones({ contact_id: contact.id });
        const emails = await this.listContactEmails({ contact_id: contact.id });
        return {
          ...contact,
          phones,
          emails,
        };
      }),
    );

    return {
      ...supplier,
      contacts: contactsWithDetails,
      addresses,
    };
  }

  /**
   * NEW: Link a product to a supplier with variant support
   * @param productId - product ID
   * @param supplierId - supplier ID
   * @param data - additional relationship data including variant info
   * @return created product-supplier relationship
   */
  async linkProductToSupplier(
    productId: string,
    supplierId: string,
    data: Partial<ProductSupplier> = {},
  ): Promise<ProductSupplier> {
    // If no variant_name is provided, check if this is the first relationship for this supplier
    if (!data.variant_name) {
      const existingRelationships = await this.listProductSuppliers({
        product_id: productId,
        supplier_id: supplierId,
      });

      // If this is the first relationship, don't require a variant name
      if (existingRelationships.length === 0) {
        data.variant_name = null;
      } else {
        // If there are existing relationships, provide a default variant name
        data.variant_name = `Variant ${existingRelationships.length + 1}`;
      }
    }

    // Set sort_order if not provided
    if (data.sort_order === undefined) {
      const existingRelationships = await this.listProductSuppliers({
        product_id: productId,
        supplier_id: supplierId,
      });
      data.sort_order = existingRelationships.length;
    }

    return await this.createProductSuppliers({
      product_id: productId,
      supplier_id: supplierId,
      is_active: true,
      ...data,
    });
  }

  /**
   * NEW: Update a specific product-supplier relationship
   * @param relationshipId - the ID of the relationship to update
   * @param data - updated relationship data
   * @return updated relationship
   */
  async updateProductSupplierRelationship(
    relationshipId: string,
    data: Partial<ProductSupplier>,
  ): Promise<ProductSupplier> {
    const updatedRelationships = await this.updateProductSuppliers({
      id: relationshipId,
      ...data,
    });

    if (!updatedRelationships) {
      throw new Error('Relationship not found');
    }

    return updatedRelationships;
  }

  /**
   * NEW: Delete a specific product-supplier relationship
   * @param relationshipId - the ID of the relationship to delete
   */
  async deleteProductSupplierRelationship(relationshipId: string): Promise<void> {
    await this.deleteProductSuppliers(relationshipId);
  }

  /**
   * NEW: Reorder relationships within a supplier group
   * @param productId - product ID
   * @param supplierId - supplier ID
   * @param relationshipIds - array of relationship IDs in desired order
   */
  async reorderSupplierRelationships(productId: string, supplierId: string, relationshipIds: string[]): Promise<void> {
    for (let i = 0; i < relationshipIds.length; i++) {
      await this.updateProductSuppliers({
        id: relationshipIds[i],
        sort_order: i,
      });
    }
  }

  /**
   * Unlink a product from a supplier (removes all relationships)
   * @param productId - product ID
   * @param supplierId - supplier ID
   */
  async unlinkProductFromSupplier(productId: string, supplierId: string): Promise<void> {
    const relationships = await this.listProductSuppliers({
      product_id: productId,
      supplier_id: supplierId,
    });

    for (const relationship of relationships) {
      await this.deleteProductSuppliers(relationship.id);
    }
  }

  /**
   * Set primary supplier for a product
   * @param productId - product ID
   * @param supplierId - supplier ID to set as primary
   */
  async setPrimarySupplier(productId: string, supplierId: string): Promise<void> {
    // First, unset all primary suppliers for this product
    const existingRelationships = await this.listProductSuppliers({
      product_id: productId,
      is_primary: true,
    });

    for (const relationship of existingRelationships) {
      await this.updateProductSuppliers({
        id: relationship.id,
        is_primary: false,
      });
    }

    // Then set the new primary supplier
    const targetRelationships = await this.listProductSuppliers({
      product_id: productId,
      supplier_id: supplierId,
    });

    if (targetRelationships.length > 0) {
      await this.updateProductSuppliers({
        id: targetRelationships[0].id,
        is_primary: true,
      });
    }
  }

  /**
   * Get primary supplier for a product
   * @param productId - product ID
   * @return primary supplier relationship or null
   */
  async getPrimarySupplierForProduct(productId: string): Promise<ProductSupplier | null> {
    const relationships = await this.listProductSuppliers({
      product_id: productId,
      is_primary: true,
      is_active: true,
    });

    return relationships.length > 0 ? relationships[0] : null;
  }

  /**
   * Search suppliers by company name or supplier number
   * @param searchTerm - search term
   * @return array of matching suppliers
   */
  async searchSuppliers(searchTerm: string): Promise<Supplier[]> {
    // This is a simple search - in a real implementation, you might want to use
    // the Index Module for more sophisticated search capabilities
    const allSuppliers = await this.listSuppliers();

    return allSuppliers.filter(
      supplier =>
        supplier.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supplier.supplier_number && supplier.supplier_number.toLowerCase().includes(searchTerm.toLowerCase())),
    );
  }
}

export default SupplierService;
