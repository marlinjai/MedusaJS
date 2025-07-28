/**
 * /admin/offers/[id]/update-reservations/route.ts
 * API route for granular inventory reservation updates
 *
 * This route handles updating reservations when offer items change:
 * - Remove reservations for deleted items
 * - Update reservations for modified items (REPLACE, not add)
 * - Create reservations for new items
 */

import { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { UpdateOfferReservationsInput } from '../../../../../modules/offer/types';
import { updateOfferInventoryReservationsWorkflow } from '../../../../../workflows/update-offer-reservations';

// ✅ Use centralized type for workflow input
type UpdateReservationsRequest = UpdateOfferReservationsInput;

export async function POST(req: MedusaRequest<UpdateReservationsRequest>, res: MedusaResponse) {
  try {
    const { offer_id, items_to_delete, items_to_update, items_to_create, user_id, change_description } = req.body;

    // ✅ Validate required fields
    if (!offer_id) {
      return res.status(400).json({
        success: false,
        error: 'offer_id is required',
      });
    }

    // ✅ Validate that at least one change type is provided
    if (!items_to_delete?.length && !items_to_update?.length && !items_to_create?.length) {
      return res.status(400).json({
        success: false,
        error: 'At least one of items_to_delete, items_to_update, or items_to_create must be provided',
      });
    }

    // ✅ Validate items_to_delete format
    if (items_to_delete && !Array.isArray(items_to_delete)) {
      return res.status(400).json({
        success: false,
        error: 'items_to_delete must be an array of offer item IDs',
      });
    }

    // ✅ Validate items_to_update format
    if (items_to_update && !Array.isArray(items_to_update)) {
      return res.status(400).json({
        success: false,
        error: 'items_to_update must be an array of objects with id, variant_id, sku, quantity, and title',
      });
    }

    // ✅ Validate items_to_create format
    if (items_to_create && !Array.isArray(items_to_create)) {
      return res.status(400).json({
        success: false,
        error: 'items_to_create must be an array of objects with id, variant_id, sku, quantity, title, and item_type',
      });
    }

    // ✅ Validate items_to_update structure
    if (items_to_update) {
      for (const item of items_to_update) {
        if (!item.id || !item.variant_id || !item.sku || typeof item.quantity !== 'number' || !item.title) {
          return res.status(400).json({
            success: false,
            error: 'Each item in items_to_update must have id, variant_id, sku, quantity (number), and title',
          });
        }
      }
    }

    // ✅ Validate items_to_create structure
    if (items_to_create) {
      for (const item of items_to_create) {
        if (
          !item.id ||
          !item.variant_id ||
          !item.sku ||
          typeof item.quantity !== 'number' ||
          !item.title ||
          !item.item_type
        ) {
          return res.status(400).json({
            success: false,
            error:
              'Each item in items_to_create must have id, variant_id, sku, quantity (number), title, and item_type',
          });
        }
      }
    }

    // ✅ Call workflow for granular reservation updates
    const result = await updateOfferInventoryReservationsWorkflow(req.scope).run({
      input: {
        offer_id,
        items_to_delete: items_to_delete || [],
        items_to_update: items_to_update || [],
        items_to_create: items_to_create || [],
        user_id,
        change_description: change_description || 'Manual reservation update',
      },
    });

    return res.json({
      success: true,
      result: {
        status: 'reservations_updated',
        offer_id: result.result.offer_id,
        removed_reservations: result.result.removed_reservations,
        updated_reservations: result.result.updated_reservations,
        created_reservations: result.result.created_reservations,
        change_description: change_description || 'Manual reservation update',
      },
    });
  } catch (error) {
    console.error('Reservation update failed:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update offer reservations',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}
