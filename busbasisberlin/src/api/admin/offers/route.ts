/**
 * route.ts
 * Main admin API route for offer management
 * Handles GET (list offers) and POST (create offer) operations
 * Includes Zod validation for input validation and type safety
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { z } from 'zod';

import OfferService from '../../../modules/offer/service';
import { CreateOfferInput } from '../../../modules/offer/types';
import { MANUAL_CUSTOMER_MODULE } from '../../../modules/manual-customer';
import ManualCustomerService from '../../../modules/manual-customer/service';

// Zod validation schemas
const listOffersSchema = z.object({
	limit: z.coerce.number().min(1).max(250).default(20),
	offset: z.coerce.number().min(0).default(0),
	status: z.string().optional(),
	customer_email: z.string().optional(),
	created_by: z.string().optional(),
	assigned_to: z.string().optional(),
	created_after: z.string().optional(),
	created_before: z.string().optional(),
	valid_after: z.string().optional(),
	valid_before: z.string().optional(),
});

// Module constant for service resolution
const OFFER_MODULE = 'offer';

// ✅ Use centralized types instead of redeclaring
type CreateOfferRequest = CreateOfferInput;

interface ListOffersQuery {
	limit?: number;
	offset?: number;
	status?: string;
	customer_email?: string;
	created_by?: string;
	assigned_to?: string;
	created_after?: string;
	created_before?: string;
	valid_after?: string;
	valid_before?: string;
}

/**
 * GET /admin/offers
 * List all offers with optional filtering
 */
export async function GET(
	req: MedusaRequest<ListOffersQuery>,
	res: MedusaResponse,
): Promise<void> {
	const offerService: OfferService = req.scope.resolve(OFFER_MODULE);
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	try {
		// Validate query parameters
		const params = listOffersSchema.parse(req.query);

		// Build filters from validated params
		const filters: any = {};

		if (params.status) filters.status = params.status;
		if (params.customer_email) filters.customer_email = params.customer_email;
		if (params.created_by) filters.created_by = params.created_by;
		if (params.assigned_to) filters.assigned_to = params.assigned_to;
		if (params.created_after)
			filters.created_at = { $gte: new Date(params.created_after) };
		if (params.created_before) {
			filters.created_at = {
				...filters.created_at,
				$lte: new Date(params.created_before),
			};
		}
		if (params.valid_after)
			filters.valid_until = { $gte: new Date(params.valid_after) };
		if (params.valid_before) {
			filters.valid_until = {
				...filters.valid_until,
				$lte: new Date(params.valid_before),
			};
		}

		// Get offers from service
		const offers = await offerService.listOffers(filters, {
			take: params.limit,
			skip: params.offset,
		});

		// Get total count for pagination
		const totalCount = await offerService.listOffers(filters);

		// Get statistics for dashboard
		const backendStats = await offerService.getOfferStatistics();

		// Transform stats to match frontend expectations
		const stats = {
			total: backendStats.total_offers,
			draft: backendStats.draft_offers,
			active: backendStats.active_offers,
			accepted: backendStats.pending_acceptance,
			completed: backendStats.completed_offers,
			cancelled: backendStats.cancelled_offers,
			// Value sums by status
			draftValue: backendStats.draft_value,
			activeValue: backendStats.active_value,
			acceptedValue: backendStats.accepted_value,
			completedValue: backendStats.completed_value,
			cancelledValue: backendStats.cancelled_value,
			// Total value (excludes cancelled and draft)
			totalValue: backendStats.total_value,
		};

		res.json({
			offers,
			count: totalCount.length,
			offset: params.offset,
			limit: params.limit,
			stats,
		});
	} catch (error) {
		// Handle Zod validation errors
		if (error instanceof z.ZodError) {
			res.status(400).json({
				error: 'Validation error',
				details: error.errors,
			});
			return;
		}

		logger.error('Error listing offers:', error);
		res.status(500).json({
			error: 'Failed to list offers',
			message: error.message,
		});
	}
}

/**
 * POST /admin/offers
 * Create a new offer with items
 */
