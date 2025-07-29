/**
 * fulfill-offer-reservations.ts
 * Workflow for fulfilling offer reservations and reducing inventory levels
 *
 * This workflow handles the completion of offers:
 * - Reduce inventory levels for product items
 * - Release reservations
 * - Update offer status
 */

import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';
import {
	createStep,
	createWorkflow,
	StepResponse,
	WorkflowResponse,
} from '@medusajs/framework/workflows-sdk';
import { releaseOfferReservationsWorkflow } from './release-offer-reservations';

// Module constant for service resolution
const OFFER_MODULE = 'offer';

// ✅ Step 1: Validate offer can be fulfilled
const validateFulfillmentStep = createStep(
	'validate-fulfillment',
	async (input: { offer_id: string }, { container }) => {
		const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
		const offerService = container.resolve(OFFER_MODULE);

		logger.info(
			`[OFFER-FULFILLMENT] Validating fulfillment for offer ${input.offer_id}`,
		);

		const offer = await offerService.getOfferWithDetails(input.offer_id);
		if (!offer) {
			throw new Error(`Offer ${input.offer_id} not found`);
		}

		// Check if offer is in a state that can be fulfilled
		if (!['accepted', 'active'].includes(offer.status)) {
			throw new Error(
				`Offer ${input.offer_id} cannot be fulfilled - status is ${offer.status}`,
			);
		}

		// Check if offer has reservations
		if (!offer.has_reservations) {
			logger.warn(
				`[OFFER-FULFILLMENT] Offer ${input.offer_id} has no reservations - proceeding anyway`,
			);
		}

		return new StepResponse(
			{
				offer,
				can_fulfill: true,
				has_reservations: offer.has_reservations,
			},
			{
				offer,
				previous_status: offer.status,
			},
		);
	},
	async (compensationData, { container }) => {
		// No compensation needed for validation
		const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
		logger.info(
			`[OFFER-FULFILLMENT] Validation step compensation - no action needed`,
		);
	},
);

// ✅ Step 2: Reduce inventory levels
const reduceInventoryLevelsStep = createStep(
	'reduce-inventory-levels',
	async (input: { offer: any }, { container }) => {
		const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
		const inventoryModuleService = container.resolve(Modules.INVENTORY);

		logger.info(
			`[OFFER-FULFILLMENT] Reducing inventory levels for offer ${input.offer.offer_number}`,
		);

		const reducedItems: Array<{
			inventory_item_id: string;
			variant_id?: string;
			sku: string;
			quantity_reduced: number;
		}> = [];

		// Process each product item in the offer
		for (const item of input.offer.items) {
			if (item.item_type === 'product' && item.variant_id && item.sku) {
				try {
					// Find inventory items for this SKU
					const inventoryItems =
						await inventoryModuleService.listInventoryItems({
							sku: item.sku,
						});

					for (const inventoryItem of inventoryItems) {
						// Get inventory levels for this item
						const inventoryLevels =
							await inventoryModuleService.listInventoryLevels({
								inventory_item_id: inventoryItem.id,
							});

						for (const level of inventoryLevels) {
							// Calculate how much we can reduce
							const availableToReduce = Math.min(
								level.stocked_quantity - level.reserved_quantity,
								item.quantity,
							);

							if (availableToReduce > 0) {
								// Reduce the inventory level
								await inventoryModuleService.updateInventoryLevels([
									{
										inventory_item_id: level.inventory_item_id,
										location_id: level.location_id,
										stocked_quantity:
											level.stocked_quantity - availableToReduce,
									},
								]);

								reducedItems.push({
									inventory_item_id: inventoryItem.id,
									variant_id: item.variant_id,
									sku: item.sku,
									quantity_reduced: availableToReduce,
								});

								logger.info(
									`[OFFER-FULFILLMENT] Reduced inventory for ${item.sku}: ${availableToReduce} units`,
								);
							}
						}
					}
				} catch (error) {
					logger.error(
						`[OFFER-FULFILLMENT] Failed to reduce inventory for item ${item.sku}: ${error.message}`,
					);
					throw error;
				}
			}
		}

		return new StepResponse(
			{
				inventory_reduced: true,
				items_reduced: reducedItems.length,
				total_quantity_reduced: reducedItems.reduce(
					(sum, item) => sum + item.quantity_reduced,
					0,
				),
				reduced_items: reducedItems,
			},
			{
				offer_id: input.offer.id,
				reduced_items: reducedItems,
			},
		);
	},
	async (compensationData, { container }) => {
		const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
		const inventoryModuleService = container.resolve(Modules.INVENTORY);

		logger.info(`[OFFER-FULFILLMENT] Compensating: Restoring inventory levels`);

		// Restore inventory levels
		if (!compensationData?.reduced_items) {
			logger.warn(
				`[OFFER-FULFILLMENT] No compensation data available for inventory restoration`,
			);
			return;
		}

		for (const item of compensationData.reduced_items) {
			try {
				const inventoryLevels =
					await inventoryModuleService.listInventoryLevels({
						inventory_item_id: item.inventory_item_id,
					});

				for (const level of inventoryLevels) {
					await inventoryModuleService.updateInventoryLevels([
						{
							inventory_item_id: level.inventory_item_id,
							location_id: level.location_id,
							stocked_quantity: level.stocked_quantity + item.quantity_reduced,
						},
					]);
				}

				logger.info(
					`[OFFER-FULFILLMENT] Restored ${item.quantity_reduced} units for ${item.sku}`,
				);
			} catch (error) {
				logger.error(
					`[OFFER-FULFILLMENT] Failed to restore inventory for ${item.sku}: ${error.message}`,
				);
			}
		}
	},
);

