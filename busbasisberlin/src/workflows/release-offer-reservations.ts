/**
 * release-offer-reservations.ts
 * Workflow for releasing inventory reservations when offers are cancelled or completed
 *
 * SINGLE RESPONSIBILITY: Only handles reservation deletion/cleanup
 * USAGE: Called by transition-offer-status.ts for cancellation and fulfill-offer-reservations.ts
 */

import {
	createStep,
	createWorkflow,
	StepResponse,
	WorkflowResponse,
} from '@medusajs/framework/workflows-sdk';
import { deleteReservationsWorkflow } from '@medusajs/medusa/core-flows';

import { ReleaseOfferReservationsInput } from '../modules/offer/types';
import { resolveOfferService } from '../types/services';
import { getLogger, validateOfferStep } from './shared/offer-validation';

// Step: Release all reservations for offer product items
const releaseOfferReservationsStep = createStep(
	'release-offer-reservations',
	async (
		input: { offer: any; productItems: any[]; reason?: string },
		{ container },
	) => {
		const logger = getLogger(container);
		const offerService = resolveOfferService(container);

		const releasedReservations: string[] = [];

		for (const item of input.productItems) {
			// Skip items without reservations
			if (!item.reservation_id) {
				logger.info(
					`[RELEASE-WORKFLOW] Item ${item.title} has no reservation to release`,
				);
				continue;
			}

			try {
				// ✅ USE OFFICIAL WORKFLOW: Delete reservation with proper error handling & rollback
				await deleteReservationsWorkflow(container).run({
					input: { ids: [item.reservation_id] },
				});

				releasedReservations.push(item.reservation_id);

				// Clear reservation_id from offer item
				await offerService.updateOfferItems([
					{
						id: item.id,
						reservation_id: null,
					},
				]);

				logger.info(
					`[RELEASE-WORKFLOW] Released reservation ${item.reservation_id} for item ${item.title}${input.reason ? ` (${input.reason})` : ''}`,
				);
			} catch (error) {
				logger.error(
					`[RELEASE-WORKFLOW] Failed to release reservation ${item.reservation_id}: ${error.message}`,
				);
				throw error; // Let workflow handle rollback
			}
		}

		return new StepResponse({ releasedReservations });
	},
);

// Main Workflow: Release Offer Reservations
export const releaseOfferReservationsWorkflow = createWorkflow(
	'release-offer-reservations',
	(input: ReleaseOfferReservationsInput) => {
		// Step 1: Validate offer and get product items
		const validation = validateOfferStep({
			offer_id: input.offer_id,
			operation: 'Release',
		});

		// Step 2: Release all reservations
		const release = releaseOfferReservationsStep({
			offer: validation.offer,
			productItems: validation.productItems,
			reason: input.reason,
		});

		return new WorkflowResponse({
			offer_id: input.offer_id,
			reservations_released: release.releasedReservations.length,
			status: 'released',
		});
	},
);
