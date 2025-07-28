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

    return res.json({
      success: true,
      result: {
        status: result.result.status,
        offer_id: result.result.offer_id,
        new_status: result.result.new_status,
        inventory_action: result.result.inventory_action,
        history_created: result.result.history_created,
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
