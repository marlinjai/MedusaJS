/**
 * offer-inventory-workflows.ts
 * Custom workflows for offer inventory management following Medusa best practices
 * Wraps core inventory workflows with custom offer business logic
 */
import type { IInventoryService, Logger } from '@medusajs/framework/types';
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { OFFER_MODULE } from '../modules/offer';
import {
  CreatedReservation,
  ReleaseOfferReservationsInput,
  ReserveOfferInventoryInput,
  UpdateOfferReservationsInput,
} from '../modules/offer/types';

// Helper function to safely resolve logger
const getLogger = (container: any): Logger => {
  try {
    return container.resolve(ContainerRegistrationKeys.LOGGER) as Logger;
  } catch (error) {
    // Fallback to console if logger not available
    return console as any;
  }
};

// Step 1: Validate and prepare offer for inventory operations
const validateOfferForInventoryStep = createStep(
  'validate-offer-for-inventory',
  async (input: { offer_id: string; operation: string }, { container }) => {
    const offerService = container.resolve(OFFER_MODULE) as any;
    const logger = getLogger(container);

    logger.info(`[OFFER-INVENTORY] Validating offer ${input.offer_id} for ${input.operation}`);

    // Get offer with all details
    const offer = await offerService.getOfferWithDetails(input.offer_id);
    if (!offer) {
      throw new Error(`Offer with ID ${input.offer_id} not found`);
    }

    // Filter product items that need inventory operations
    const productItems = offer.items.filter(item => item.item_type === 'product' && item.variant_id);

    logger.info(`[OFFER-INVENTORY] Found ${productItems.length} product items requiring inventory operations`);

    return new StepResponse(
      {
        offer,
        product_items: productItems,
        service_items: offer.items.filter(item => item.item_type === 'service'),
      },
      {
        offer_id: input.offer_id,
        operation: input.operation,
      },
    );
  },
  async (data, { container }) => {
    // No compensation needed for validation step
    const logger = getLogger(container);
    logger.info(`[OFFER-INVENTORY] Validation step compensation (no-op)`);
  },
);