// ✅ Step 3: Release reservations
const releaseOfferReservationsStep = createStep(
	'release-offer-reservations',
	async (input: { offer_id: string }, { container }) => {
		const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

		logger.info(
			`[OFFER-FULFILLMENT] Releasing reservations for offer ${input.offer_id}`,
		);

		try {
			const result = await releaseOfferReservationsWorkflow(container).run({
				input: {
					offer_id: input.offer_id,
					reason: 'Offer fulfilled',
				},
			});

			logger.info(
				`[OFFER-FULFILLMENT] Reservations released: ${result.result.reservations_released} items`,
			);

			return new StepResponse(
				{
					reservations_released: true,
					reservations_released_count: result.result.reservations_released,
				},
				{
					offer_id: input.offer_id,
					reservations_released_count: result.result.reservations_released,
				},
			);
		} catch (error) {
			logger.error(
				`[OFFER-FULFILLMENT] Failed to release reservations: ${error.message}`,
			);
			throw error;
		}
	},
	async (compensationData, { container }) => {
		const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

		logger.info(
			`[OFFER-FULFILLMENT] Compensating: Re-creating released reservations`,
		);
		// Note: Re-creating reservations after fulfillment is complex
		// In practice, you might want to log this for manual intervention
		logger.warn(
			`[OFFER-FULFILLMENT] Reservation re-creation not implemented - manual intervention may be required`,
		);
	},
);

// ✅ Step 4: Update offer status to completed
const updateOfferStatusStep = createStep(
	'update-offer-status-completed',
	async (input: { offer_id: string }, { container }) => {
		const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
		const offerService = container.resolve(OFFER_MODULE);

		logger.info(
			`[OFFER-FULFILLMENT] Updating offer ${input.offer_id} status to completed`,
		);

		await offerService.updateOffers([
			{
				id: input.offer_id,
				status: 'completed',
				completed_at: new Date(),
			},
		]);

		return new StepResponse(
			{
				status_updated: true,
				new_status: 'completed',
				timestamp: new Date().toISOString(),
			},
			{
				offer_id: input.offer_id,
				previous_status: 'accepted', // Assuming it was accepted before
			},
		);
	},
	async (compensationData, { container }) => {
		const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
		const offerService = container.resolve(OFFER_MODULE);

		logger.info(
			`[OFFER-FULFILLMENT] Compensating: Reverting status to accepted`,
		);

		if (!compensationData?.offer_id) {
			logger.warn(
				`[OFFER-FULFILLMENT] No compensation data available for status reversion`,
			);
			return;
		}

		try {
			await offerService.updateOffers([
				{
					id: compensationData.offer_id,
					status: 'accepted',
					completed_at: null,
				},
			]);
		} catch (error) {
			logger.error(
				`[OFFER-FULFILLMENT] Failed to revert status: ${error.message}`,
			);
		}
	},
);

// ✅ Main workflow definition
export const fulfillOfferReservationsWorkflow = createWorkflow(
	'fulfill-offer-reservations',
	(input: { offer_id: string; user_id?: string }) => {
		// Step 1: Validate offer can be fulfilled
		const validation = validateFulfillmentStep(input);

		// Step 2: Reduce inventory levels
		const inventoryReduction = reduceInventoryLevelsStep({
			offer: validation.offer,
		});

		// Step 3: Release reservations
		const releaseReservations = releaseOfferReservationsStep({
			offer_id: input.offer_id,
		});

		// Step 4: Update offer status
		const statusUpdate = updateOfferStatusStep({
			offer_id: input.offer_id,
		});

		return new WorkflowResponse({
			status: 'fulfilled',
			offer_id: input.offer_id,
			inventory_reduced: inventoryReduction.inventory_reduced,
			items_reduced: inventoryReduction.items_reduced,
			total_quantity_reduced: inventoryReduction.total_quantity_reduced,
			reservations_released: releaseReservations.reservations_released,
			reservations_released_count:
				releaseReservations.reservations_released_count,
		});
	},
);
