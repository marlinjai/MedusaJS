/**
 * reserve-offer-inventory.ts
 * Workflow for creating inventory reservations when offers transition from Draft → Active
 *
 * SINGLE RESPONSIBILITY: Only handles reservation creation
 * USAGE: Called by transition-offer-status.ts for Draft → Active transitions
 */

import { Modules } from '@medusajs/framework/utils';
import {
	createStep,
	createWorkflow,
	StepResponse,
	WorkflowResponse,
} from '@medusajs/framework/workflows-sdk';
import { createReservationsWorkflow } from '@medusajs/medusa/core-flows';

import { OFFER_MODULE } from '../modules/offer';
import {
	CreatedReservation,
	ReserveOfferInventoryInput,
} from '../modules/offer/types';
import { getLogger, validateOfferStep } from './shared/offer-validation';

// Step: Create reservations for all product items in offer
const createOfferReservationsStep = createStep(
	'create-offer-reservations',
	async (input: { offer: any; productItems: any[] }, { container }) => {
		const logger = getLogger(container);
		const inventoryService = container.resolve(Modules.INVENTORY);
		const offerService = container.resolve(OFFER_MODULE);

		if (input.productItems.length === 0) {
			logger.info('[RESERVE-WORKFLOW] No product items to reserve');
			return new StepResponse({ reservations: [] });
		}

		const reservations: CreatedReservation[] = [];

		for (const item of input.productItems) {
			try {
				// Get inventory item by SKU
				const inventoryItems = await inventoryService.listInventoryItems({
					sku: item.sku,
				});
				if (inventoryItems.length === 0) {
					logger.warn(
						`[RESERVE-WORKFLOW] No inventory item found for SKU: ${item.sku}`,
					);
					continue;
				}

				const inventoryItem = inventoryItems[0];

				// Get inventory location
				const inventoryLevels = await inventoryService.listInventoryLevels({
					inventory_item_id: inventoryItem.id,
				});
				if (inventoryLevels.length === 0) {
					logger.warn(
						`[RESERVE-WORKFLOW] No inventory levels found for item: ${inventoryItem.id}`,
					);
					continue;
				}

				const locationId = inventoryLevels[0].location_id;

				// ✅ USE OFFICIAL WORKFLOW: Create reservation with proper error handling & rollback
				const reservationResult = await createReservationsWorkflow(
					container,
				).run({
					input: {
						reservations: [
							{
								inventory_item_id: inventoryItem.id,
								location_id: locationId,
								quantity: item.quantity,
								allow_backorder: true, // Allow backorder for offers
								metadata: {
									type: 'offer',
									offer_id: input.offer.id,
									offer_item_id: item.id,
									variant_id: item.variant_id,
									sku: item.sku,
									created_at: new Date().toISOString(),
								},
							},
						],
					},
				});

				const reservation = reservationResult.result[0];

				// Update offer item with reservation_id for future tracking
				await offerService.updateOfferItems([
					{
						id: item.id,
						reservation_id: reservation.id,
					},
				]);

				reservations.push({
					reservation_id: reservation.id,
					item_id: item.id,
					variant_id: item.variant_id,
					quantity: item.quantity,
				});

				logger.info(
					`[RESERVE-WORKFLOW] Created reservation ${reservation.id} for item ${item.title} (${item.quantity} units)`,
				);
			} catch (error) {
				logger.error(
					`[RESERVE-WORKFLOW] Failed to create reservation for item ${item.id}: ${error.message}`,
				);
				throw error; // Let workflow handle rollback
			}
		}

		return new StepResponse({ reservations });
	},
);

// Main Workflow: Reserve Offer Inventory
export const reserveOfferInventoryWorkflow = createWorkflow(
	'reserve-offer-inventory',
	(input: ReserveOfferInventoryInput) => {
		// Step 1: Validate offer and get product items
		const validation = validateOfferStep({
			offer_id: input.offer_id,
			operation: 'Reserve',
		});

		// Step 2: Create reservations for all product items
		const reservations = createOfferReservationsStep({
			offer: validation.offer,
			productItems: validation.productItems,
		});

		return new WorkflowResponse({
			offer_id: input.offer_id,
			reservations_created: reservations.reservations.length,
			status: 'reserved',
		});
	},
);