// Step 2: Create inventory reservations using core inventory functionality with offer-specific backorder logic
const createOfferInventoryReservationsStep = createStep(
  'create-offer-inventory-reservations',
  async (
    input: {
      offer: any;
      product_items: any[];
    },
    { container },
  ) => {
    const inventoryModuleService = container.resolve(Modules.INVENTORY) as IInventoryService;
    const logger = getLogger(container);

    logger.info(`[OFFER-INVENTORY] Creating reservations for offer ${input.offer.offer_number} with backorder support`);

    const createdReservations: CreatedReservation[] = [];

    // Create reservations for each product item
    for (const item of input.product_items) {
      if (!item.variant_id) continue;

      try {
        // First, get the inventory items linked to this variant
        const inventoryItems = await inventoryModuleService.listInventoryItems({
          sku: item.sku, // Use SKU to find the inventory item
        });

        if (inventoryItems.length === 0) {
          logger.warn(`[OFFER-INVENTORY] No inventory items found for variant ${item.variant_id} (SKU: ${item.sku})`);
          continue;
        }

        // For each inventory item, create a reservation
        for (const inventoryItem of inventoryItems) {
          // Get available locations for this inventory item
          const inventoryLevels = await inventoryModuleService.listInventoryLevels({
            inventory_item_id: inventoryItem.id,
          });

          if (inventoryLevels.length === 0) {
            logger.warn(`[OFFER-INVENTORY] No inventory levels found for inventory item ${inventoryItem.id}`);
            continue;
          }

          // Use the first available location (or you could implement location selection logic)
          const locationId = inventoryLevels[0].location_id;
          const currentStock = inventoryLevels[0].stocked_quantity || 0;
          const reservedQuantity = inventoryLevels[0].reserved_quantity || 0;
          const availableQuantity = currentStock - reservedQuantity;

          // OFFER-SPECIFIC BACKORDER LOGIC: Allow negative stock for offers
          const allowBackorder = true;
          const quantityToReserve = item.quantity; // Always reserve the full requested quantity for offers

          logger.info(
            `[OFFER-INVENTORY] Item ${item.title}: Stock=${currentStock}, Reserved=${reservedQuantity}, Available=${availableQuantity}, Requested=${item.quantity}, Allowing Backorder=${allowBackorder}`,
          );

          // Create the reservation - note the array parameter
          const reservations = await inventoryModuleService.createReservationItems([
            {
              inventory_item_id: inventoryItem.id,
              location_id: locationId,
              quantity: quantityToReserve,
              allow_backorder: allowBackorder, // This allows going into negative stock
              metadata: {
                type: 'offer',
                offer_id: input.offer.id,
                offer_item_id: item.id,
                offer_number: input.offer.offer_number,
                variant_id: item.variant_id,
                sku: item.sku,
                backorder_allowed: allowBackorder,
                original_available: availableQuantity,
                created_at: new Date().toISOString(),
              },
            },
          ]);

          // The API returns an array, so take the first (and only) reservation
          const reservation = reservations[0];

          createdReservations.push({
            reservation_id: reservation.id,
            item_id: item.id,
            variant_id: item.variant_id,
            quantity: quantityToReserve,
          });

          logger.info(
            `[OFFER-INVENTORY] Created reservation ${reservation.id} for ${quantityToReserve} units of ${item.title} (SKU: ${item.sku}), Stock will be: ${availableQuantity - quantityToReserve}`,
          );
        }
      } catch (error) {
        logger.error(`[OFFER-INVENTORY] Failed to create reservation for item ${item.id}: ${error.message}`);
        throw error;
      }
    }

    return new StepResponse(
      {
        reservations: createdReservations,
        offer_id: input.offer.id,
      },
      {
        created_reservations: createdReservations,
        offer_id: input.offer.id,
      },
    );
  },
  async (data, { container }) => {
    // Compensation: Delete created reservations
    const inventoryModuleService = container.resolve(Modules.INVENTORY) as IInventoryService;
    const logger = getLogger(container);

    if (!data?.created_reservations) return;

    logger.info(`[OFFER-INVENTORY] Compensating: Deleting ${data.created_reservations.length} reservations`);

    for (const reservation of data.created_reservations) {
      try {
        await inventoryModuleService.deleteReservationItems([reservation.reservation_id]);
        logger.info(`[OFFER-INVENTORY] Deleted reservation ${reservation.reservation_id} during compensation`);
      } catch (error) {
        logger.error(`[OFFER-INVENTORY] Failed to delete reservation during compensation: ${error.message}`);
      }
    }
  },
);

// Step 3: Update offer metadata with reservation info
const updateOfferReservationMetadataStep = createStep(
  'update-offer-reservation-metadata',
  async (
    input: {
      offer_id: string;
      reservations: any[];
      operation: string;
    },
    { container },
  ) => {
    const offerService = container.resolve(OFFER_MODULE) as any;
    const logger = getLogger(container);

    logger.info(`[OFFER-INVENTORY] Updating offer metadata for ${input.operation}`);

    // Calculate total reserved quantity
    const totalReservedQuantity = input.reservations.reduce((sum, res) => sum + res.quantity, 0);

    // Update offer with reservation metadata
    const updatedOffer = await offerService.updateOffers({
      id: input.offer_id,
      has_reservations: input.reservations.length > 0,
      reservation_expires_at: input.reservations.length > 0 ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null, // 24 hours
    });

    // Update individual offer items with reserved quantities
    for (const reservation of input.reservations) {
      await offerService.updateOfferItems({
        id: reservation.item_id,
        reserved_quantity: reservation.quantity,
      });
    }

    // Create status history entry
    await offerService.createOfferStatusHistories([
      {
        offer_id: input.offer_id,
        previous_status: null,
        new_status: updatedOffer.status,
        event_type: 'inventory_reservation',
        event_description: `${input.operation}: Reserved ${totalReservedQuantity} units across ${input.reservations.length} items`,
        system_change: true,
        inventory_impact: `Reserved ${totalReservedQuantity} units`,
      },
    ]);

    logger.info(`[OFFER-INVENTORY] Updated offer metadata: ${totalReservedQuantity} units reserved`);

    return new StepResponse(
      {
        offer: updatedOffer,
        reserved_quantity: totalReservedQuantity,
      },
      {
        offer_id: input.offer_id,
        previous_has_reservations: false, // Store for compensation
        previous_reservation_expires_at: null,
      },
    );
  },
  async (data, { container }) => {
    // Compensation: Restore previous offer metadata
    const offerService = container.resolve(OFFER_MODULE) as any;
    const logger = getLogger(container);

    if (!data?.offer_id) return;

    logger.info(`[OFFER-INVENTORY] Compensating: Restoring offer metadata`);

    try {
      await offerService.updateOffers({
        id: data.offer_id,
        has_reservations: data.previous_has_reservations,
        reservation_expires_at: data.previous_reservation_expires_at,
      });

      logger.info(`[OFFER-INVENTORY] Restored offer metadata during compensation`);
    } catch (error) {
      logger.error(`[OFFER-INVENTORY] Failed to restore offer metadata during compensation: ${error.message}`);
    }
  },
);

