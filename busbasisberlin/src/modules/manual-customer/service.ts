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
   * @param data - Customer data (customer_number will be auto-generated if not provided)
   * @returns Created manual customer
   */
  async createManualCustomerWithNumber(data: Partial<ManualCustomer>): Promise<ManualCustomer> {
    // Generate customer number if not provided
    if (!data.customer_number) {
      data.customer_number = await this.generateCustomerNumber();
    }

    // Set default values
    const customerData = {
      status: 'active',
      customer_type: 'walk-in',
      source: 'manual-entry',
      language: 'de',
      total_purchases: 0,
      total_spent: 0,
      is_linked: false,
      ...data,
    };

    const [customer] = await this.createManualCustomers([customerData]);
    return customer;
  }

  /**
   * Get statistics about manual customers
   * @returns Statistics object with counts and totals
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
      active: customers.filter(c => c.status === 'active').length,
      inactive: customers.filter(c => c.status === 'inactive').length,
      legacy: customers.filter(c => c.customer_type === 'legacy').length,
      walkIn: customers.filter(c => c.customer_type === 'walk-in').length,
      business: customers.filter(c => c.customer_type === 'business').length,
      withEmail: customers.filter(c => c.email && c.email.trim() !== '').length,
      withPhone: customers.filter(c => c.phone && c.phone.trim() !== '').length,
      totalSpent: customers.reduce((sum, c) => sum + (c.total_spent || 0), 0),
    };

    return stats;
  }

  /**
   * Search customers by various fields
   * @param searchTerm - Search term to match against multiple fields
   * @returns Array of matching customers
   */
  async searchCustomers(searchTerm: string): Promise<ManualCustomer[]> {
    if (!searchTerm || searchTerm.trim() === '') {
      return [];
    }

    const allCustomers = await this.listManualCustomers({});
    const term = searchTerm.toLowerCase().trim();

    return allCustomers.filter(customer => {
      const searchableFields = [
        customer.customer_number,
        customer.first_name,
        customer.last_name,
        customer.company,
        customer.email,
        customer.phone,
        customer.mobile,
        customer.city,
        customer.legacy_customer_id,
        customer.internal_key,
      ];

      return searchableFields.some(field => field && field.toLowerCase().includes(term));
    });
  }

  /**
   * Import customers from CSV data
   * @param csvData - Array of CSV row objects
   * @param fieldMapping - Mapping of CSV columns to customer fields
   * @returns Import results with counts and errors
   */
  async importFromCSV(
    csvData: CSVCustomerRow[],
    fieldMapping: Record<string, string>,
  ): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      try {
        // Map CSV fields to customer fields
        const customerData: Partial<ManualCustomer> = {};

        Object.entries(fieldMapping).forEach(([csvField, customerField]) => {
          if (row[csvField] !== undefined && row[csvField] !== '') {
            if (customerField === 'total_spent' || customerField === 'total_purchases') {
              customerData[customerField] = Number(row[csvField]) || 0;
            } else if (customerField === 'birthday' || customerField === 'last_purchase_date') {
              customerData[customerField] = row[csvField] ? new Date(row[csvField]) : null;
            } else {
              customerData[customerField] = row[csvField];
            }
          }
        });

        // Set import metadata
        customerData.source = 'csv-import';
        customerData.import_reference = `csv-row-${i + 1}`;

        // Create customer
        await this.createManualCustomerWithNumber(customerData);
        results.imported++;
      } catch (error) {
        results.skipped++;
        results.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    const allCustomers = await this.listManualCustomers({});
    const customer = allCustomers.find(c => c.id === customerId);

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
   * Update customer and track contact
   * @param customerId - Customer ID
   * @param data - Update data
   * @returns Updated customer
   */
  async updateCustomerWithContactTracking(customerId: string, data: Partial<ManualCustomer>): Promise<ManualCustomer> {
    const updateData = {
      id: customerId,
      ...data,
      last_contact_date: new Date(),
    };

    const updatedCustomers = await this.updateManualCustomers([updateData]);
    return updatedCustomers[0];
  }

  /**
   * Get customers by type
   * @param customerType - Customer type to filter by
   * @returns Array of customers
   */
  async getCustomersByType(customerType: string): Promise<ManualCustomer[]> {
    const allCustomers = await this.listManualCustomers({});
    return allCustomers.filter(customer => customer.customer_type === customerType);
  }

  /**
   * Get customers without email addresses
   * @returns Array of customers without email
   */
  async getCustomersWithoutEmail(): Promise<ManualCustomer[]> {
    const allCustomers = await this.listManualCustomers({});
    return allCustomers.filter(customer => !customer.email || customer.email.trim() === '');
  }

  /**
   * Get customers without phone numbers
   * @returns Array of customers without phone
   */
  async getCustomersWithoutPhone(): Promise<ManualCustomer[]> {
    const allCustomers = await this.listManualCustomers({});
    return allCustomers.filter(customer => !customer.phone || customer.phone.trim() === '');
  }

  // ========================================
  // CUSTOMER LINKING METHODS
  // ========================================

  /**
   * Link a manual customer to a core customer
   * @param manualCustomerId - Manual customer ID
   * @param coreCustomerId - Core customer ID
   * @param linkingMethod - How the link was established
   * @returns Updated manual customer
   */
  async linkToCustomer(
    manualCustomerId: string,
    coreCustomerId: string,
    linkingMethod: 'email-match' | 'manual-link' | 'phone-match' | 'name-match',
  ): Promise<ManualCustomer> {
    // Check if manual customer exists
    const allCustomers = await this.listManualCustomers({});
    const manualCustomer = allCustomers.find(customer => customer.id === manualCustomerId);

    if (!manualCustomer) {
      throw new Error(`Manual customer with ID ${manualCustomerId} not found`);
    }

    // Check if already linked
    if (manualCustomer.is_linked && manualCustomer.core_customer_id) {
      throw new Error(`Manual customer is already linked to core customer ${manualCustomer.core_customer_id}`);
    }

    // Update the manual customer with linking information
    const updateData = {
      id: manualCustomerId,
      core_customer_id: coreCustomerId,
      is_linked: true,
      linked_at: new Date(),
      linking_method: linkingMethod,
    };

    const updatedCustomers = await this.updateManualCustomers([updateData]);
    return updatedCustomers[0];
  }

  /**
   * Unlink a manual customer from a core customer
   * @param manualCustomerId - Manual customer ID
   * @returns Updated manual customer
   */
  async unlinkFromCustomer(manualCustomerId: string): Promise<ManualCustomer> {
    const allCustomers = await this.listManualCustomers({});
    const manualCustomer = allCustomers.find(customer => customer.id === manualCustomerId);

    if (!manualCustomer) {
      throw new Error(`Manual customer with ID ${manualCustomerId} not found`);
    }

    if (!manualCustomer.is_linked || !manualCustomer.core_customer_id) {
      throw new Error('Manual customer is not linked to any core customer');
    }

    // Update the manual customer to remove linking information
    const updateData = {
      id: manualCustomerId,
      core_customer_id: null,
      is_linked: false,
      linked_at: null,
      linking_method: null,
    };

    const updatedCustomers = await this.updateManualCustomers([updateData]);
    return updatedCustomers[0];
  }

  /**
   * Get linked manual customers
   * @returns Manual customers that are linked to core customers
   */
  async getLinkedCustomers(): Promise<ManualCustomer[]> {
    const allCustomers = await this.listManualCustomers({});
    return allCustomers.filter(customer => customer.is_linked && customer.core_customer_id);
  }

  /**
   * Get unlinked manual customers
   * @returns Manual customers that are not linked to core customers
   */
  async getUnlinkedCustomers(): Promise<ManualCustomer[]> {
    const allCustomers = await this.listManualCustomers({});
    return allCustomers.filter(customer => !customer.is_linked);
  }

  /**
   * Find manual customer by core customer ID
   * @param coreCustomerId - Core customer ID
   * @returns Manual customer if found, null otherwise
   */
  async findByCoreCusterId(coreCustomerId: string): Promise<ManualCustomer | null> {
    const allCustomers = await this.listManualCustomers({});
    const linkedCustomer = allCustomers.find(customer => customer.core_customer_id === coreCustomerId);
    return linkedCustomer || null;
  }

  /**
   * Find potential matches for a core customer
   * @param coreCustomer - Core customer data
   * @returns Array of potential matches with match reasons
   */
  async findPotentialMatches(coreCustomer: {
    email?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
  }): Promise<Array<{ customer: ManualCustomer; matchReasons: string[] }>> {
    const allCustomers = await this.listManualCustomers({});
    const potentialMatches: Array<{ customer: ManualCustomer; matchReasons: string[] }> = [];

    for (const customer of allCustomers) {
      // Skip already linked customers
      if (customer.is_linked) {
        continue;
      }

      const matchReasons: string[] = [];

      // Email match (highest priority)
      if (coreCustomer.email && customer.email && coreCustomer.email.toLowerCase() === customer.email.toLowerCase()) {
        matchReasons.push('email-exact');
      }

      // Phone match (high priority)
      if (coreCustomer.phone && customer.phone) {
        const normalizedCorePhone = this.normalizePhone(coreCustomer.phone);
        const normalizedCustomerPhone = this.normalizePhone(customer.phone);
        if (normalizedCorePhone === normalizedCustomerPhone) {
          matchReasons.push('phone-exact');
        }
      }

      // Mobile phone match
      if (coreCustomer.phone && customer.mobile) {
        const normalizedCorePhone = this.normalizePhone(coreCustomer.phone);
        const normalizedCustomerMobile = this.normalizePhone(customer.mobile);
        if (normalizedCorePhone === normalizedCustomerMobile) {
          matchReasons.push('phone-mobile-exact');
        }
      }

      // Name match (lower priority)
      if (coreCustomer.first_name && coreCustomer.last_name && customer.first_name && customer.last_name) {
        const coreFirstName = coreCustomer.first_name.toLowerCase().trim();
        const coreLastName = coreCustomer.last_name.toLowerCase().trim();
        const customerFirstName = customer.first_name.toLowerCase().trim();
        const customerLastName = customer.last_name.toLowerCase().trim();

        if (coreFirstName === customerFirstName && coreLastName === customerLastName) {
          matchReasons.push('name-exact');
        }
      }

      // Add to potential matches if any match found
      if (matchReasons.length > 0) {
        potentialMatches.push({
          customer,
          matchReasons,
        });
      }
    }

    // Sort by match score (email and phone matches first)
    potentialMatches.sort((a, b) => {
      const scoreA = this.calculateMatchScore(a.matchReasons);
      const scoreB = this.calculateMatchScore(b.matchReasons);
      return scoreB - scoreA;
    });

    return potentialMatches;
  }

  /**
   * Auto-link customers based on strong matches (email or phone)
   * @param coreCustomer - Core customer data with ID
   * @returns Linking result
   */
  async autoLinkCustomer(coreCustomer: {
    id: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
  }): Promise<{ linked: boolean; manualCustomer?: ManualCustomer; reason?: string }> {
    const potentialMatches = await this.findPotentialMatches(coreCustomer);

    // Only auto-link on very strong matches (email or phone)
    const strongMatches = potentialMatches.filter(
      match => match.matchReasons.includes('email-exact') || match.matchReasons.includes('phone-exact'),
    );

    if (strongMatches.length === 1) {
      // Exactly one strong match - safe to auto-link
      const match = strongMatches[0];
      const linkingMethod = match.matchReasons.includes('email-exact') ? 'email-match' : 'phone-match';

      const linkedCustomer = await this.linkToCustomer(match.customer.id, coreCustomer.id, linkingMethod as any);

      return {
        linked: true,
        manualCustomer: linkedCustomer,
        reason: `Auto-linked via ${linkingMethod}`,
      };
    }

    // Multiple matches or no strong matches - don't auto-link
    return { linked: false };
  }

  /**
   * Normalize phone number for comparison
   * @param phone - Phone number to normalize
   * @returns Normalized phone number
   */
  private normalizePhone(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // If starts with country code, normalize it
    if (digits.startsWith('49')) {
      return '+49' + digits.slice(2);
    }
    if (digits.startsWith('0')) {
      return '+49' + digits.slice(1);
    }

    return '+49' + digits;
  }

  /**
   * Calculate match score based on match reasons
   * @param matchReasons - Array of match reasons
   * @returns Numeric score
   */
  private calculateMatchScore(matchReasons: string[]): number {
    let score = 0;
    matchReasons.forEach(reason => {
      switch (reason) {
        case 'email-exact':
          score += 100;
          break;
        case 'phone-exact':
        case 'phone-mobile-exact':
          score += 50;
          break;
        case 'name-exact':
          score += 10;
          break;
      }
    });
    return score;
  }
}

export default ManualCustomerService;
