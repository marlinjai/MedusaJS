/**
 * /admin/offers/[id]/release-reservations/route.ts
 * API endpoint for manually releasing inventory reservations
 *
 * This endpoint allows admins to release reservations without changing offer status
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { releaseOfferReservationsWorkflow } from '../../../../../workflows/release-offer-reservations';
import { resolveOfferService } from '../../../../../types/services';

interface ReleaseReservationsParams {
	id: string;
}

export async function POST(
	req: MedusaRequest<{}, ReleaseReservationsParams>,
	res: MedusaResponse,
): Promise<void> {
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
	const { id } = req.params;

	try {
		const offerService = resolveOfferService(req.scope);

		// Get offer details
		const offer = await offerService.getOfferWithDetails(id);

		if (!offer) {
			res.status(404).json({
				success: false,
				error: 'Offer not found',
			});
			return;
		}

		// Validate offer status allows release
		if (!['active', 'accepted'].includes(offer.status)) {
			res.status(400).json({
				success: false,
				error: `Cannot release reservations for offer with status: ${offer.status}. Allowed statuses: active, accepted`,
			});
			return;
		}

		// Check if any items actually have reservation_ids (more reliable than has_reservations flag)
		const productItems = offer.items.filter(
			item => item.item_type === 'product' && item.variant_id && item.sku,
		);
		const itemsWithReservations = productItems.filter(
			item => item.reservation_id,
		);

		if (itemsWithReservations.length === 0) {
			// If no reservation_ids found but flag is set, clean up the flag
			if (offer.has_reservations) {
				logger.info(
					`[RELEASE-RESERVATIONS] Cleaning up orphaned has_reservations flag for offer ${offer.offer_number}`,
				);
				await offerService.updateOffers([
					{
						id: id,
						has_reservations: false,
					},
				]);
			}
			res.status(400).json({
				success: false,
				error: 'Offer has no reservations to release',
			});
			return;
		}

		logger.info(
			`[RELEASE-RESERVATIONS] Manual reservation release requested for offer ${offer.offer_number} (${id})`,
		);

		// Call workflow to release reservations
		const result = await releaseOfferReservationsWorkflow(req.scope).run({
			input: {
				offer_id: id,
				reason: 'Manual release by admin',
			},
		});

		// Update offer has_reservations flag
		await offerService.updateOffers([
			{
				id: id,
				has_reservations: false,
			},
		]);

		logger.info(
			`[RELEASE-RESERVATIONS] Successfully released ${result.result.reservations_released} reservations for offer ${offer.offer_number}`,
		);

		res.json({
			success: true,
			message: `Successfully released reservations for ${result.result.reservations_released} items`,
			offer_id: id,
			offer_number: offer.offer_number,
			reservations_released: result.result.reservations_released,
		});
	} catch (error) {
		logger.error(`[RELEASE-RESERVATIONS] Error releasing reservations:`, error);
		res.status(500).json({
			success: false,
			error: error.message || 'Failed to release reservations',
		});
	}
}