// Step 1.5: Check for and release existing reservations before creating new ones
const clearExistingOfferReservationsStep = createStep(
  'clear-existing-offer-reservations',
  async (
    input: {
      offer: any;
      product_items: any[];
    },
    { container },
  ) => {
    const inventoryModuleService = container.resolve(Modules.INVENTORY) as IInventoryService;
    const logger = getLogger(container);

    logger.info(`[OFFER-INVENTORY] Checking for existing reservations for offer ${input.offer.offer_number}`);

    const existingReservations: CreatedReservation[] = [];

    // Check each product item for existing reservations
    for (const item of input.product_items) {
      if (!item.variant_id || !item.sku) continue;

      try {
        // Get inventory items for this variant by SKU
        const inventoryItems = await inventoryModuleService.listInventoryItems({
          sku: item.sku,
        });

        for (const inventoryItem of inventoryItems) {
          // Find existing reservations for this inventory item that belong to this offer
          const allReservations = await inventoryModuleService.listReservationItems({
            inventory_item_id: inventoryItem.id,
          });

          // Filter reservations by offer metadata
          const offerReservations = allReservations.filter(
            reservation =>
              reservation.metadata &&
              reservation.metadata.type === 'offer' &&
              reservation.metadata.offer_id === input.offer.id,
          );

          // Delete found reservations
          for (const reservation of offerReservations) {
            await inventoryModuleService.deleteReservationItems([reservation.id]);

            existingReservations.push({
              reservation_id: reservation.id,
              item_id: item.id,
              variant_id: item.variant_id,
              quantity: Number(reservation.quantity),
            });

            logger.info(
              `[OFFER-INVENTORY] Cleared existing reservation ${reservation.id} for ${reservation.quantity} units of ${item.title} (SKU: ${item.sku})`,
            );
          }
        }
      } catch (error) {
        logger.error(`[OFFER-INVENTORY] Failed to clear existing reservations for item ${item.id}: ${error.message}`);
        // Continue with other items even if one fails
      }
    }

    logger.info(`[OFFER-INVENTORY] Cleared ${existingReservations.length} existing reservations`);

    return new StepResponse(
      {
        cleared_reservations: existingReservations,
      },
      {
        cleared_reservations: existingReservations,
        offer_id: input.offer.id,
      },
    );
  },
  async (data, { container }) => {
    // Compensation: Recreate the cleared reservations
    const inventoryModuleService = container.resolve(Modules.INVENTORY) as IInventoryService;
    const logger = getLogger(container);

    if (!data?.cleared_reservations) return;

    logger.info(`[OFFER-INVENTORY] Compensating: Recreating ${data.cleared_reservations.length} cleared reservations`);

    // This compensation is complex because we need the original reservation metadata
    // For now, we'll log the compensation attempt
    logger.warn(`[OFFER-INVENTORY] Compensation for cleared reservations not fully implemented`);
  },
);

