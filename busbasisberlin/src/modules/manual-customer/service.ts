/**
 * service.ts
 * Service for managing manual customers
 * Uses auto-generated CRUD operations from MedusaService factory
 */
import { MedusaService } from '@medusajs/framework/utils';

import manualCustomer, { ManualCustomer } from './models/manual-customer';

// Interface for CSV import row
interface CSVCustomerRow {
  [key: string]: string | undefined;
}

/**
 * ManualCustomerService extends the MedusaService factory,
 * which automatically generates CRUD operations for the manual customer model.
 *
 * Auto-generated methods available:
 * - createManualCustomers(data[])
 * - listManualCustomers(filters?, config?)
 * - retrieveManualCustomer(id, config?)
 * - updateManualCustomers(updates[])
 * - deleteManualCustomers(ids[])
 */
class ManualCustomerService extends MedusaService({
  manualCustomer,
}) {
  /**
   * Generate a unique customer number
   * @returns Generated customer number
   */
  async generateCustomerNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `MC-${year}-`;

    // Find the highest existing number for this year
    const customers = await this.listManualCustomers({});

    const yearCustomers = customers.filter(c => c.customer_number && c.customer_number.startsWith(prefix));

    let maxNumber = 0;
    yearCustomers.forEach(customer => {
      if (customer.customer_number) {
        const match = customer.customer_number.match(/MC-\d{4}-(\d+)/);
        if (match) {
          const number = parseInt(match[1], 10);
          if (number > maxNumber) {
            maxNumber = number;
          }
        }
      }
    });

    return `${prefix}${String(maxNumber + 1).padStart(4, '0')}`;
  }

  /**
   * Create a manual customer with auto-generated customer number
   * @param data - Customer data
   * @returns Created customer
   */
  async createManualCustomerWithNumber(data: Partial<ManualCustomer>): Promise<ManualCustomer> {
    // Generate customer number if not provided
    if (!data.customer_number) {
      data.customer_number = await this.generateCustomerNumber();
    }

    // Set default values
    const customerData = {
      ...data,
      customer_type: data.customer_type || 'walk-in',
      status: data.status || 'active',
      language: data.language || 'de',
      source: data.source || 'manual-entry',
      total_purchases: data.total_purchases || 0,
      total_spent: data.total_spent || 0,
      first_contact_date: data.first_contact_date || new Date(),
      last_contact_date: data.last_contact_date || new Date(),
    };

    const createdCustomers = await this.createManualCustomers([customerData]);
    return createdCustomers[0];
  }

  /**
   * Get customer statistics
   * @returns Customer statistics
   */
  async getStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    legacy: number;
    walkIn: number;
    business: number;
    withEmail: number;
    withPhone: number;
    totalSpent: number;
  }> {
    const customers = await this.listManualCustomers({});

    const stats = {
      total: customers.length,
      active: 0,
      inactive: 0,
      legacy: 0,
      walkIn: 0,
      business: 0,
      withEmail: 0,
      withPhone: 0,
      totalSpent: 0,
    };

    customers.forEach(customer => {
      // Status
      if (customer.status === 'active') stats.active++;
      else stats.inactive++;

      // Type
      if (customer.customer_type === 'legacy') stats.legacy++;
      else if (customer.customer_type === 'walk-in') stats.walkIn++;
      else if (customer.customer_type === 'business') stats.business++;

      // Contact info
      if (customer.email) stats.withEmail++;
      if (customer.phone || customer.mobile) stats.withPhone++;

      // Total spent
      stats.totalSpent += customer.total_spent || 0;
    });

    return stats;
  }

  /**
   * Search customers by text
   * @param searchTerm - Search term
   * @returns Matching customers
   */
  async searchCustomers(searchTerm: string): Promise<ManualCustomer[]> {
    const searchLower = searchTerm.toLowerCase();

    // Get all customers and filter in memory
    const allCustomers = await this.listManualCustomers({});

    return allCustomers.filter(customer => {
      return (
        (customer.first_name && customer.first_name.toLowerCase().includes(searchLower)) ||
        (customer.last_name && customer.last_name.toLowerCase().includes(searchLower)) ||
        (customer.company && customer.company.toLowerCase().includes(searchLower)) ||
        (customer.company_addition && customer.company_addition.toLowerCase().includes(searchLower)) ||
        (customer.email && customer.email.toLowerCase().includes(searchLower)) ||
        (customer.phone && customer.phone.toLowerCase().includes(searchLower)) ||
        (customer.fax && customer.fax.toLowerCase().includes(searchLower)) ||
        (customer.mobile && customer.mobile.toLowerCase().includes(searchLower)) ||
        (customer.customer_number && customer.customer_number.toLowerCase().includes(searchLower)) ||
        (customer.internal_key && customer.internal_key.toLowerCase().includes(searchLower)) ||
        (customer.city && customer.city.toLowerCase().includes(searchLower)) ||
        (customer.postal_code && customer.postal_code.toLowerCase().includes(searchLower)) ||
        (customer.street && customer.street.toLowerCase().includes(searchLower)) ||
        (customer.ebay_name && customer.ebay_name.toLowerCase().includes(searchLower)) ||
        (customer.customer_group && customer.customer_group.toLowerCase().includes(searchLower))
      );
    });
  }

  /**
   * Import customers from CSV data
   * @param csvData - Array of CSV row objects
   * @param fieldMapping - Mapping of CSV columns to customer fields
   * @returns Import results
   */
  async importFromCSV(
    csvData: CSVCustomerRow[],
    fieldMapping: Record<string, string>,
  ): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    const results: { imported: number; skipped: number; errors: string[] } = {
      imported: 0,
      skipped: 0,
      errors: [],
    };

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];

      try {
        // Map CSV fields to customer fields
        const customerData: Partial<ManualCustomer> = {};

        Object.entries(fieldMapping).forEach(([csvField, customerField]) => {
          if (row[csvField] && row[csvField].trim()) {
            // Handle date fields
            if (customerField === 'birthday' && row[csvField]) {
              customerData.birthday = new Date(row[csvField]);
            } else {
              (customerData as any)[customerField] = row[csvField].trim();
            }
          }
        });

        // Set import-specific fields
        customerData.source = 'csv-import';
        customerData.import_reference = `Row ${i + 1}`;
        customerData.customer_type = 'legacy';

        // Skip if no meaningful data
        if (!customerData.first_name && !customerData.last_name && !customerData.company) {
          results.skipped++;
          continue;
        }

        await this.createManualCustomerWithNumber(customerData);
        results.imported++;
      } catch (error) {
        results.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        results.skipped++;
      }
    }

    return results;
  }

  /**
   * Record a purchase for a customer
   * @param customerId - Customer ID
   * @param amount - Purchase amount in cents
   * @returns Updated customer
   */
  async recordPurchase(customerId: string, amount: number): Promise<ManualCustomer> {
    // Get customer using list method (retrieve method has signature issues)
    const customers = await this.listManualCustomers({});
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      throw new Error(`Customer with ID ${customerId} not found`);
    }

    const updateData = {
      id: customerId,
      total_purchases: (customer.total_purchases || 0) + 1,
      total_spent: (customer.total_spent || 0) + amount,
      last_purchase_date: new Date(),
      last_contact_date: new Date(),
    };

    const updatedCustomers = await this.updateManualCustomers([updateData]);
    return updatedCustomers[0];
  }

  /**
   * Update customer with contact date tracking
   * @param customerId - Customer ID
   * @param data - Update data
   * @returns Updated customer
   */
  async updateCustomerWithContactTracking(customerId: string, data: Partial<ManualCustomer>): Promise<ManualCustomer> {
    // Update last contact date if any contact info is being updated
    if (data.email || data.phone || data.mobile) {
      data.last_contact_date = new Date();
    }

    const updatePayload = { id: customerId, ...data };
    const updatedCustomers = await this.updateManualCustomers([updatePayload]);
    return updatedCustomers[0];
  }

  /**
   * Get customers by type
   * @param customerType - Customer type
   * @returns Customers of specified type
   */
  async getCustomersByType(customerType: string): Promise<ManualCustomer[]> {
    const allCustomers = await this.listManualCustomers({});
    return allCustomers.filter(customer => customer.customer_type === customerType && customer.status === 'active');
  }

  /**
   * Get customers without email
   * @returns Customers without email addresses
   */
  async getCustomersWithoutEmail(): Promise<ManualCustomer[]> {
    const allCustomers = await this.listManualCustomers({});
    return allCustomers.filter(customer => !customer.email && customer.status === 'active');
  }

  /**
   * Get customers without phone
   * @returns Customers without phone numbers
   */
  async getCustomersWithoutPhone(): Promise<ManualCustomer[]> {
    const allCustomers = await this.listManualCustomers({});
    return allCustomers.filter(customer => !customer.phone && !customer.mobile && customer.status === 'active');
  }
}

export default ManualCustomerService;
