/**
 * /admin/offers/[id]/transition-status/route.ts
 * API route for transitioning offer status using workflows
 *
 * This route handles complex status transitions with proper inventory management:
 * - Draft → Active: Create new reservations
 * - Active → Accepted: Maintain existing reservations
 * - Any → Cancelled: Release all reservations
 * - Accepted → Completed: Fulfill reservations
 */

import { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { transitionOfferStatusWorkflow } from '../../../../../workflows/transition-offer-status';

// ✅ Use simple type for workflow input (no centralized type needed for this simple case)
type TransitionStatusRequest = {
  offer_id: string;
  new_status: string;
  user_id?: string;
};

export async function POST(req: MedusaRequest<TransitionStatusRequest>, res: MedusaResponse) {
  try {
    const { offer_id, new_status, user_id } = req.body;

    // ✅ Validate required fields
    if (!offer_id) {
      return res.status(400).json({
        success: false,
        error: 'offer_id is required',
      });
    }

    if (!new_status) {
      return res.status(400).json({
        success: false,
        error: 'new_status is required',
      });
    }

    // ✅ Validate status values
    const validStatuses = ['draft', 'active', 'accepted', 'completed', 'cancelled'];
    if (!validStatuses.includes(new_status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status: ${new_status}. Valid statuses are: ${validStatuses.join(', ')}`,
      });
    }

    // ✅ Call workflow for complex status transition
    const result = await transitionOfferStatusWorkflow(req.scope).run({
      input: {
        offer_id,
        new_status,
        user_id,
      },
    });

    // ✅ ENHANCEMENT: Auto-refresh inventory data after transitions that affect reservations
    // This eliminates the need for manual "lager prüfen" clicks in the admin UI
    let inventoryStatus: null | {
      total_items_checked: number;
      items_available: number;
      inventory_refreshed: boolean;
    } = null;
    if (['reservations_created', 'reservations_released'].includes(result.result.inventory_action)) {
      try {
        // Get the offer service to check inventory status
        const offerService = req.scope.resolve('offer');
        const logger = req.scope.resolve('logger');
        const query = req.scope.resolve('query');

        // Get offer with items to check inventory
        const offer = await offerService.getOfferWithDetails(offer_id);

        if (offer && offer.items.length > 0) {
          // Use the same logic as check-inventory endpoint
          const { getVariantAvailability } = require('@medusajs/framework/utils');
          const sales_channel_id = 'sc_01JZJSF2HKJ7N6NBWBXG9YVYE8'; // Hardcoded for customer

          // Filter product items that have variant_id
          const productItems = offer.items.filter(item => item.item_type === 'product' && item.variant_id);
          const variantIds = productItems
            .map(item => item.variant_id)
            .filter((variantId): variantId is string => Boolean(variantId));

          if (variantIds.length > 0) {
            const availability = await getVariantAvailability(query, {
              variant_ids: variantIds,
              sales_channel_id,
            });

            // Build inventory status summary
            inventoryStatus = {
              total_items_checked: productItems.length,
              items_available: productItems.filter(item => {
                const availableQty = availability[item.variant_id!]?.availability || 0;
                return availableQty >= item.quantity;
              }).length,
              inventory_refreshed: true,
            };

            logger.info(
              `[TRANSITION-STATUS] Auto-refreshed inventory after ${result.result.inventory_action}: ${inventoryStatus?.items_available}/${inventoryStatus?.total_items_checked} items available`,
            );
          }
        }
      } catch (inventoryError) {
        // Don't fail the status transition if inventory check fails
        console.warn('Failed to auto-refresh inventory after status transition:', inventoryError.message);
      }
    }

    return res.json({
      success: true,
      result: {
        status: result.result.status,
        offer_id: result.result.offer_id,
        new_status: result.result.new_status,
        inventory_action: result.result.inventory_action,
        history_created: result.result.history_created,
        inventory_status: inventoryStatus, // ✅ NEW: Auto-refreshed inventory data
      },
    });
  } catch (error) {
    console.error('Status transition failed:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to transition offer status',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}