// Main Workflow: Reserve Offer Inventory
export const reserveOfferInventoryWorkflow = createWorkflow(
  'reserve-offer-inventory',
  (input: ReserveOfferInventoryInput) => {
    // Step 1: Validate offer and get product items
    const validationResult = validateOfferForInventoryStep({
      offer_id: input.offer_id,
      operation: 'reserve',
    });

    // Step 1.5: Clear any existing reservations for this offer to prevent duplicates
    const clearResult = clearExistingOfferReservationsStep({
      offer: validationResult.offer,
      product_items: validationResult.product_items,
    });

    // Step 2: Create inventory reservations using core inventory module with backorder support
    const reservationResult = createOfferInventoryReservationsStep({
      offer: validationResult.offer,
      product_items: validationResult.product_items,
    });

    // Step 3: Update offer metadata
    const metadataResult = updateOfferReservationMetadataStep({
      offer_id: input.offer_id,
      reservations: reservationResult.reservations,
      operation: 'Inventory Reserved',
    });

    return new WorkflowResponse({
      offer_id: input.offer_id,
      cleared_reservations: clearResult.cleared_reservations.length,
      reservations_created: reservationResult.reservations.length,
      total_reserved_quantity: metadataResult.reserved_quantity,
      status: 'success',
    });
  },
);

// Step: Release inventory reservations for an offer
const releaseOfferInventoryReservationsStep = createStep(
  'release-offer-inventory-reservations',
  async (
    input: {
      offer: any;
      product_items: any[];
      reason?: string;
    },
    { container },
  ) => {
    const inventoryModuleService = container.resolve(Modules.INVENTORY) as IInventoryService;
    const logger = getLogger(container);

    logger.info(`[OFFER-INVENTORY] Releasing reservations for offer ${input.offer.offer_number}`);

    const releasedReservations: CreatedReservation[] = [];

    // Find and release reservations for each product item
    for (const item of input.product_items) {
      if (!item.variant_id || !item.sku) continue;

      try {
        // Get inventory items for this variant by SKU
        const inventoryItems = await inventoryModuleService.listInventoryItems({
          sku: item.sku,
        });

        for (const inventoryItem of inventoryItems) {
          // Find existing reservations for this inventory item that belong to this offer
          const existingReservations = await inventoryModuleService.listReservationItems({
            inventory_item_id: inventoryItem.id,
          });

          // Filter reservations by offer metadata
          const offerReservations = existingReservations.filter(
            reservation =>
              reservation.metadata &&
              reservation.metadata.type === 'offer' &&
              reservation.metadata.offer_id === input.offer.id &&
              reservation.metadata.offer_item_id === item.id,
          );

          // Delete found reservations
          for (const reservation of offerReservations) {
            await inventoryModuleService.deleteReservationItems([reservation.id]);

            releasedReservations.push({
              reservation_id: reservation.id,
              item_id: item.id,
              variant_id: item.variant_id,
              quantity: Number(reservation.quantity),
            });

            logger.info(
              `[OFFER-INVENTORY] Released reservation ${reservation.id} for ${reservation.quantity} units of ${item.title} (SKU: ${item.sku})`,
            );
          }
        }
      } catch (error) {
        logger.error(`[OFFER-INVENTORY] Failed to release reservation for item ${item.id}: ${error.message}`);
        // Continue with other items even if one fails
      }
    }

    return new StepResponse(
      {
        released_reservations: releasedReservations,
        offer_id: input.offer.id,
      },
      {
        offer_id: input.offer.id,
        released_reservations: releasedReservations,
      },
    );
  },
  async (data, { container }) => {
    // Compensation: Recreate released reservations
    const inventoryModuleService = container.resolve(Modules.INVENTORY) as IInventoryService;
    const logger = getLogger(container);

    if (!data?.released_reservations) return;

    logger.info(`[OFFER-INVENTORY] Compensating: Recreating ${data.released_reservations.length} reservations`);

    for (const reservation of data.released_reservations) {
      try {
        // We need to get the inventory item and location again for recreation
        const inventoryItems = await inventoryModuleService.listInventoryItems({
          // We don't have SKU in the reservation data, so we'll need to find another way
          // For now, we'll skip the compensation logic as it's complex without more context
        });

        logger.warn(`[OFFER-INVENTORY] Compensation for reservation recreation not fully implemented`);
      } catch (error) {
        logger.error(`[OFFER-INVENTORY] Failed to recreate reservation during compensation: ${error.message}`);
      }
    }
  },
);

