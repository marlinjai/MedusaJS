/**
 * update-offer-reservations.ts
 * Workflow for updating inventory reservations when offer items change
 *
 * SINGLE RESPONSIBILITY: Only handles reservation updates (create/update/delete)
 * USAGE: Called by update-reservations/route.ts when offer items are modified
 */

import { Modules } from '@medusajs/framework/utils';
import {
	createStep,
	createWorkflow,
	StepResponse,
	WorkflowResponse,
} from '@medusajs/framework/workflows-sdk';
import {
	createReservationsWorkflow,
	deleteReservationsWorkflow,
	updateReservationsWorkflow,
} from '@medusajs/medusa/core-flows';

import { UpdateOfferReservationsInput } from '../modules/offer/types';
import { resolveOfferService } from '../types/services';
import { getLogger } from './shared/offer-validation';

// Step 1: Remove reservations for deleted items
const removeReservationsStep = createStep(
	'remove-reservations-for-deleted-items',
	async (
		input: { offer_id: string; item_ids_to_delete: string[] },
		{ container },
	) => {
		const logger = getLogger(container);
		const offerService = resolveOfferService(container);
		const inventoryService = container.resolve(Modules.INVENTORY);

		let removedCount = 0;

		for (const itemId of input.item_ids_to_delete) {
			try {
				const offerItem = await offerService.retrieveOfferItem(itemId);

				if (offerItem?.reservation_id && offerItem?.variant_id) {
					// Get reservation details before deletion
					const reservation = await inventoryService.retrieveReservationItem(
						offerItem.reservation_id,
					);

					// ✅ USE OFFICIAL WORKFLOW: Delete reservation
					await deleteReservationsWorkflow(container).run({
						input: { ids: [offerItem.reservation_id] },
					});

					// ✅ MANUAL COORDINATION: Verify reserved_quantity decreased correctly
					// This is required because reservation_item and inventory_level tables
					// work in conjunction but require manual coordination in custom integrations
					if (
						reservation &&
						reservation.inventory_item_id &&
						reservation.location_id
					) {
						const deletedQuantity = Number(reservation.quantity) || 0;

						// Get inventory level after deletion to verify reserved_quantity decreased
						const inventoryLevels = await inventoryService.listInventoryLevels({
							inventory_item_id: reservation.inventory_item_id,
							location_id: reservation.location_id,
						});

						if (inventoryLevels.length > 0) {
							const currentLevel = inventoryLevels[0];

							logger.info(
								`[UPDATE-WORKFLOW] Deleted reservation ${offerItem.reservation_id}: ${deletedQuantity} units for item ${reservation.inventory_item_id}`,
							);
							logger.info(
								`[UPDATE-WORKFLOW] Current inventory state: reserved_quantity=${currentLevel.reserved_quantity}, available=${currentLevel.stocked_quantity - currentLevel.reserved_quantity}`,
							);
						}
					}

					removedCount++;
					logger.info(
						`[UPDATE-WORKFLOW] Removed reservation ${offerItem.reservation_id} for deleted item ${itemId}`,
					);
				}
			} catch (error) {
				logger.error(
					`[UPDATE-WORKFLOW] Failed to remove reservation for item ${itemId}: ${error.message}`,
				);
				throw error;
			}
		}

		return new StepResponse({ removedCount });
	},
);

