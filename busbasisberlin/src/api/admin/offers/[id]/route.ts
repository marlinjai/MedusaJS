// route.ts
// Individual offer API route for specific offer operations
// Handles GET (retrieve), PUT (update), and DELETE (delete) operations

import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

import OfferService from '../../../../modules/offer/service';
import { UpdateOfferInput, UpdateOfferItemInput } from '../../../../modules/offer/types';

/**
 * ✅ Helper function to auto-trigger inventory refresh for Admin UI
 * This eliminates the need for manual "Lager prüfen" clicks
 */
async function triggerInventoryRefresh(req: MedusaRequest, offerId: string): Promise<void> {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

  try {
    logger.info(`[INVENTORY-REFRESH] Auto-triggering inventory check for offer ${offerId}`);

    // Call the inventory check endpoint internally
    const inventoryResponse = await fetch(`http://localhost:9000/admin/offers/${offerId}/check-inventory`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization && { Authorization: req.headers.authorization }),
        ...(req.headers.cookie && { Cookie: req.headers.cookie }),
      },
    });

    if (inventoryResponse.ok) {
      const inventoryData = await inventoryResponse.json();
      logger.info(`[INVENTORY-REFRESH] Inventory refresh completed for offer ${offerId}: ${inventoryData.status}`);
    } else {
      logger.warn(`[INVENTORY-REFRESH] Inventory refresh failed for offer ${offerId}: ${inventoryResponse.status}`);
    }
  } catch (error) {
    logger.error(`[INVENTORY-REFRESH] Error refreshing inventory for offer ${offerId}:`, error);
    // Don't throw - this is a nice-to-have feature, shouldn't break the main update
  }
}

// Module constant for service resolution
const OFFER_MODULE = 'offer';

// ✅ Use centralized types instead of redeclaring
type UpdateOfferRequest = UpdateOfferInput & {
  title?: string; // Add title back since it's used in the route
  items?: Array<
    UpdateOfferItemInput & {
      id?: string; // If present, update existing item. If not, create new item
      inventory_quantity?: number; // Used for available_quantity mapping
      // Make required fields non-optional for API usage
      quantity: number;
      unit_price: number;
      title: string;
    }
  >;
};

interface OfferParams {
  id: string;
}

/**
 * GET /admin/offers/:id
 * Retrieve a specific offer with all details
 */
export async function GET(req: MedusaRequest<OfferParams>, res: MedusaResponse): Promise<void> {
  const offerService: OfferService = req.scope.resolve(OFFER_MODULE);
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        error: 'Validation error',
        message: 'Offer ID is required',
      });
      return;
    }

    // Get offer with all details
    const offer = await offerService.getOfferWithDetails(id);

    if (!offer) {
      res.status(404).json({
        error: 'Not found',
        message: 'Offer not found',
      });
      return;
    }

    res.json({
      offer,
    });
  } catch (error) {
    logger.error('Error retrieving offer:', error);
    res.status(500).json({
      error: 'Failed to retrieve offer',
      message: error.message,
    });
  }
}

/**
 * PUT /admin/offers/:id
 * Update a specific offer
 */