// Step: Update offer metadata after releasing reservations
const updateOfferAfterReleaseStep = createStep(
  'update-offer-after-release',
  async (
    input: {
      offer_id: string;
      released_reservations: CreatedReservation[];
      reason?: string;
    },
    { container },
  ) => {
    const offerService = container.resolve(OFFER_MODULE) as any;
    const logger = getLogger(container);

    logger.info(`[OFFER-INVENTORY] Updating offer metadata after release`);

    // Update offer with no reservations
    const updatedOffer = await offerService.updateOffers({
      id: input.offer_id,
      has_reservations: false,
      reservation_expires_at: null,
    });

    // Update individual offer items to clear reserved quantities
    for (const reservation of input.released_reservations) {
      await offerService.updateOfferItems({
        id: reservation.item_id,
        reserved_quantity: 0,
      });
    }

    // Create status history entry
    await offerService.createOfferStatusHistories([
      {
        offer_id: input.offer_id,
        previous_status: null,
        new_status: updatedOffer.status,
        event_type: 'inventory_release',
        event_description: `Inventory Released: ${input.reason || 'Reservations released'}`,
        system_change: true,
        inventory_impact: `Released ${input.released_reservations.length} reservations`,
      },
    ]);

    const totalReleased = input.released_reservations.reduce((sum, res) => sum + res.quantity, 0);
    logger.info(`[OFFER-INVENTORY] Updated offer metadata: ${totalReleased} units released`);

    return new StepResponse({
      offer: updatedOffer,
      total_released: totalReleased,
    });
  },
  async (data, { container }) => {
    // Compensation: Restore reservation metadata
    const offerService = container.resolve(OFFER_MODULE) as any;
    const logger = getLogger(container);

    logger.info(`[OFFER-INVENTORY] Compensating: Restoring offer reservation metadata`);
    // Implementation depends on storing previous state
  },
);

// Workflow: Release Offer Inventory Reservations
export const releaseOfferReservationsWorkflow = createWorkflow(
  'release-offer-reservations',
  (input: ReleaseOfferReservationsInput) => {
    // Step 1: Validate offer and get product items
    const validationResult = validateOfferForInventoryStep({
      offer_id: input.offer_id,
      operation: 'release',
    });

    // Step 2: Release inventory reservations
    const releaseResult = releaseOfferInventoryReservationsStep({
      offer: validationResult.offer,
      product_items: validationResult.product_items,
      reason: input.reason,
    });

    // Step 3: Update offer metadata
    const metadataResult = updateOfferAfterReleaseStep({
      offer_id: input.offer_id,
      released_reservations: releaseResult.released_reservations,
      reason: input.reason,
    });

    return new WorkflowResponse({
      offer_id: input.offer_id,
      reservations_released: releaseResult.released_reservations.length,
      total_released_quantity: metadataResult.total_released,
      status: 'released',
    });
  },
);

// === NEW GRANULAR UPDATE WORKFLOW ===

// Step: Remove reservations for deleted offer items
const removeReservationsForDeletedItemsStep = createStep(
  'remove-reservations-for-deleted-items',
  async (
    input: {
      offer_id: string;
      item_ids_to_delete: string[];
    },
    { container },
  ) => {
    const inventoryModuleService = container.resolve(Modules.INVENTORY) as IInventoryService;
    const offerService = container.resolve(OFFER_MODULE) as any;
    const logger = getLogger(container);

    if (!input.item_ids_to_delete.length) {
      logger.info(`[OFFER-INVENTORY] No items to delete, skipping removal step`);
      return new StepResponse({ removed_reservations: [] });
    }

    logger.info(`[OFFER-INVENTORY] Removing reservations for ${input.item_ids_to_delete.length} deleted items`);

    const removedReservations: CreatedReservation[] = [];

    // Get offer items to find their reservation_ids
    try {
      for (const itemId of input.item_ids_to_delete) {
        const offerItem = await offerService.retrieveOfferItem(itemId);

        if (!offerItem || !offerItem.reservation_id) {
          logger.warn(`[OFFER-INVENTORY] No reservation found for deleted item ${itemId}`);
          continue;
        }

        // Delete the reservation directly by ID
        await inventoryModuleService.deleteReservationItems([offerItem.reservation_id]);

        removedReservations.push({
          reservation_id: offerItem.reservation_id,
          item_id: itemId,
          variant_id: offerItem.variant_id || '',
          quantity: offerItem.quantity || 0,
        });

        logger.info(`[OFFER-INVENTORY] Removed reservation ${offerItem.reservation_id} for deleted item ${itemId}`);
      }

      logger.info(`[OFFER-INVENTORY] Removed ${removedReservations.length} reservations for deleted items`);
    } catch (error) {
      logger.error(`[OFFER-INVENTORY] Error removing reservations for deleted items: ${error.message}`);
      throw error;
    }

    return new StepResponse(
      { removed_reservations: removedReservations },
      { removed_reservations: removedReservations },
    );
  },
  async (data, { container }) => {
    const logger = getLogger(container);
    logger.info(`[OFFER-INVENTORY] Compensation for removed reservations not implemented`);
  },
);