export async function POST(
	req: MedusaRequest<CreateOfferRequest>,
	res: MedusaResponse,
): Promise<void> {
	const offerService: OfferService = req.scope.resolve(OFFER_MODULE);
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	try {
		const {
			description,
			customer_name,
			customer_email,
			customer_phone,
			customer_address,
			valid_until,
			internal_notes,
			customer_notes,
			currency_code,
			items = [],
			core_customer_id, // NEW: Support selecting core customers
			manual_customer_id, // NEW: Explicit manual customer ID
		} = req.body;

		// NEW: Handle core customer selection - auto-create manual customer if needed
		let finalCustomerName = customer_name;
		let finalCustomerEmail = customer_email;
		let finalCustomerPhone = customer_phone;
		let finalCustomerAddress = customer_address;

		if (core_customer_id && !manual_customer_id) {
			const manualCustomerService = req.scope.resolve(MANUAL_CUSTOMER_MODULE);
			const query = req.scope.resolve('query');

			// Get core customer data
			const { data: coreCustomers } = await query.graph({
				entity: 'customer',
				fields: ['id', 'email', 'first_name', 'last_name', 'phone'],
				filters: { id: core_customer_id },
			});

			const coreCustomer = coreCustomers[0];
			if (!coreCustomer) {
				res.status(400).json({
					error: 'Validation error',
					message: 'Core customer not found',
				});
				return;
			}

			// Try to auto-link to existing manual customer
			const linkResult = await manualCustomerService.autoLinkCustomer({
				id: coreCustomer.id,
				email: coreCustomer.email || undefined,
				first_name: coreCustomer.first_name || undefined,
				last_name: coreCustomer.last_name || undefined,
				phone: coreCustomer.phone || undefined,
			});

			if (linkResult.linked && linkResult.manualCustomer) {
				// Use linked manual customer's data
				logger.info(`Auto-linked core customer ${core_customer_id} to existing manual customer`);
				finalCustomerName = linkResult.manualCustomer.company ||
					`${linkResult.manualCustomer.first_name} ${linkResult.manualCustomer.last_name}`.trim();
				finalCustomerEmail = linkResult.manualCustomer.email || coreCustomer.email;
				finalCustomerPhone = linkResult.manualCustomer.phone || coreCustomer.phone;
				finalCustomerAddress = `${linkResult.manualCustomer.street} ${linkResult.manualCustomer.street_number}, ${linkResult.manualCustomer.postal_code} ${linkResult.manualCustomer.city}`.trim();
			} else {
				// No existing match - create new manual customer and link
				logger.info(`Creating new manual customer for core customer ${core_customer_id}`);

				const newManualCustomer = await manualCustomerService.createManualCustomerWithNumber({
					first_name: coreCustomer.first_name,
					last_name: coreCustomer.last_name,
					email: coreCustomer.email,
					phone: coreCustomer.phone,
					customer_type: 'business', // Default type
					source: 'auto-linked',
					status: 'active',
				});

				// Link the newly created manual customer to core customer
				await manualCustomerService.linkToCustomer(
					newManualCustomer.id,
					core_customer_id,
					'manual-link',
				);

				logger.info(`Created and linked manual customer ${newManualCustomer.id} to core customer ${core_customer_id}`);

				// Use core customer data for offer
				finalCustomerName = customer_name || `${coreCustomer.first_name} ${coreCustomer.last_name}`.trim();
				finalCustomerEmail = customer_email || coreCustomer.email;
				finalCustomerPhone = customer_phone || coreCustomer.phone;
				finalCustomerAddress = customer_address || '';
			}
		}

		// Validate items
		if (items.length === 0) {
			res.status(400).json({
				error: 'Validation error',
				message: 'At least one item is required',
			});
			return;
		}

		for (const [index, item] of items.entries()) {
			if (!item.item_type || !['product', 'service'].includes(item.item_type)) {
				res.status(400).json({
					error: 'Validation error',
					message: `Item ${index + 1}: item_type must be 'product' or 'service'`,
				});
				return;
			}

			if (!item.quantity || item.quantity <= 0) {
				res.status(400).json({
					error: 'Validation error',
					message: `Item ${index + 1}: quantity must be greater than 0`,
				});
				return;
			}

			if (!item.unit_price || item.unit_price < 0) {
				res.status(400).json({
					error: 'Validation error',
					message: `Item ${index + 1}: unit_price must be greater than or equal to 0`,
				});
				return;
			}
		}

		// Prepare offer data (use final customer data which may come from core customer)
		const offerData = {
			description: description?.trim(),
			customer_name: finalCustomerName?.trim(),
			customer_email: finalCustomerEmail?.trim(),
			customer_phone: finalCustomerPhone?.trim(),
			customer_address: finalCustomerAddress?.trim(),
			valid_until: valid_until ? new Date(valid_until) : undefined,
			internal_notes: internal_notes?.trim(),
			customer_notes: customer_notes?.trim(),
			currency_code: currency_code || 'EUR',
			items,
		};

		// Create offer with items
		const newOffer = await offerService.createOfferWithItems(offerData);

		logger.info(`Offer created successfully: ${newOffer.offer_number}`);

		res.status(201).json({
			offer: newOffer,
			message: 'Offer created successfully',
		});
	} catch (error) {
		// Handle Zod validation errors
		if (error instanceof z.ZodError) {
			res.status(400).json({
				error: 'Validation error',
				details: error.errors,
			});
			return;
		}

		logger.error('Error creating offer:', error);
		res.status(500).json({
			error: 'Failed to create offer',
			message: error.message,
		});
	}
}
