/**
 * /admin/offers/[id]/reserve-inventory/route.ts
 * API route for manually reserving inventory for an offer
 *
 * This route allows admins to manually reserve inventory via button click.
 * Inventory is no longer reserved automatically on draft → active transition.
 */

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { resolveOfferService } from '../../../../../types/services';
import { reserveOfferInventoryWorkflow } from '../../../../../workflows/reserve-offer-inventory';

interface ReserveInventoryParams {
	id: string;
}

export async function POST(
	req: MedusaRequest<{}, ReserveInventoryParams>,
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

		// Validate offer status allows reservation
		if (!['draft', 'active'].includes(offer.status)) {
			res.status(400).json({
				success: false,
				error: `Cannot reserve inventory for offer with status: ${offer.status}. Allowed statuses: draft, active`,
			});
			return;
		}

		// Check if offer has product items
		const productItems = offer.items.filter(
			item => item.item_type === 'product' && item.variant_id && item.sku,
		);

		if (productItems.length === 0) {
			res.status(400).json({
				success: false,
				error: 'Offer does not have any product items to reserve',
			});
			return;
		}

		// Check if any items already have reservations (more reliable than has_reservations flag)
		const itemsWithReservations = productItems.filter(
			item => item.reservation_id,
		);

		if (itemsWithReservations.length > 0) {
			res.status(400).json({
				success: false,
				error: `Offer already has reservations for ${itemsWithReservations.length} item(s). Cannot create duplicate reservations.`,
			});
			return;
		}

		logger.info(
			`[RESERVE-INVENTORY] Manual inventory reservation requested for offer ${offer.offer_number} (${id})`,
		);

		// Call workflow to reserve inventory
		const result = await reserveOfferInventoryWorkflow(req.scope).run({
			input: {
				offer_id: id,
			},
		});

		const itemsSkipped = result.result.items_skipped || [];
		const reservationsCreated = result.result.reservations_created;

		logger.info(
			`[RESERVE-INVENTORY] Created ${reservationsCreated} reservations for offer ${offer.offer_number}` +
				(itemsSkipped.length > 0
					? `, ${itemsSkipped.length} item(s) skipped`
					: ''),
		);

		if (itemsSkipped.length > 0) {
			logger.warn(
				`[RESERVE-INVENTORY] Skipped items: ${JSON.stringify(itemsSkipped)}`,
			);
		}

		// Update offer has_reservations flag if reservations were created
		if (reservationsCreated > 0) {
			await offerService.updateOffers([
				{
					id: id,
					has_reservations: true,
				},
			]);
		}

		// Build response message
		let message = `Successfully reserved inventory for ${reservationsCreated} item(s)`;
		if (itemsSkipped.length > 0) {
			message += `. ${itemsSkipped.length} item(s) could not be reserved.`;
		}

		res.json({
			success: true,
			message,
			offer_id: id,
			offer_number: offer.offer_number,
			reservations_created: reservationsCreated,
			items_skipped: itemsSkipped,
			status: result.result.status,
		});
	} catch (error) {
		logger.error(`[RESERVE-INVENTORY] Error reserving inventory:`, error);

		res.status(500).json({
			success: false,
			error: error.message || 'Failed to reserve inventory',
			details:
				process.env.NODE_ENV === 'development' ? error.stack : undefined,
		});
	}
}