// Step: Update reservations for changed offer items
const updateReservationsForChangedItemsStep = createStep(
  'update-reservations-for-changed-items',
  async (
    input: {
      offer_id: string;
      items_to_update: Array<{
        id: string;
        variant_id?: string;
        sku?: string;
        quantity: number;
        title: string;
      }>;
    },
    { container },
  ) => {
    const inventoryModuleService = container.resolve(Modules.INVENTORY) as IInventoryService;
    const offerService = container.resolve(OFFER_MODULE) as any;
    const logger = getLogger(container);

    if (!input.items_to_update.length) {
      logger.info(`[OFFER-INVENTORY] No items to update, skipping update step`);
      return new StepResponse({ updated_reservations: [] });
    }

    logger.info(`[OFFER-INVENTORY] Updating reservations for ${input.items_to_update.length} changed items`);

    const updatedReservations: CreatedReservation[] = [];

    for (const item of input.items_to_update) {
      if (!item.variant_id || !item.sku) continue;

      try {
        // Step 1: Get the current offer item to check for existing reservation_id
        // Use retrieveOfferItem instead of listOfferItems for single item with all fields
        const offerItem = await offerService.retrieveOfferItem(item.id);

        if (!offerItem) {
          logger.warn(`[OFFER-INVENTORY] Offer item ${item.id} not found`);
          continue;
        }

        // Debug logging to understand the reservation_id situation
        logger.info(
          `[OFFER-INVENTORY-DEBUG] Item ${item.title}: reservation_id = ${offerItem.reservation_id || 'null'}, quantity = ${item.quantity}`,
        );

        // Step 2: Try to update existing reservation first (proper Medusa approach)
        if (offerItem.reservation_id) {
          try {
            // Update the existing reservation directly using Medusa's updateReservationItems
            await inventoryModuleService.updateReservationItems([
              {
                id: offerItem.reservation_id,
                quantity: item.quantity,
              },
            ]);

            updatedReservations.push({
              reservation_id: offerItem.reservation_id,
              item_id: item.id,
              variant_id: item.variant_id,
              quantity: item.quantity,
            });

            logger.info(
              `[OFFER-INVENTORY] ✅ Successfully updated existing reservation ${offerItem.reservation_id} to ${item.quantity} units for item ${item.title}`,
            );
            continue; // Successfully updated, move to next item
          } catch (updateError) {
            logger.warn(
              `[OFFER-INVENTORY] ❌ Failed to update reservation ${offerItem.reservation_id}: ${updateError.message}. Will clean up and recreate.`,
            );
            // Fall through to cleanup and recreate approach
          }
        } else {
          logger.info(`[OFFER-INVENTORY] No reservation_id found for item ${item.title}, will create new reservation`);
        }

        // Step 3: Fallback - Find and clean up ANY stale reservations before creating new one
        // This handles cases where reservation_id is missing/invalid or update failed
        const existingInventoryItems = await inventoryModuleService.listInventoryItems({
          sku: item.sku,
        });

        if (existingInventoryItems.length === 0) {
          logger.warn(`[OFFER-INVENTORY] No inventory items found for variant ${item.variant_id} (SKU: ${item.sku})`);
          continue;
        }

        let cleanedUpReservations = 0;
        for (const inventoryItem of existingInventoryItems) {
          try {
            // Find ALL existing reservations for this specific offer item
            const allReservations = await inventoryModuleService.listReservationItems({
              inventory_item_id: inventoryItem.id,
            });

            // Filter to find reservations belonging to this specific offer item
            const offerItemReservations = allReservations.filter(
              reservation =>
                reservation.metadata &&
                reservation.metadata.type === 'offer' &&
                reservation.metadata.offer_id === input.offer_id &&
                reservation.metadata.offer_item_id === item.id,
            );

            // Clean up any stale reservations
            for (const reservation of offerItemReservations) {
              await inventoryModuleService.deleteReservationItems([reservation.id]);
              cleanedUpReservations++;
              logger.info(
                `[OFFER-INVENTORY] Cleaned up stale reservation ${reservation.id} (${reservation.quantity} units) for item ${item.title}`,
              );
            }
          } catch (cleanupError) {
            logger.error(`[OFFER-INVENTORY] Failed to clean up stale reservations: ${cleanupError.message}`);
          }
        }

        if (cleanedUpReservations > 0) {
          logger.info(
            `[OFFER-INVENTORY] Cleaned up ${cleanedUpReservations} stale reservations for item ${item.title}`,
          );
        }

        // Step 4: Create new reservation (fallback when update fails or no existing reservation)
        const inventoryItems = await inventoryModuleService.listInventoryItems({
          sku: item.sku,
        });

        if (inventoryItems.length === 0) {
          logger.warn(`[OFFER-INVENTORY] No inventory items found for variant ${item.variant_id} (SKU: ${item.sku})`);
          continue;
        }

        for (const inventoryItem of inventoryItems) {
          const inventoryLevels = await inventoryModuleService.listInventoryLevels({
            inventory_item_id: inventoryItem.id,
          });

          if (inventoryLevels.length === 0) {
            logger.warn(`[OFFER-INVENTORY] No inventory levels found for inventory item ${inventoryItem.id}`);
            continue;
          }

          const locationId = inventoryLevels[0].location_id;
          const currentStock = inventoryLevels[0].stocked_quantity || 0;
          const reservedQuantity = inventoryLevels[0].reserved_quantity || 0;
          const availableQuantity = currentStock - reservedQuantity;

          // Create new reservation with updated quantity
          const reservations = await inventoryModuleService.createReservationItems([
            {
              inventory_item_id: inventoryItem.id,
              location_id: locationId,
              quantity: item.quantity,
              allow_backorder: true, // Allow backorder for offers
              metadata: {
                type: 'offer',
                offer_id: input.offer_id,
                offer_item_id: item.id,
                variant_id: item.variant_id,
                sku: item.sku,
                backorder_allowed: true,
                original_available: availableQuantity,
                created_at: new Date().toISOString(),
              },
            },
          ]);

          const reservation = reservations[0];

          // Store the reservation_id in the offer_item for future tracking
          await offerService.updateOfferItems([
            {
              id: item.id,
              reservation_id: reservation.id,
            },
          ]);

          updatedReservations.push({
            reservation_id: reservation.id,
            item_id: item.id,
            variant_id: item.variant_id,
            quantity: item.quantity,
          });

          logger.info(
            `[OFFER-INVENTORY] ✅ Created new reservation for item ${item.title}: ${reservation.id} (${item.quantity} units) and updated offer_item.reservation_id`,
          );
        }
      } catch (error) {
        logger.error(`[OFFER-INVENTORY] Error updating reservations for item ${item.id}: ${error.message}`);
        throw error;
      }
    }

    logger.info(`[OFFER-INVENTORY] Updated ${updatedReservations.length} reservations for changed items`);

    return new StepResponse(
      { updated_reservations: updatedReservations },
      { updated_reservations: updatedReservations },
    );
  },
  async (data, { container }) => {
    const logger = getLogger(container);
    logger.info(`[OFFER-INVENTORY] Compensation for updated reservations not implemented`);
  },
);