export async function PUT(req: MedusaRequest<UpdateOfferRequest>, res: MedusaResponse): Promise<void> {
  const offerService: OfferService = req.scope.resolve(OFFER_MODULE);
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      res.status(400).json({
        error: 'Validation error',
        message: 'Offer ID is required',
      });
      return;
    }

    // Check if offer exists
    const existingOffer = await offerService.getOfferWithDetails(id);
    if (!existingOffer) {
      res.status(404).json({
        error: 'Not found',
        message: 'Offer not found',
      });
      return;
    }

    // Validate that we're not trying to update a completed or cancelled offer
    if (existingOffer.status === 'completed' || existingOffer.status === 'cancelled') {
      res.status(400).json({
        error: 'Invalid operation',
        message: 'Cannot update completed or cancelled offers',
      });
      return;
    }

    // Prepare update data
    const updateFields: any = {};

    if (updateData.title !== undefined) {
      updateFields.title = updateData.title.trim();
    }
    if (updateData.description !== undefined) {
      updateFields.description = updateData.description?.trim();
    }
    if (updateData.customer_name !== undefined) {
      updateFields.customer_name = updateData.customer_name?.trim();
    }
    if (updateData.customer_email !== undefined) {
      updateFields.customer_email = updateData.customer_email?.trim();
    }
    if (updateData.customer_phone !== undefined) {
      updateFields.customer_phone = updateData.customer_phone?.trim();
    }
    if (updateData.customer_address !== undefined) {
      updateFields.customer_address = updateData.customer_address?.trim();
    }
    if (updateData.valid_until !== undefined) {
      updateFields.valid_until = updateData.valid_until ? new Date(updateData.valid_until) : null;
    }
    if (updateData.internal_notes !== undefined) {
      updateFields.internal_notes = updateData.internal_notes?.trim();
    }
    if (updateData.customer_notes !== undefined) {
      updateFields.customer_notes = updateData.customer_notes?.trim();
    }
    if (updateData.assigned_to !== undefined) {
      updateFields.assigned_to = updateData.assigned_to?.trim();
    }
    if (updateData.currency_code !== undefined) {
      updateFields.currency_code = updateData.currency_code || 'EUR';
    }

    // Handle item updates if provided
    if (updateData.items !== undefined) {
      // Get current items for comparison
      const currentItems = existingOffer.items;
      const newItems = updateData.items;

      // Track if any product items changed for reservation updates
      const hasProductItemChanges =
        currentItems.length !== newItems.length ||
        currentItems.some(currentItem => {
          const matchingNewItem = newItems.find(newItem => newItem.id === currentItem.id);
          return (
            !matchingNewItem ||
            currentItem.quantity !== matchingNewItem.quantity ||
            currentItem.variant_id !== matchingNewItem.variant_id ||
            currentItem.product_id !== matchingNewItem.product_id
          );
        });

      logger.info(
        `[RESERVATION-DEBUG] hasProductItemChanges: ${hasProductItemChanges}, offer status: ${existingOffer.status}`,
      );
      logger.info(`[RESERVATION-DEBUG] Current items: ${currentItems.length}, New items: ${newItems.length}`);

      // Get existing item IDs and new item IDs
      const currentItemIds = new Set(currentItems.map(item => item.id));
      const newItemIds = new Set(newItems.filter(item => item.id).map(item => item.id!));

      // Find items to delete (exist in current but not in new)
      const itemsToDelete = currentItems.filter(item => !newItemIds.has(item.id));

      // Find items to update (have IDs and exist in both)
      const itemsToUpdate = newItems.filter(item => item.id && currentItemIds.has(item.id));

      // Find items to create (no ID or ID doesn't exist in current)
      const itemsToCreate = newItems.filter(item => !item.id || !currentItemIds.has(item.id));

      // Debug logging for reservation updates
      if (hasProductItemChanges) {
        logger.info(
          `[RESERVATION-DEBUG] Items to delete: ${itemsToDelete.length}, update: ${itemsToUpdate.length}, create: ${itemsToCreate.length}`,
        );
      }

      // ✅ Handle reservations BEFORE deleting items from database
      // This ensures the workflow can retrieve reservation_id from offer items
      if (hasProductItemChanges && ['active', 'accepted'].includes(existingOffer.status)) {
        try {
          // ✅ Call the dedicated reservation update API route (following Medusa best practices)
          // The API route will handle workflow execution properly
          const workflowInput = {
            offer_id: id,
            items_to_delete: itemsToDelete.map(item => item.id),
            items_to_update: itemsToUpdate
              .filter(item => item.item_type === 'product' && item.variant_id && item.sku)
              .map(item => ({
                id: item.id!,
                variant_id: item.variant_id,
                sku: item.sku,
                quantity: item.quantity,
                title: item.title,
              })),
            items_to_create: [], // We'll handle creates after items are created in DB
            user_id: 'admin', // TODO: Get actual user ID from request context
            change_description: `Items modified: ${itemsToDelete.length} deleted, ${itemsToUpdate.length} updated`,
          };

          logger.info(
            `[RESERVATION-UPDATE] Processing reservations BEFORE database changes: ${JSON.stringify(workflowInput)}`,
          );

          // ✅ Use internal API call with proper authentication context
          const reservationUpdateResponse = await fetch(
            `http://localhost:9000/admin/offers/${id}/update-reservations`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                // Forward the authorization header from the original request
                ...(req.headers.authorization && { Authorization: req.headers.authorization }),
                // Forward the cookie header for session-based auth
                ...(req.headers.cookie && { Cookie: req.headers.cookie }),
              },
              body: JSON.stringify(workflowInput),
            },
          );

          if (!reservationUpdateResponse.ok) {
            const errorData = await reservationUpdateResponse.json();
            throw new Error(`Reservation update failed: ${errorData.error || 'Unknown error'}`);
          }

          const reservationResult = await reservationUpdateResponse.json();
          logger.info(`[RESERVATION-UPDATE] Pre-deletion API call completed: ${reservationResult.message}`);

          // ✅ Auto-trigger inventory refresh for Admin UI
          await triggerInventoryRefresh(req, id);
        } catch (reservationError) {
          logger.error(`Failed to update reservations for offer ${existingOffer.offer_number}:`, reservationError);
          // Don't fail the entire update if reservation update fails - just log the error
        }
      }

      // Delete removed items AFTER reservations are handled
      if (itemsToDelete.length > 0) {
        const itemIdsToDelete = itemsToDelete.map(item => item.id);
        await offerService.deleteOfferItems(itemIdsToDelete);
        logger.info(`Deleted ${itemIdsToDelete.length} offer items`);
      }

      // Update existing items
      for (const itemData of itemsToUpdate) {
        if (itemData.id) {
          await offerService.updateOfferItems({
            id: itemData.id,
            product_id: itemData.product_id,
            service_id: itemData.service_id,
            variant_id: itemData.variant_id,
            item_type: itemData.item_type,
            sku: itemData.sku,
            title: itemData.title,
            description: itemData.description,
            quantity: itemData.quantity,
            unit: itemData.unit || 'STK',
            unit_price: itemData.unit_price,
            discount_percentage: itemData.discount_percentage || 0,
            tax_rate: itemData.tax_rate || 19,
            variant_title: itemData.variant_title,
            total_price: itemData.unit_price * itemData.quantity * (1 - (itemData.discount_percentage || 0) / 100),
          });
        }
      }

      // ✅ Handle reservation updates for modified items
      if (itemsToUpdate.length > 0 && ['active', 'accepted'].includes(existingOffer.status)) {
        try {
          const workflowInput = {
            offer_id: id,
            items_to_delete: [],
            items_to_update: itemsToUpdate
              .filter(item => item.item_type === 'product' && item.variant_id && item.sku)
              .map(item => ({
                id: item.id!,
                variant_id: item.variant_id,
                sku: item.sku,
                quantity: item.quantity,
                title: item.title,
              })),
            items_to_create: [],
            user_id: 'admin',
            change_description: `Updated reservations for ${itemsToUpdate.length} modified items`,
          };

          logger.info(`[RESERVATION-UPDATE] Processing item updates: ${JSON.stringify(workflowInput)}`);

          const reservationUpdateResponse = await fetch(
            `http://localhost:9000/admin/offers/${id}/update-reservations`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(req.headers.authorization && { Authorization: req.headers.authorization }),
                ...(req.headers.cookie && { Cookie: req.headers.cookie }),
              },
              body: JSON.stringify(workflowInput),
            },
          );

          if (!reservationUpdateResponse.ok) {
            const errorData = await reservationUpdateResponse.json();
            throw new Error(`Item update reservation failed: ${errorData.error || 'Unknown error'}`);
          }

          const reservationResult = await reservationUpdateResponse.json();
          logger.info(`[RESERVATION-UPDATE] Item update reservations completed: ${reservationResult.message}`);

          // ✅ Auto-trigger inventory refresh for Admin UI
          await triggerInventoryRefresh(req, id);
        } catch (reservationError) {
          logger.error(
            `Failed to update reservations for modified items in offer ${existingOffer.offer_number}:`,
            reservationError,
          );
        }
      }

      // Create new items
      let createdItems: any[] = [];
      if (itemsToCreate.length > 0) {
        const itemsToCreateData = itemsToCreate.map(itemData => ({
          offer_id: id,
          product_id: itemData.product_id,
          service_id: itemData.service_id,
          variant_id: itemData.variant_id,
          item_type: itemData.item_type,
          sku: itemData.sku,
          title: itemData.title,
          description: itemData.description,
          quantity: itemData.quantity,
          unit: itemData.unit || 'STK',
          unit_price: itemData.unit_price,
          discount_percentage: itemData.discount_percentage || 0,
          tax_rate: itemData.tax_rate || 19,
          variant_title: itemData.variant_title,
          total_price: itemData.unit_price * itemData.quantity * (1 - (itemData.discount_percentage || 0) / 100),
          tax_amount: 0, // Will be calculated later
          available_quantity: itemData.inventory_quantity || 0,
          reserved_quantity: 0,
        }));

        createdItems = await offerService.createOfferItems(itemsToCreateData);
        logger.info(`Created ${itemsToCreateData.length} new offer items`);
      }

      // Recalculate offer totals after item changes
      await offerService.calculateOfferTotals(id);

      // ✅ Handle reservation for newly created items
      if (createdItems.length > 0 && ['active', 'accepted'].includes(existingOffer.status)) {
        try {
          const workflowInput = {
            offer_id: id,
            items_to_delete: [],
            items_to_update: [],
            items_to_create: createdItems
              .filter(item => item.item_type === 'product' && item.variant_id && item.sku)
              .map(item => ({
                id: item.id,
                variant_id: item.variant_id,
                sku: item.sku,
                quantity: item.quantity,
                title: item.title,
                item_type: item.item_type,
              })),
            user_id: 'admin', // TODO: Get actual user ID from request context
            change_description: `Created reservations for ${createdItems.length} new items`,
          };

          logger.info(`[RESERVATION-UPDATE] Processing new item reservations: ${JSON.stringify(workflowInput)}`);

          const reservationUpdateResponse = await fetch(
            `http://localhost:9000/admin/offers/${id}/update-reservations`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(req.headers.authorization && { Authorization: req.headers.authorization }),
                ...(req.headers.cookie && { Cookie: req.headers.cookie }),
              },
              body: JSON.stringify(workflowInput),
            },
          );

          if (!reservationUpdateResponse.ok) {
            const errorData = await reservationUpdateResponse.json();
            throw new Error(`New item reservation failed: ${errorData.error || 'Unknown error'}`);
          }

          const reservationResult = await reservationUpdateResponse.json();
          logger.info(`[RESERVATION-UPDATE] New item reservations completed: ${reservationResult.message}`);

          // ✅ Auto-trigger inventory refresh for Admin UI
          await triggerInventoryRefresh(req, id);
        } catch (reservationError) {
          logger.error(
            `Failed to create reservations for new items in offer ${existingOffer.offer_number}:`,
            reservationError,
          );
        }
      }
    }

    // Update the offer
    await offerService.updateOffers({
      id,
      ...updateFields,
    });

    // Get updated offer with details
    const updatedOffer = await offerService.getOfferWithDetails(id);

    logger.info(`Offer updated successfully: ${updatedOffer?.offer_number}`);

    res.json({
      success: true,
      offer: updatedOffer,
      message: 'Offer updated successfully',
    });
  } catch (error) {
    logger.error('Error updating offer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update offer',
      message: error.message,
    });
  }
}

/**
 * DELETE /admin/offers/:id
 * Delete a specific offer (only if it's in draft status)
 */
export async function DELETE(req: MedusaRequest<OfferParams>, res: MedusaResponse): Promise<void> {
  const offerService: OfferService = req.scope.resolve(OFFER_MODULE);
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        error: 'Validation error',
        message: 'Offer ID is required',
      });
      return;
    }

    // Check if offer exists
    const existingOffer = await offerService.getOfferWithDetails(id);
    if (!existingOffer) {
      res.status(404).json({
        error: 'Not found',
        message: 'Offer not found',
      });
      return;
    }

    // Only allow deletion of draft offers
    if (existingOffer.status !== 'draft') {
      res.status(400).json({
        error: 'Invalid operation',
        message: 'Only draft offers can be deleted',
      });
      return;
    }

    // Delete the offer (cascade will handle items and status history)
    await offerService.deleteOffers([id]);

    logger.info(`Offer deleted successfully: ${existingOffer.offer_number}`);

    res.json({
      message: 'Offer deleted successfully',
      offer_number: existingOffer.offer_number,
    });
  } catch (error) {
    logger.error('Error deleting offer:', error);
    res.status(500).json({
      error: 'Failed to delete offer',
      message: error.message,
    });
  }
}
