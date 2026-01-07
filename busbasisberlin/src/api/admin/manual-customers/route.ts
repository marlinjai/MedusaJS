/**
 * route.ts
 * Admin API routes for manual customers
 * Handles list and create operations for manual customers
 * Includes Zod validation for input validation and type safety
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { z } from 'zod';

import { MANUAL_CUSTOMER_MODULE } from '../../../modules/manual-customer';
import ManualCustomerService from '../../../modules/manual-customer/service';

// Zod validation schemas
const listManualCustomersSchema = z.object({
	search: z.string().optional(),
	customer_type: z.string().optional(),
	status: z.string().optional(),
	source: z.string().optional(),
	limit: z.coerce.number().min(1).max(250).default(20),
	offset: z.coerce.number().min(0).default(0),
	sort_by: z.string().optional(),
	sort_direction: z.enum(['asc', 'desc']).default('asc'),
}).catchall(z.string()); // Allow filter_* parameters

const createManualCustomerSchema = z.object({
	customer_number: z.string().optional(),
	customer_type: z.string().optional(),
	status: z.string().default('active'),
	salutation: z.string().optional(),
	first_name: z.string().optional(),
	last_name: z.string().optional(),
	company: z.string().optional(),
	email: z.string().email().optional().or(z.literal('')),
	phone: z.string().optional(),
	website: z.string().url().optional().or(z.literal('')),
	street: z.string().optional(),
	postal_code: z.string().optional(),
	city: z.string().optional(),
	country: z.string().optional(),
	vat_id: z.string().optional(),
	tax_rate: z.string().optional(),
});

// GET /admin/manual-customers - List all manual customers with filtering, sorting, and search
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
	const manualCustomerService: ManualCustomerService = req.scope.resolve(
		MANUAL_CUSTOMER_MODULE,
	);

	try {
		// Validate query parameters
		const params = listManualCustomersSchema.parse(req.query);

		const sortBy = params.sort_by || '';
		const sortDirection = params.sort_direction;

		// Extract column filters (parameters starting with 'filter_')
		const columnFilters: Record<string, string> = {};
		Object.entries(params).forEach(([key, value]) => {
			if (key.startsWith('filter_') && value) {
				const filterKey = key.replace('filter_', '');
				columnFilters[filterKey] = String(value);
			}
		});

		let customers;
		let totalCount = 0;

		// If search term is provided, use search functionality
		if (params.search) {
			const searchResults = await manualCustomerService.searchCustomers(params.search);
			customers = searchResults;
			totalCount = searchResults.length;
		} else {
			// Build filter object from validated params
			const filters: any = {};

			if (params.customer_type) filters.customer_type = params.customer_type;
			if (params.status) filters.status = params.status;
			if (params.source) filters.source = params.source;

			// Get all customers with basic filters
			customers = await manualCustomerService.listManualCustomers(filters);
			totalCount = customers.length;
		}

		// Apply column filters
		if (Object.keys(columnFilters).length > 0) {
			customers = customers.filter((customer: any) => {
				return Object.entries(columnFilters).every(([key, value]) => {
					const filterValue = String(value).toLowerCase();

					switch (key) {
						case 'customer_number':
							return String(customer.customer_number || '')
								.toLowerCase()
								.includes(filterValue);
						case 'name':
							const displayName =
								customer.company ||
								`${customer.first_name || ''} ${customer.last_name || ''}`.trim() ||
								'Unbekannt';
							return displayName.toLowerCase().includes(filterValue);
						case 'contact':
							const contacts = [customer.email, customer.phone, customer.mobile]
								.filter(Boolean)
								.join(' ');
							return contacts.toLowerCase().includes(filterValue);
						case 'address':
							const addressParts = [
								customer.street,
								customer.postal_code,
								customer.city,
							]
								.filter(Boolean)
								.join(' ');
							return addressParts.toLowerCase().includes(filterValue);
						case 'customer_type':
							return customer.customer_type === String(value);
						case 'status':
							return customer.status === String(value);
						default:
							return true;
					}
				});
			});
			totalCount = customers.length;
		}

		// Apply sorting
		if (sortBy) {
			customers.sort((a: any, b: any) => {
				let aValue, bValue;

				switch (sortBy) {
					case 'customer_number':
						aValue = parseInt(a.customer_number) || 0;
						bValue = parseInt(b.customer_number) || 0;
						break;
					case 'name':
						aValue =
							a.company ||
							`${a.first_name || ''} ${a.last_name || ''}`.trim() ||
							'Unbekannt';
						bValue =
							b.company ||
							`${b.first_name || ''} ${b.last_name || ''}`.trim() ||
							'Unbekannt';
						aValue = aValue.toLowerCase();
						bValue = bValue.toLowerCase();
						break;
					case 'customer_type':
						aValue = a.customer_type || '';
						bValue = b.customer_type || '';
						break;
					case 'status':
						aValue = a.status || '';
						bValue = b.status || '';
						break;
					case 'total_purchases':
						aValue = a.total_purchases || 0;
						bValue = b.total_purchases || 0;
						break;
					case 'total_spent':
						aValue = a.total_spent || 0;
						bValue = b.total_spent || 0;
						break;
					case 'created_at':
						aValue = new Date(a.created_at).getTime();
						bValue = new Date(b.created_at).getTime();
						break;
					default:
						aValue = a[sortBy] || '';
						bValue = b[sortBy] || '';
				}

				if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
				if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
				return 0;
			});
		}

		// Apply pagination after filtering and sorting
		const paginatedCustomers = customers.slice(params.offset, params.offset + params.limit);

		// Get statistics (these are global stats, not filtered)
		const stats = await manualCustomerService.getStatistics();

		res.json({
			customers: paginatedCustomers,
			stats,
			count: paginatedCustomers.length,
			total: totalCount,
			limit: params.limit,
			offset: params.offset,
			has_more: params.offset + params.limit < totalCount,
		});
	} catch (error) {
		// Handle Zod validation errors
		if (error instanceof z.ZodError) {
			return res.status(400).json({
				error: 'Validation error',
				details: error.errors,
			});
		}

		console.error('Error fetching manual customers:', error);
		res.status(500).json({ error: 'Fehler beim Laden der Kunden' });
	}
};

// POST /admin/manual-customers - Create a new manual customer
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
	const manualCustomerService: ManualCustomerService = req.scope.resolve(
		MANUAL_CUSTOMER_MODULE,
	);

	try {
		// Validate request body with Zod
		const customerData = createManualCustomerSchema.parse(req.body);

		const customer =
			await manualCustomerService.createManualCustomerWithNumber(customerData);

		res.status(201).json({
			customer,
			message: 'Manual customer created successfully',
		});
	} catch (error) {
		// Handle Zod validation errors
		if (error instanceof z.ZodError) {
			return res.status(400).json({
				error: 'Validation error',
				details: error.errors,
			});
		}

		console.error('Error creating manual customer:', error);
		res.status(500).json({
			error: 'Failed to create manual customer',
			message: error instanceof Error ? error.message : 'Unknown error',
		});
	}
};
