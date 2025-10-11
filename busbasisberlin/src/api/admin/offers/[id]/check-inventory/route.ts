/**
 * check-inventory/route.ts
 * API endpoint for checking real-time inventory availability for offer items
 * Uses getVariantAvailability to provide accurate stock levels per sales channel
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import {
	ContainerRegistrationKeys,
	getVariantAvailability,
} from '@medusajs/framework/utils';

import OfferService from '../../../../../modules/offer/service';
import { getDefaultSalesChannelIdFromQuery } from '../../../../../utils/sales-channel-helper';

// Module constant for service resolution
const OFFER_MODULE = 'offer';

interface OfferParams {
	id: string;
}

/**
 * GET /admin/offers/:id/check-inventory
 * Check real-time inventory availability for all product items in an offer
 */
export async function GET(
	req: MedusaRequest<OfferParams>,
	res: MedusaResponse,
): Promise<void> {
	const offerService: OfferService = req.scope.resolve(OFFER_MODULE);
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	try {
		const { id: offerId } = req.params;

		if (!offerId) {
			res.status(400).json({
				error: 'Validation error',
				message: 'Offer ID is required',
			});
			return;
		}

		// Get offer with items
		const offer = await offerService.getOfferWithDetails(offerId);
		if (!offer) {
			res.status(404).json({
				error: 'Not found',
				message: 'Offer not found',
			});
			return;
		}

		// Get the query module for inventory checks
		const query = req.scope.resolve('query');

		// Get the default sales channel ID dynamically
		const sales_channel_id = await getDefaultSalesChannelIdFromQuery(query);
		logger.info(
			`[INVENTORY-CHECK] Using sales channel ID: ${sales_channel_id}`,
		);

		// Filter product items that have variant_id
		const productItems = offer.items.filter(
			item => item.item_type === 'product' && item.variant_id,
		);

		// Get all variant IDs for inventory check
		const variantIds = productItems
			.map(item => item.variant_id)
			.filter((variantId): variantId is string => Boolean(variantId));

		logger.info(
			`[INVENTORY-CHECK] Checking inventory for ${variantIds.length} variants in offer ${offer.offer_number}`,
		);

		let inventoryMap: Record<string, number> = {};

		if (variantIds.length > 0) {
			try {
				// Use getVariantAvailability to get real-time inventory data
				// @ts-ignore - Type conflict between @medusajs/types versions
				const availability = await getVariantAvailability(query, {
					variant_ids: variantIds,
					sales_channel_id,
				});

				// Map variant IDs to available quantities
				inventoryMap = Object.fromEntries(
					Object.entries(availability).map(
						([variantId, data]: [string, any]) => [
							variantId,
							data.availability || 0,
						],
					),
				);

				logger.info(
					`[INVENTORY-CHECK] Retrieved inventory for ${Object.keys(inventoryMap).length} variants`,
				);
			} catch (error) {
				logger.error(
					`[INVENTORY-CHECK] Error getting variant availability: ${error.message}`,
				);
				// Fallback: set all variants to 0 inventory
				variantIds.forEach(variantId => {
					if (variantId) {
						inventoryMap[variantId] = 0;
					}
				});
			}
		}

		// Build inventory status for each item
		const itemStatuses = offer.items.map(item => {
			if (item.item_type === 'service') {
				return {
					item_id: item.id,
					available_quantity: null, // Services don't have inventory
					is_available: true,
					stock_status: 'service',
				};
			}

			if (!item.variant_id) {
				return {
					item_id: item.id,
					available_quantity: 0,
					is_available: false,
					stock_status: 'no_variant',
				};
			}

			const availableQuantity = inventoryMap[item.variant_id] || 0;
			const requiredQuantity = item.quantity;
			const isAvailable = availableQuantity >= requiredQuantity;

			let stockStatus = 'available';
			if (availableQuantity <= 0) {
				stockStatus = 'out_of_stock';
			} else if (availableQuantity < requiredQuantity) {
				stockStatus = 'insufficient';
			} else if (availableQuantity <= 5) {
				stockStatus = 'low_stock';
			}

			return {
				item_id: item.id,
				available_quantity: availableQuantity,
				is_available: isAvailable,
				stock_status: stockStatus,
				required_quantity: requiredQuantity,
			};
		});

		// Calculate overall status
		const hasOutOfStock = itemStatuses.some(
			item =>
				item.stock_status === 'out_of_stock' ||
				item.stock_status === 'insufficient',
		);
		const hasLowStock = itemStatuses.some(
			item => item.stock_status === 'low_stock',
		);
		const canComplete = !hasOutOfStock;

		const inventoryStatus = {
			can_complete: canComplete,
			has_out_of_stock: hasOutOfStock,
			has_low_stock: hasLowStock,
			items: itemStatuses,
			checked_at: new Date().toISOString(),
			sales_channel_id,
		};

		logger.info(
			`[INVENTORY-CHECK] Offer ${offer.offer_number} inventory status: ${canComplete ? 'READY' : 'NOT READY'}`,
		);

		res.json(inventoryStatus);
	} catch (error) {
		logger.error('Error checking offer inventory:', error);
		res.status(500).json({
			error: 'Failed to check inventory',
			message: error.message,
		});
	}
}