// Step: Create reservations for new offer items
const createReservationsForNewItemsStep = createStep(
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
    const inventoryModuleService = container.resolve(Modules.INVENTORY) as IInventoryService;
    const offerService = container.resolve(OFFER_MODULE) as any;
    const logger = getLogger(container);

    if (!input.items_to_create.length) {
      logger.info(`[OFFER-INVENTORY] No new items to create reservations for, skipping creation step`);
      return new StepResponse({ created_reservations: [] });
    }

    logger.info(`[OFFER-INVENTORY] Creating reservations for ${input.items_to_create.length} new items`);

    const createdReservations: CreatedReservation[] = [];

    for (const item of input.items_to_create) {
      if (item.item_type !== 'product' || !item.variant_id) continue;

      try {
        const inventoryItems = await inventoryModuleService.listInventoryItems({
          sku: item.sku,
        });

        if (inventoryItems.length === 0) {
          logger.warn(`[OFFER-INVENTORY] No inventory items found for variant ${item.variant_id} (SKU: ${item.sku})`);
          continue;
        }

        for (const inventoryItem of inventoryItems) {
          const inventoryLevels = await inventoryModuleService.listInventoryLevels({
            inventory_item_id: inventoryItem.id,
          });

          if (inventoryLevels.length === 0) {
            logger.warn(`[OFFER-INVENTORY] No inventory levels found for inventory item ${inventoryItem.id}`);
            continue;
          }

          const locationId = inventoryLevels[0].location_id;
          const currentStock = inventoryLevels[0].stocked_quantity || 0;
          const reservedQuantity = inventoryLevels[0].reserved_quantity || 0;
          const availableQuantity = currentStock - reservedQuantity;

          const reservations = await inventoryModuleService.createReservationItems([
            {
              inventory_item_id: inventoryItem.id,
              location_id: locationId,
              quantity: item.quantity,
              allow_backorder: true, // Allow backorder for offers
              metadata: {
                type: 'offer',
                offer_id: input.offer_id,
                offer_item_id: item.id,
                variant_id: item.variant_id,
                sku: item.sku,
                backorder_allowed: true,
                original_available: availableQuantity,
                created_at: new Date().toISOString(),
              },
            },
          ]);

          const reservation = reservations[0];

          // Store the reservation_id in the offer_item for future tracking
          await offerService.updateOfferItems([
            {
              id: item.id,
              reservation_id: reservation.id,
            },
          ]);

          createdReservations.push({
            reservation_id: reservation.id,
            item_id: item.id,
            variant_id: item.variant_id,
            quantity: item.quantity,
          });

          logger.info(
            `[OFFER-INVENTORY] Created reservation for new item ${item.title}: ${reservation.id} (${item.quantity} units)`,
          );
        }
      } catch (error) {
        logger.error(`[OFFER-INVENTORY] Error creating reservation for new item ${item.id}: ${error.message}`);
        throw error;
      }
    }

    logger.info(`[OFFER-INVENTORY] Created ${createdReservations.length} reservations for new items`);

    return new StepResponse(
      { created_reservations: createdReservations },
      { created_reservations: createdReservations },
    );
  },
  async (data, { container }) => {
    const inventoryModuleService = container.resolve(Modules.INVENTORY) as IInventoryService;
    const logger = getLogger(container);

    if (!data?.created_reservations) return;

    logger.info(`[OFFER-INVENTORY] Compensating: Deleting ${data.created_reservations.length} new reservations`);

    for (const reservation of data.created_reservations) {
      try {
        await inventoryModuleService.deleteReservationItems([reservation.reservation_id]);
        logger.info(`[OFFER-INVENTORY] Deleted new reservation ${reservation.reservation_id} during compensation`);
      } catch (error) {
        logger.error(`[OFFER-INVENTORY] Failed to delete new reservation during compensation: ${error.message}`);
      }
    }
  },
);

// Main Workflow: Update Offer Inventory Reservations (Granular)
export const updateOfferInventoryReservationsWorkflow = createWorkflow(
  'update-offer-inventory-reservations',
  (input: UpdateOfferReservationsInput) => {
    // Step 1: Remove reservations for deleted items
    const removeResult = removeReservationsForDeletedItemsStep({
      offer_id: input.offer_id,
      item_ids_to_delete: input.items_to_delete || [],
    });

    // Step 2: Update reservations for changed items
    const updateResult = updateReservationsForChangedItemsStep({
      offer_id: input.offer_id,
      items_to_update: input.items_to_update || [],
    });

    // Step 3: Create reservations for new items
    const createResult = createReservationsForNewItemsStep({
      offer_id: input.offer_id,
      items_to_create: input.items_to_create || [],
    });

    return new WorkflowResponse({
      offer_id: input.offer_id,
      removed_reservations: removeResult.removed_reservations.length,
      updated_reservations: updateResult.updated_reservations.length,
      created_reservations: createResult.created_reservations.length,
      status: 'updated',
    });
  },
);
