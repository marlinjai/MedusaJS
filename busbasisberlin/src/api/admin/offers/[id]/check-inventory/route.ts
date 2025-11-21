/**
 * check-inventory/route.ts
 * API endpoint for checking real-time inventory availability for offer items
 * Uses getVariantAvailability to provide accurate stock levels per sales channel
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

import OfferService from '../../../../../modules/offer/service';

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

		// Get offer to check status
		const offer = await offerService.getOfferWithDetails(offerId);

		if (!offer) {
			res.status(404).json({
				error: 'Not found',
				message: 'Offer not found',
			});
			return;
		}

		// Don't check inventory for cancelled offers
		if (offer.status === 'cancelled') {
			res.status(400).json({
				error: 'Invalid operation',
				message: 'Cannot check inventory for cancelled offers',
			});
			return;
		}

		// ✅ USE SERVICE METHOD: Delegate to centralized inventory check logic
		// This ensures reservation-based availability is handled correctly
		// Pass the query service from the request scope to the service
		const query = req.scope.resolve('query');
		const inventoryStatus = await offerService.checkOfferInventoryAvailability(
			offerId,
			query,
		);

		// Add extra metadata for API response
		const response = {
			...inventoryStatus,
			checked_at: new Date().toISOString(),
		};

		res.json(response);
	} catch (error) {
		logger.error('Error checking offer inventory:', error);
		res.status(500).json({
			error: 'Failed to check inventory',
			message: error.message,
		});
	}
}