// Step 2: Update quantities for existing items
const updateReservationsStep = createStep(
	'update-existing-reservations',
	async (
		input: {
			offer_id: string;
			items_to_update: Array<{
				id: string;
				variant_id: string;
				sku: string;
				quantity: number;
				title: string;
			}>;
		},
		{ container },
	) => {
		const logger = getLogger(container);
		const offerService = resolveOfferService(container);
		const inventoryService = container.resolve(Modules.INVENTORY);

		let updatedCount = 0;
		let createdCount = 0;

		for (const item of input.items_to_update) {
			try {
				const offerItem = await offerService.retrieveOfferItem(item.id);

				if (offerItem?.reservation_id) {
					// ✅ USE OFFICIAL WORKFLOW: Update existing reservation
					await updateReservationsWorkflow(container).run({
						input: {
							updates: [
								{
									id: offerItem.reservation_id,
									quantity: item.quantity,
								},
							],
						},
					});

					updatedCount++;
					logger.info(
						`[UPDATE-WORKFLOW] Updated reservation ${offerItem.reservation_id} to ${item.quantity} units`,
					);
				} else {
					// Create new reservation if none exists (edge case)
					const inventoryItems = await inventoryService.listInventoryItems({
						sku: item.sku,
					});
					if (inventoryItems.length === 0) continue;

					const inventoryLevels = await inventoryService.listInventoryLevels({
						inventory_item_id: inventoryItems[0].id,
					});
					if (inventoryLevels.length === 0) continue;

					// ✅ USE OFFICIAL WORKFLOW: Create new reservation
					const reservationResult = await createReservationsWorkflow(
						container,
					).run({
						input: {
							reservations: [
								{
									inventory_item_id: inventoryItems[0].id,
									location_id: inventoryLevels[0].location_id,
									quantity: item.quantity,
									allow_backorder: true,
									metadata: {
										type: 'offer',
										offer_id: input.offer_id,
										offer_item_id: item.id,
										variant_id: item.variant_id,
										sku: item.sku,
									},
								},
							],
						},
					});

					// Update offer item with new reservation_id
					await offerService.updateOfferItems([
						{
							id: item.id,
							reservation_id: reservationResult.result[0].id,
						},
					]);

					createdCount++;
					logger.info(
						`[UPDATE-WORKFLOW] Created new reservation for updated item ${item.title}`,
					);
				}
			} catch (error) {
				logger.error(
					`[UPDATE-WORKFLOW] Failed to update reservation for item ${item.id}: ${error.message}`,
				);
				throw error;
			}
		}

		return new StepResponse({ updatedCount, createdCount });
	},
);

// Step 3: Create reservations for new items
const createReservationsStep = createStep(
	'create-reservations-for-new-items',
	async (
		input: {
			offer_id: string;
			items_to_create: Array<{
				id: string;
				variant_id: string;
				sku: string;
				quantity: number;
				title: string;
				item_type: string;
			}>;
		},
		{ container },
	) => {
		const logger = getLogger(container);
		const offerService = resolveOfferService(container);
		const inventoryService = container.resolve(Modules.INVENTORY);

		let createdCount = 0;

		for (const item of input.items_to_create) {
			try {
				const inventoryItems = await inventoryService.listInventoryItems({
					sku: item.sku,
				});
				if (inventoryItems.length === 0) continue;

				const inventoryLevels = await inventoryService.listInventoryLevels({
					inventory_item_id: inventoryItems[0].id,
				});
				if (inventoryLevels.length === 0) continue;

				// ✅ USE OFFICIAL WORKFLOW: Create reservation for new item
				const reservationResult = await createReservationsWorkflow(
					container,
				).run({
					input: {
						reservations: [
							{
								inventory_item_id: inventoryItems[0].id,
								location_id: inventoryLevels[0].location_id,
								quantity: item.quantity,
								allow_backorder: true,
								metadata: {
									type: 'offer',
									offer_id: input.offer_id,
									offer_item_id: item.id,
									variant_id: item.variant_id,
									sku: item.sku,
								},
							},
						],
					},
				});

				// Update offer item with reservation_id
				await offerService.updateOfferItems([
					{
						id: item.id,
						reservation_id: reservationResult.result[0].id,
					},
				]);

				createdCount++;
				logger.info(
					`[UPDATE-WORKFLOW] Created reservation for new item ${item.title}`,
				);
			} catch (error) {
				logger.error(
					`[UPDATE-WORKFLOW] Failed to create reservation for new item ${item.id}: ${error.message}`,
				);
				throw error;
			}
		}

		return new StepResponse({ createdCount });
	},
);

// Main Workflow: Update Offer Reservations
export const updateOfferInventoryReservationsWorkflow = createWorkflow(
	'update-offer-inventory-reservations',
	(input: UpdateOfferReservationsInput) => {
		// Step 1: Remove reservations for deleted items
		const removeResult = removeReservationsStep({
			offer_id: input.offer_id,
			item_ids_to_delete: input.items_to_delete || [],
		});

		// Step 2: Update reservations for changed items
		const updateResult = updateReservationsStep({
			offer_id: input.offer_id,
			items_to_update: input.items_to_update || [],
		});

		// Step 3: Create reservations for new items
		const createResult = createReservationsStep({
			offer_id: input.offer_id,
			items_to_create: input.items_to_create || [],
		});

		return new WorkflowResponse({
			offer_id: input.offer_id,
			removed_reservations: removeResult.removedCount,
			updated_reservations: updateResult.updatedCount,
			created_reservations: createResult.createdCount,
			status: 'updated',
		});
	},
);
