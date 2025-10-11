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

		// First, try to find the highest number from our standard format (MC-YYYY-NNNN)
		const yearCustomers = customers.filter(
			c => c.customer_number && c.customer_number.startsWith(prefix),
		);
		let maxStandardNumber = 0;

		yearCustomers.forEach(customer => {
			if (customer.customer_number) {
				const match = customer.customer_number.match(/MC-\d{4}-(\d+)/);
				if (match) {
					const number = parseInt(match[1], 10);
					if (number > maxStandardNumber) {
						maxStandardNumber = number;
					}
				}
			}
		});

		// Also check all imported customer numbers for numeric patterns
		// This helps auto-increment work correctly after CSV imports
		let maxImportedNumber = 0;

		customers.forEach(customer => {
			if (customer.customer_number && customer.source === 'csv-import') {
				// Extract all numbers from the customer number
				const numbers = customer.customer_number.match(/\d+/g);
				if (numbers) {
					numbers.forEach(numStr => {
						const num = parseInt(numStr, 10);
						if (num > maxImportedNumber) {
							maxImportedNumber = num;
						}
					});
				}
			}
		});

		// Use the higher of the two maximum numbers found
		const maxNumber = Math.max(maxStandardNumber, maxImportedNumber);

		return `${prefix}${String(maxNumber + 1).padStart(4, '0')}`;
	}

	/**
	 * Create a manual customer with auto-generated customer number
	 * @param data - Customer data (customer_number will be auto-generated if not provided)
	 * @returns Created manual customer
	 */
	async createManualCustomerWithNumber(
		data: Partial<ManualCustomer>,
	): Promise<ManualCustomer> {
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

			return searchableFields.some(
				field => field && field.toLowerCase().includes(term),
			);
		});
	}

	/**
	 * Import customers from CSV data with idempotent behavior
	 * @param csvData - Array of CSV row objects
	 * @param fieldMapping - Mapping of CSV columns to customer fields
	 * @param options - Import options (dryRun, strictMode)
	 * @returns Import results with counts and errors
	 */
	async importFromCSV(
		csvData: CSVCustomerRow[],
		fieldMapping: Record<string, string>,
		options?: {
			dryRun?: boolean;
			strictMode?: boolean;
		},
	): Promise<{
		imported: number;
		updated: number;
		skipped: number;
		errors: string[];
		warnings: string[];
		potentialDuplicates?: Array<{
			row: number;
			reason: string;
			existingCustomer?: any;
		}>;
	}> {
		const results = {
			imported: 0,
			updated: 0,
			skipped: 0,
			errors: [] as string[],
			warnings: [] as string[],
			potentialDuplicates: [] as Array<{
				row: number;
				reason: string;
				existingCustomer?: any;
			}>,
		};

		// Generate timestamp for this import batch
		const importTimestamp = new Date().toISOString().replace(/[:.]/g, '-');

		const startTime = Date.now();
		console.log(
			`🚀 Starting HIGH-PERFORMANCE CSV import for ${csvData.length} rows${options?.dryRun ? ' (DRY RUN)' : ''}`,
		);

		// ✅ PERFORMANCE OPTIMIZATION: Bulk lookup ALL identifiers at once
		const customerNumbers: string[] = [];
		const internalKeys: string[] = [];
		const emails: string[] = [];
		const legacyIds: string[] = [];

		// Extract all identifiers for bulk lookup
		csvData.forEach((row, i) => {
			const customerNumber =
				row[
					Object.keys(fieldMapping).find(
						key => fieldMapping[key] === 'customer_number',
					) || ''
				];
			const internalKey =
				row[
					Object.keys(fieldMapping).find(
						key => fieldMapping[key] === 'internal_key',
					) || ''
				];
			const email =
				row[
					Object.keys(fieldMapping).find(
						key => fieldMapping[key] === 'email',
					) || ''
				];
			const legacyId =
				row[
					Object.keys(fieldMapping).find(
						key => fieldMapping[key] === 'legacy_customer_id',
					) || ''
				];

			if (customerNumber?.trim())
				customerNumbers.push(String(customerNumber).trim());
			if (internalKey?.trim()) internalKeys.push(String(internalKey).trim());
			if (email?.trim()) emails.push(String(email).trim());
			if (legacyId?.trim()) legacyIds.push(String(legacyId).trim());
		});

		console.log(
			`📊 Bulk lookup: ${customerNumbers.length} customer numbers, ${internalKeys.length} internal keys, ${emails.length} emails, ${legacyIds.length} legacy IDs...`,
		);

		// Perform all bulk lookups in parallel
		const [customerNumberMap, internalKeyMap, emailMap, legacyIdMap] =
			await Promise.all([
				customerNumbers.length > 0
					? this.findByCustomerNumbers(customerNumbers)
					: new Map(),
				internalKeys.length > 0
					? this.findByInternalKeys(internalKeys)
					: new Map(),
				emails.length > 0 ? this.findByEmails(emails) : new Map(),
				legacyIds.length > 0
					? this.findByLegacyCustomerIds(legacyIds)
					: new Map(),
			]);

		console.log(
			`✅ Found existing customers: ${customerNumberMap.size} by number, ${internalKeyMap.size} by internal key, ${emailMap.size} by email, ${legacyIdMap.size} by legacy ID`,
		);

		// ✅ PERFORMANCE OPTIMIZATION: Prepare bulk operations
		const customersToCreate: Partial<ManualCustomer>[] = [];
		const customersToUpdate: { id: string; data: Partial<ManualCustomer> }[] =
			[];

		for (let i = 0; i < csvData.length; i++) {
			const row = csvData[i];
			try {
				// Map CSV fields to customer fields
				const customerData: Partial<ManualCustomer> = {};

				// Process field mapping with basic error handling
				Object.entries(fieldMapping).forEach(([csvField, customerField]) => {
					const value = row[csvField];
					if (value !== undefined && value !== '') {
						if (
							customerField === 'total_spent' ||
							customerField === 'total_purchases'
						) {
							const numValue = Number(value);
							customerData[customerField] = isNaN(numValue) ? 0 : numValue;
						} else if (
							customerField === 'birthday' ||
							customerField === 'last_purchase_date' ||
							customerField === 'first_contact_date' ||
							customerField === 'last_contact_date'
						) {
							// Skip problematic date fields for now to avoid errors
							const dateValue = new Date(value);
							if (!isNaN(dateValue.getTime())) {
								customerData[customerField] = dateValue;
							}
						} else {
							customerData[customerField] = value;
						}
					}
				});

				// Set import metadata with timestamp
				customerData.source = 'csv-import';
				customerData.import_reference = `import-${importTimestamp}-row-${i + 1}`;

				// ✅ PERFORMANCE OPTIMIZATION: Multi-key lookup using bulk results (no individual queries)
				let existingCustomer: ManualCustomer | null = null;

				// Priority 1: Check by customer_number (highest priority)
				if (customerData.customer_number?.trim()) {
					existingCustomer =
						customerNumberMap.get(customerData.customer_number.trim()) || null;
				}

				// Priority 2: Check by internal_key if no customer_number match
				if (!existingCustomer && customerData.internal_key?.trim()) {
					existingCustomer =
						internalKeyMap.get(customerData.internal_key.trim()) || null;
					if (existingCustomer) {
						results.warnings.push(
							`Row ${i + 1}: Found existing customer by internal_key (${customerData.internal_key}) but different customer_number`,
						);
					}
				}

				// Priority 3: Check by legacy_customer_id
				if (!existingCustomer && customerData.legacy_customer_id?.trim()) {
					existingCustomer =
						legacyIdMap.get(customerData.legacy_customer_id.trim()) || null;
					if (existingCustomer) {
						results.warnings.push(
							`Row ${i + 1}: Found existing customer by legacy_customer_id (${customerData.legacy_customer_id})`,
						);
					}
				}

				// Priority 4: Check by email for business/legacy customers
				if (
					!existingCustomer &&
					customerData.email?.trim() &&
					(customerData.customer_type === 'business' ||
						customerData.customer_type === 'legacy')
				) {
					existingCustomer =
						emailMap.get(customerData.email.toLowerCase().trim()) || null;
					if (existingCustomer) {
						results.warnings.push(
							`Row ${i + 1}: Found existing business customer by email (${customerData.email})`,
						);
					}
				}

				if (existingCustomer) {
					// Found existing customer - update instead of create
					if (options?.dryRun) {
						results.potentialDuplicates.push({
							row: i + 1,
							reason: `Would update existing customer: ${existingCustomer.customer_number || existingCustomer.email || existingCustomer.id}`,
							existingCustomer: {
								id: existingCustomer.id,
								customer_number: existingCustomer.customer_number,
								name: `${existingCustomer.first_name || ''} ${existingCustomer.last_name || ''}`.trim(),
								email: existingCustomer.email,
								company: existingCustomer.company,
							},
						});
					} else {
						// ✅ PERFORMANCE OPTIMIZATION: Prepare for bulk update
						customersToUpdate.push({
							id: existingCustomer.id,
							data: {
								...customerData,
								last_contact_date: new Date(),
							},
						});
					}
					results.updated++;
				} else {
					// ✅ PERFORMANCE OPTIMIZATION: Prepare for bulk create
					if (!options?.dryRun) {
						customersToCreate.push(customerData);
					}
					results.imported++;
				}

				// Warn if no unique identifiers present
				if (
					!customerData.customer_number &&
					!customerData.internal_key &&
					!customerData.email &&
					!customerData.legacy_customer_id
				) {
					results.warnings.push(
						`Row ${i + 1}: No unique identifier found (customer_number, internal_key, email, or legacy_customer_id). This may cause duplicates on re-import.`,
					);
				}
			} catch (error) {
				results.skipped++;
				const customerNumber =
					row[
						Object.keys(fieldMapping).find(
							key => fieldMapping[key] === 'customer_number',
						) || ''
					] || 'Unknown';
				const errorMessage =
					error instanceof Error ? error.message : 'Unknown error';
				results.errors.push(
					`Row ${i + 1} (Customer: ${customerNumber}): ${errorMessage}`,
				);
				console.error(`Import error on row ${i + 1}:`, error);

				// In strict mode, stop on first error
				if (options?.strictMode) {
					console.error('Strict mode enabled - stopping import on first error');
					break;
				}
			}
		}

		// ✅ PERFORMANCE OPTIMIZATION: Execute bulk operations
		if (!options?.dryRun) {
			const bulkStartTime = Date.now();

			if (customersToCreate.length > 0) {
				console.log(
					`📝 Bulk creating ${customersToCreate.length} new customers...`,
				);
				await this.createManualCustomers(customersToCreate);
			}

			if (customersToUpdate.length > 0) {
				console.log(
					`📝 Bulk updating ${customersToUpdate.length} existing customers...`,
				);
				const updateData = customersToUpdate.map(({ id, data }) => ({
					id,
					...data,
				}));
				await this.updateManualCustomers(updateData);
			}

			const bulkTime = Date.now() - bulkStartTime;
			console.log(`⚡ Bulk operations completed in ${bulkTime}ms`);
		}

		const totalTime = Date.now() - startTime;
		const totalProcessed = results.imported + results.updated + results.skipped;
		const recordsPerSecond =
			totalProcessed > 0 ? Math.round(totalProcessed / (totalTime / 1000)) : 0;

		console.log(
			`🎉 CSV import completed in ${totalTime}ms: ${results.imported} imported, ${results.updated} updated, ${results.skipped} skipped, ${results.warnings.length} warnings (${recordsPerSecond} records/sec)`,
		);
		return results;
	}

	/**
	 * Validate CSV import data before actual import
	 * Checks for potential duplicates and data issues
	 * ✅ PERFORMANCE OPTIMIZED: Uses bulk lookups instead of individual queries
	 * @param csvData - Array of CSV row objects
	 * @param fieldMapping - Mapping of CSV columns to customer fields
	 * @returns Validation results with warnings and potential issues
	 */
	async validateImport(
		csvData: CSVCustomerRow[],
		fieldMapping: Record<string, string>,
	): Promise<{
		valid: boolean;
		totalRows: number;
		potentialDuplicates: number;
		missingIdentifiers: number;
		warnings: string[];
		errors: string[];
		summary: {
			willCreate: number;
			willUpdate: number;
			willSkip: number;
		};
	}> {
		console.log(
			`🔍 Validating CSV import for ${csvData.length} rows (BULK OPTIMIZED)`,
		);

		const warnings: string[] = [];
		const errors: string[] = [];
		let potentialDuplicates = 0;
		let missingIdentifiers = 0;
		let willCreate = 0;
		let willUpdate = 0;
		let willSkip = 0;

		// ✅ PERFORMANCE FIX: Extract all identifiers for bulk lookup (same as importFromCSV)
		const customerNumbers: string[] = [];
		const internalKeys: string[] = [];
		const emails: string[] = [];
		const legacyIds: string[] = [];

		// Extract all identifiers for bulk lookup
		csvData.forEach((row, i) => {
			const customerNumber =
				row[
					Object.keys(fieldMapping).find(
						key => fieldMapping[key] === 'customer_number',
					) || ''
				];
			const internalKey =
				row[
					Object.keys(fieldMapping).find(
						key => fieldMapping[key] === 'internal_key',
					) || ''
				];
			const email =
				row[
					Object.keys(fieldMapping).find(
						key => fieldMapping[key] === 'email',
					) || ''
				];
			const legacyId =
				row[
					Object.keys(fieldMapping).find(
						key => fieldMapping[key] === 'legacy_customer_id',
					) || ''
				];

			if (customerNumber?.trim())
				customerNumbers.push(String(customerNumber).trim());
			if (internalKey?.trim()) internalKeys.push(String(internalKey).trim());
			if (email?.trim()) emails.push(String(email).trim());
			if (legacyId?.trim()) legacyIds.push(String(legacyId).trim());
		});

		console.log(
			`📊 Bulk validation lookup: ${customerNumbers.length} customer numbers, ${internalKeys.length} internal keys, ${emails.length} emails, ${legacyIds.length} legacy IDs...`,
		);

		// ✅ PERFORMANCE FIX: Perform all bulk lookups in parallel (same as importFromCSV)
		const [customerNumberMap, internalKeyMap, emailMap, legacyIdMap] =
			await Promise.all([
				customerNumbers.length > 0
					? this.findByCustomerNumbers(customerNumbers)
					: new Map(),
				internalKeys.length > 0
					? this.findByInternalKeys(internalKeys)
					: new Map(),
				emails.length > 0 ? this.findByEmails(emails) : new Map(),
				legacyIds.length > 0
					? this.findByLegacyCustomerIds(legacyIds)
					: new Map(),
			]);

		console.log(
			`✅ Validation lookups completed: ${customerNumberMap.size} by number, ${internalKeyMap.size} by internal key, ${emailMap.size} by email, ${legacyIdMap.size} by legacy ID`,
		);

		// Process each row using bulk lookup results
		for (let i = 0; i < csvData.length; i++) {
			const row = csvData[i];
			try {
				// Map CSV fields
				const customerData: Partial<ManualCustomer> = {};
				Object.entries(fieldMapping).forEach(([csvField, customerField]) => {
					const value = row[csvField];
					if (value !== undefined && value !== '') {
						customerData[customerField] = value;
					}
				});

				// ✅ PERFORMANCE FIX: Use bulk lookup results instead of individual queries
				let existingCustomer: ManualCustomer | null = null;

				// Priority 1: Check by customer_number (highest priority)
				if (customerData.customer_number?.trim()) {
					existingCustomer =
						customerNumberMap.get(customerData.customer_number.trim()) || null;
				}

				// Priority 2: Check by internal_key if no customer_number match
				if (!existingCustomer && customerData.internal_key?.trim()) {
					existingCustomer =
						internalKeyMap.get(customerData.internal_key.trim()) || null;
				}

				// Priority 3: Check by legacy_customer_id
				if (!existingCustomer && customerData.legacy_customer_id?.trim()) {
					existingCustomer =
						legacyIdMap.get(customerData.legacy_customer_id.trim()) || null;
				}

				// Priority 4: Check by email for business/legacy customers
				if (
					!existingCustomer &&
					customerData.email?.trim() &&
					(customerData.customer_type === 'business' ||
						customerData.customer_type === 'legacy')
				) {
					existingCustomer =
						emailMap.get(customerData.email.toLowerCase().trim()) || null;
				}

				if (existingCustomer) {
					potentialDuplicates++;
					willUpdate++;
					warnings.push(
						`Row ${i + 1}: Will update existing customer "${existingCustomer.customer_number || existingCustomer.email || 'Unknown'}"`,
					);
				} else {
					willCreate++;
				}

				// Check for missing identifiers
				if (
					!customerData.customer_number &&
					!customerData.internal_key &&
					!customerData.email &&
					!customerData.legacy_customer_id
				) {
					missingIdentifiers++;
					warnings.push(
						`Row ${i + 1}: No unique identifier. Re-importing this row will create duplicates.`,
					);
				}

				// Validate required fields
				if (
					!customerData.customer_number &&
					!customerData.first_name &&
					!customerData.last_name &&
					!customerData.company &&
					!customerData.email
				) {
					errors.push(
						`Row ${i + 1}: Missing all identifying fields. At least one of: customer_number, first_name, last_name, company, or email is required.`,
					);
					willSkip++;
					willCreate--;
				}
			} catch (error) {
				errors.push(
					`Row ${i + 1}: Validation error - ${error instanceof Error ? error.message : 'Unknown error'}`,
				);
				willSkip++;
			}
		}

		const valid = errors.length === 0;

		console.log(
			`✅ Bulk validation complete: ${valid ? 'PASSED' : 'FAILED'} - ${errors.length} errors, ${warnings.length} warnings`,
		);

		return {
			valid,
			totalRows: csvData.length,
			potentialDuplicates,
			missingIdentifiers,
			warnings,
			errors,
			summary: {
				willCreate,
				willUpdate,
				willSkip,
			},
		};
	}

	/**
	 * Find existing customer using multiple keys (for idempotent imports)
	 * Checks in priority order: customer_number > internal_key > legacy_customer_id > email
	 * @param customerData - Customer data to check
	 * @returns Existing customer if found, null otherwise
	 */
	private async findExistingCustomer(
		customerData: Partial<ManualCustomer>,
	): Promise<ManualCustomer | null> {
		// Priority 1: Customer number (most reliable unique identifier)
		if (customerData.customer_number?.trim()) {
			const existing = await this.findByCustomerNumber(
				customerData.customer_number.trim(),
			);
			if (existing) return existing;
		}

		// Priority 2: Internal key (system-generated unique key)
		if (customerData.internal_key?.trim()) {
			const existing = await this.findByInternalKey(
				customerData.internal_key.trim(),
			);
			if (existing) return existing;
		}

		// Priority 3: Legacy customer ID (for migrated data)
		if (customerData.legacy_customer_id?.trim()) {
			const existing = await this.findByLegacyCustomerId(
				customerData.legacy_customer_id.trim(),
			);
			if (existing) return existing;
		}

		// Priority 4: Email (reliable for business customers)
		// Only use email matching for business or legacy customers with email
		if (
			customerData.email?.trim() &&
			(customerData.customer_type === 'business' ||
				customerData.customer_type === 'legacy')
		) {
			const existing = await this.findByEmail(customerData.email.trim());
			if (existing) return existing;
		}

		return null;
	}

	/**
	 * Create a manual customer from CSV data without auto-generating customer numbers
	 * @param data - Customer data from CSV
	 * @returns Created manual customer
	 */
	async createManualCustomerFromCSV(
		data: Partial<ManualCustomer>,
	): Promise<ManualCustomer> {
		// For CSV imports, we preserve existing customer numbers and don't auto-generate
		// Set default values
		const customerData = {
			status: 'active',
			customer_type: 'legacy', // CSV imports are typically legacy data
			source: 'csv-import',
			language: 'de',
			total_purchases: 0,
			total_spent: 0,
			is_linked: false,
			...data,
		};

		// Validate that we have some identifying information
		if (
			!customerData.customer_number &&
			!customerData.first_name &&
			!customerData.last_name &&
			!customerData.company &&
			!customerData.email
		) {
			throw new Error(
				'Customer must have at least one identifying field (customer_number, first_name, last_name, company, or email)',
			);
		}

		const [customer] = await this.createManualCustomers([customerData]);
		return customer;
	}

	/**
	 * Record a purchase for a customer
	 * @param customerId - Customer ID
	 * @param amount - Purchase amount in cents
	 * @returns Updated customer
	 */
	async recordPurchase(
		customerId: string,
		amount: number,
	): Promise<ManualCustomer> {
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
	async updateCustomerWithContactTracking(
		customerId: string,
		data: Partial<ManualCustomer>,
	): Promise<ManualCustomer> {
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
		return allCustomers.filter(
			customer => customer.customer_type === customerType,
		);
	}

	/**
	 * Get customers without email addresses
	 * @returns Array of customers without email
	 */
	async getCustomersWithoutEmail(): Promise<ManualCustomer[]> {
		const allCustomers = await this.listManualCustomers({});
		return allCustomers.filter(
			customer => !customer.email || customer.email.trim() === '',
		);
	}

	/**
	 * Get customers without phone numbers
	 * @returns Array of customers without phone
	 */
	async getCustomersWithoutPhone(): Promise<ManualCustomer[]> {
		const allCustomers = await this.listManualCustomers({});
		return allCustomers.filter(
			customer => !customer.phone || customer.phone.trim() === '',
		);
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
		const manualCustomer = allCustomers.find(
			customer => customer.id === manualCustomerId,
		);

		if (!manualCustomer) {
			throw new Error(`Manual customer with ID ${manualCustomerId} not found`);
		}

		// Check if already linked
		if (manualCustomer.is_linked && manualCustomer.core_customer_id) {
			throw new Error(
				`Manual customer is already linked to core customer ${manualCustomer.core_customer_id}`,
			);
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
		const manualCustomer = allCustomers.find(
			customer => customer.id === manualCustomerId,
		);

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
		return allCustomers.filter(
			customer => customer.is_linked && customer.core_customer_id,
		);
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
	async findByCoreCusterId(
		coreCustomerId: string,
	): Promise<ManualCustomer | null> {
		const allCustomers = await this.listManualCustomers({});
		const linkedCustomer = allCustomers.find(
			customer => customer.core_customer_id === coreCustomerId,
		);
		return linkedCustomer || null;
	}

	/**
	 * Find manual customer by customer number (OPTIMIZED)
	 * @param customerNumber - The customer number to find
	 * @returns Manual customer if found, null otherwise
	 */
	async findByCustomerNumber(
		customerNumber: string,
	): Promise<ManualCustomer | null> {
		// ✅ PERFORMANCE FIX: Use filtered query instead of loading all customers
		const customers = await this.listManualCustomers({
			customer_number: customerNumber,
		});
		return customers.length > 0 ? customers[0] : null;
	}

	/**
	 * Find multiple customers by customer numbers in one query (BULK OPTIMIZED)
	 * @param customerNumbers - Array of customer numbers to find
	 * @returns Map of customer_number -> ManualCustomer
	 */
	async findByCustomerNumbers(
		customerNumbers: string[],
	): Promise<Map<string, ManualCustomer>> {
		// ✅ PERFORMANCE FIX: Single query for all customer numbers
		const customers = await this.listManualCustomers({
			customer_number: customerNumbers,
		});

		const customerMap = new Map<string, ManualCustomer>();
		customers.forEach(customer => {
			if (customer.customer_number) {
				customerMap.set(customer.customer_number, customer);
			}
		});

		return customerMap;
	}

	/**
	 * Find multiple customers by internal keys in one query (BULK OPTIMIZED)
	 * @param internalKeys - Array of internal keys to find
	 * @returns Map of internal_key -> ManualCustomer
	 */
	async findByInternalKeys(
		internalKeys: string[],
	): Promise<Map<string, ManualCustomer>> {
		const customers = await this.listManualCustomers({
			internal_key: internalKeys,
		});

		const customerMap = new Map<string, ManualCustomer>();
		customers.forEach(customer => {
			if (customer.internal_key) {
				customerMap.set(customer.internal_key, customer);
			}
		});

		return customerMap;
	}

	/**
	 * Find multiple customers by emails in one query (BULK OPTIMIZED)
	 * @param emails - Array of emails to find
	 * @returns Map of email -> ManualCustomer
	 */
	async findByEmails(emails: string[]): Promise<Map<string, ManualCustomer>> {
		const customers = await this.listManualCustomers({
			email: emails,
		});

		const customerMap = new Map<string, ManualCustomer>();
		customers.forEach(customer => {
			if (customer.email) {
				customerMap.set(customer.email.toLowerCase().trim(), customer);
			}
		});

		return customerMap;
	}

	/**
	 * Find multiple customers by legacy customer IDs in one query (BULK OPTIMIZED)
	 * @param legacyIds - Array of legacy customer IDs to find
	 * @returns Map of legacy_customer_id -> ManualCustomer
	 */
	async findByLegacyCustomerIds(
		legacyIds: string[],
	): Promise<Map<string, ManualCustomer>> {
		const customers = await this.listManualCustomers({
			legacy_customer_id: legacyIds,
		});

		const customerMap = new Map<string, ManualCustomer>();
		customers.forEach(customer => {
			if (customer.legacy_customer_id) {
				customerMap.set(customer.legacy_customer_id, customer);
			}
		});

		return customerMap;
	}

	/**
	 * Find manual customer by internal key (OPTIMIZED)
	 * @param internalKey - The internal key to find
	 * @returns Manual customer if found, null otherwise
	 */
	async findByInternalKey(internalKey: string): Promise<ManualCustomer | null> {
		// ✅ PERFORMANCE FIX: Use filtered query instead of loading all customers
		const customers = await this.listManualCustomers({
			internal_key: internalKey,
		});
		return customers.length > 0 ? customers[0] : null;
	}

	/**
	 * Find manual customer by email (OPTIMIZED)
	 * @param email - The email to find
	 * @returns Manual customer if found, null otherwise
	 */
	async findByEmail(email: string): Promise<ManualCustomer | null> {
		// ✅ PERFORMANCE FIX: Use filtered query instead of loading all customers
		const customers = await this.listManualCustomers({
			email: email.toLowerCase().trim(),
		});
		return customers.length > 0 ? customers[0] : null;
	}

	/**
	 * Find manual customer by legacy customer ID (OPTIMIZED)
	 * @param legacyCustomerId - The legacy customer ID to find
	 * @returns Manual customer if found, null otherwise
	 */
	async findByLegacyCustomerId(
		legacyCustomerId: string,
	): Promise<ManualCustomer | null> {
		// ✅ PERFORMANCE FIX: Use filtered query instead of loading all customers
		const customers = await this.listManualCustomers({
			legacy_customer_id: legacyCustomerId,
		});
		return customers.length > 0 ? customers[0] : null;
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
		const potentialMatches: Array<{
			customer: ManualCustomer;
			matchReasons: string[];
		}> = [];

		for (const customer of allCustomers) {
			// Skip already linked customers
			if (customer.is_linked) {
				continue;
			}

			const matchReasons: string[] = [];

			// Email match (highest priority)
			if (
				coreCustomer.email &&
				customer.email &&
				coreCustomer.email.toLowerCase() === customer.email.toLowerCase()
			) {
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
			if (
				coreCustomer.first_name &&
				coreCustomer.last_name &&
				customer.first_name &&
				customer.last_name
			) {
				const coreFirstName = coreCustomer.first_name.toLowerCase().trim();
				const coreLastName = coreCustomer.last_name.toLowerCase().trim();
				const customerFirstName = customer.first_name.toLowerCase().trim();
				const customerLastName = customer.last_name.toLowerCase().trim();

				if (
					coreFirstName === customerFirstName &&
					coreLastName === customerLastName
				) {
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
	}): Promise<{
		linked: boolean;
		manualCustomer?: ManualCustomer;
		reason?: string;
	}> {
		const potentialMatches = await this.findPotentialMatches(coreCustomer);

		// Only auto-link on very strong matches (email or phone)
		const strongMatches = potentialMatches.filter(
			match =>
				match.matchReasons.includes('email-exact') ||
				match.matchReasons.includes('phone-exact'),
		);

		if (strongMatches.length === 1) {
			// Exactly one strong match - safe to auto-link
			const match = strongMatches[0];
			const linkingMethod = match.matchReasons.includes('email-exact')
				? 'email-match'
				: 'phone-match';

			const linkedCustomer = await this.linkToCustomer(
				match.customer.id,
				coreCustomer.id,
				linkingMethod as any,
			);

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
