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

import {
	CreatedReservation,
	ReserveOfferInventoryInput,
	SkippedItem,
} from '../modules/offer/types';
import { resolveOfferService } from '../types/services';
import { getLogger, validateOfferStep } from './shared/offer-validation';

// Step: Create reservations for all product items in offer
const createOfferReservationsStep = createStep(
	'create-offer-reservations',
	async (
		input: { offer: any; productItems: any[]; filteredOutItems: SkippedItem[] },
		{ container },
	) => {
		const logger = getLogger(container);
		const inventoryService = container.resolve(Modules.INVENTORY);
		const offerService = resolveOfferService(container);

		// Start with items filtered out by validation (manage_inventory: false)
		const skippedItems: SkippedItem[] = [...(input.filteredOutItems || [])];

		if (input.productItems.length === 0) {
			logger.info('[RESERVE-WORKFLOW] No product items to reserve');
			// Calculate status - if we have skipped items it's partial, otherwise failed
			const earlyStatus = skippedItems.length > 0 ? 'partial' : 'failed';
			return new StepResponse({
				reservations: [] as CreatedReservation[],
				skippedItems,
				reservations_created: 0,
				status: earlyStatus as 'reserved' | 'partial' | 'failed',
			});
		}

		const reservations: CreatedReservation[] = [];

		for (const item of input.productItems) {
			try {
				// ✅ CHECK: Skip items that already have reservations
				if (item.reservation_id) {
					logger.info(
						`[RESERVE-WORKFLOW] Item ${item.title} already has reservation ${item.reservation_id}, skipping`,
					);
					skippedItems.push({
						item_id: item.id,
						title: item.title,
						sku: item.sku,
						reason: 'already_reserved',
					});
					continue;
				}

				// ✅ Normalize SKU to lowercase for lookup (SKUs should always be lowercase)
				const normalizedSku = item.sku?.toLowerCase();

				// Get inventory item by normalized SKU
				let inventoryItems = await inventoryService.listInventoryItems({
					sku: normalizedSku,
				});

				// Fallback: try original casing for backwards compatibility
				if (inventoryItems.length === 0 && item.sku !== normalizedSku) {
					logger.info(
						`[RESERVE-WORKFLOW] No inventory for lowercase SKU ${normalizedSku}, trying original: ${item.sku}`,
					);
					inventoryItems = await inventoryService.listInventoryItems({
						sku: item.sku,
					});
				}

				if (inventoryItems.length === 0) {
					logger.warn(
						`[RESERVE-WORKFLOW] No inventory item found for SKU: ${item.sku} (normalized: ${normalizedSku})`,
					);
					skippedItems.push({
						item_id: item.id,
						title: item.title,
						sku: item.sku,
						reason: 'sku_not_found',
					});
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
					skippedItems.push({
						item_id: item.id,
						title: item.title,
						sku: item.sku,
						reason: 'no_inventory_levels',
					});
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
								description: `Reservierung für Angebot ${input.offer.offer_number}`,
								metadata: {
									type: 'offer',
									offer_id: input.offer.id,
									offer_number: input.offer.offer_number,
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

		// Calculate status based on results
		const status: 'reserved' | 'partial' | 'failed' =
			reservations.length === 0
				? 'failed'
				: skippedItems.length > 0
					? 'partial'
					: 'reserved';

		return new StepResponse({
			reservations: reservations as CreatedReservation[],
			skippedItems,
			reservations_created: reservations.length,
			status,
		});
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
			filteredOutItems: validation.filteredOutItems,
		});

		return new WorkflowResponse({
			offer_id: input.offer_id,
			reservations_created: reservations.reservations_created,
			items_skipped: reservations.skippedItems,
			status: reservations.status,
		});
	},
);
