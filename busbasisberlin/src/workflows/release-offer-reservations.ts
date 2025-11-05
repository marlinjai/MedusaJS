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
import { Modules } from '@medusajs/framework/utils';

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
		const inventoryService = container.resolve(Modules.INVENTORY);

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
				// ✅ Check if reservation actually exists before trying to delete
				let reservationExists = false;
				try {
					const reservation = await inventoryService.retrieveReservationItem(
						item.reservation_id,
					);
					reservationExists = !!reservation;
				} catch (checkError: any) {
					// Reservation doesn't exist - this is an orphaned reservation_id
					if (
						checkError.message?.includes('not found') ||
						checkError.message?.includes('does not exist') ||
						checkError.message?.includes('ReservationItem') ||
						checkError.type === 'not_found'
					) {
						logger.warn(
							`[RELEASE-WORKFLOW] Reservation ${item.reservation_id} for item ${item.title} does not exist (orphaned reservation_id) - cleaning up`,
						);
						reservationExists = false;
					} else {
						// Unexpected error - log but continue
						logger.warn(
							`[RELEASE-WORKFLOW] Could not check reservation ${item.reservation_id}: ${checkError.message}`,
						);
						// Assume it doesn't exist to avoid failing the workflow
						reservationExists = false;
					}
				}

				if (reservationExists) {
					// ✅ USE OFFICIAL WORKFLOW: Delete reservation with proper error handling & rollback
					try {
						await deleteReservationsWorkflow(container).run({
							input: { ids: [item.reservation_id] },
						});

						releasedReservations.push(item.reservation_id);
						logger.info(
							`[RELEASE-WORKFLOW] Released reservation ${item.reservation_id} for item ${item.title}${input.reason ? ` (${input.reason})` : ''}`,
						);
					} catch (deleteError: any) {
						// If deletion fails because reservation doesn't exist, treat as success
						if (
							deleteError.message?.includes('not found') ||
							deleteError.message?.includes('does not exist')
						) {
							logger.warn(
								`[RELEASE-WORKFLOW] Reservation ${item.reservation_id} was already deleted`,
							);
							releasedReservations.push(item.reservation_id);
						} else {
							throw deleteError;
						}
					}
				} else {
					// Reservation doesn't exist - count as cleaned up
					releasedReservations.push(item.reservation_id);
					logger.info(
						`[RELEASE-WORKFLOW] Cleaned up orphaned reservation_id ${item.reservation_id} for item ${item.title}`,
					);
				}

				// Always clear reservation_id from offer item, even if reservation was already deleted
				await offerService.updateOfferItems([
					{
						id: item.id,
						reservation_id: null,
					},
				]);
			} catch (error: any) {
				logger.error(
					`[RELEASE-WORKFLOW] Failed to release reservation ${item.reservation_id}: ${error.message}`,
				);
				// Don't throw - continue with other items and clean up orphaned reservation_id
				// Clear the reservation_id even if deletion failed
				try {
					await offerService.updateOfferItems([
						{
							id: item.id,
							reservation_id: null,
						},
					]);
					releasedReservations.push(item.reservation_id); // Count as cleaned up
				} catch (cleanupError: any) {
					logger.error(
						`[RELEASE-WORKFLOW] Failed to cleanup reservation_id for item ${item.id}: ${cleanupError.message}`,
					);
				}
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
