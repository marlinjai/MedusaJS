/**
 * /admin/offers/[id]/fulfill/route.ts
 * API route for fulfilling offer reservations
 *
 * This route handles the completion of offers:
 * - Reduce inventory levels for product items
 * - Release reservations
 * - Update offer status to completed
 */

import { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { FulfillOfferReservationsInput } from '../../../../../modules/offer/types';
import { fulfillOfferReservationsWorkflow } from '../../../../../workflows/fulfill-offer-reservations';

// ✅ Use centralized type for workflow input
type FulfillOfferRequest = FulfillOfferReservationsInput;

export async function POST(
	req: MedusaRequest<FulfillOfferRequest>,
	res: MedusaResponse,
) {
	try {
		const { offer_id, user_id } = req.body;

		// ✅ Validate required fields
		if (!offer_id) {
			return res.status(400).json({
				success: false,
				error: 'offer_id is required',
			});
		}

		// ✅ Call workflow for fulfillment
		const result = await fulfillOfferReservationsWorkflow(req.scope).run({
			input: {
				offer_id,
				user_id,
			},
		});

		return res.json({
			success: true,
			result: {
				status: result.result.status,
				offer_id: result.result.offer_id,
				inventory_reduced: result.result.inventory_reduced,
				items_reduced: result.result.items_reduced,
				total_quantity_reduced: result.result.total_quantity_reduced,
				reservations_released: result.result.reservations_released,
				reservations_released_count: result.result.reservations_released_count,
			},
		});
	} catch (error) {
		console.error('Offer fulfillment failed:', error);

		return res.status(500).json({
			success: false,
			error: error.message || 'Failed to fulfill offer',
			details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
		});
	}
}
