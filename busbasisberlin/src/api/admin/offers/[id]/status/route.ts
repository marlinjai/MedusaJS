/**
 * route.ts
 * Offer status transition API route
 * Handles POST requests to transition offer status (draft -> active -> accepted -> completed/cancelled)
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

import OfferService from '../../../../../modules/offer/service';

// Module constant for service resolution
const OFFER_MODULE = 'offer';

// Type definitions for request/response
interface StatusTransitionRequest {
  new_status: string;
  changed_by?: string;
  changed_by_name?: string;
  notes?: string;
  notify_customer?: boolean;
}

interface OfferParams {
  id: string;
}

/**
 * POST /admin/offers/:id/status
 * Transition offer status with proper validation and tracking
 */
export async function POST(req: MedusaRequest<StatusTransitionRequest>, res: MedusaResponse): Promise<void> {
  const offerService: OfferService = req.scope.resolve(OFFER_MODULE);
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

  try {
    const { id } = req.params;
    const { new_status, changed_by, changed_by_name, notes, notify_customer } = req.body;

    if (!id) {
      res.status(400).json({
        error: 'Validation error',
        message: 'Offer ID is required',
      });
      return;
    }

    if (!new_status) {
      res.status(400).json({
        error: 'Validation error',
        message: 'New status is required',
      });
      return;
    }

    // Validate status value
    const validStatuses = ['draft', 'active', 'accepted', 'completed', 'cancelled'];
    if (!validStatuses.includes(new_status)) {
      res.status(400).json({
        error: 'Validation error',
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
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

    // Check if the status is already the same
    if (existingOffer.status === new_status) {
      res.status(400).json({
        error: 'Invalid operation',
        message: `Offer is already in ${new_status} status`,
      });
      return;
    }

    // Attempt status transition
    try {
      const updatedOffer = await offerService.transitionOfferStatus(id, new_status, changed_by, notes);

      logger.info(`Offer status changed from ${existingOffer.status} to ${new_status}: ${updatedOffer.offer_number}`);

      res.json({
        offer: updatedOffer,
        message: `Offer status changed from ${existingOffer.status} to ${new_status}`,
      });
    } catch (transitionError) {
      // Handle transition validation errors
      if (transitionError.message.includes('Invalid status transition')) {
        res.status(400).json({
          error: 'Invalid status transition',
          message: transitionError.message,
        });
        return;
      }

      // Re-throw other errors
      throw transitionError;
    }
  } catch (error) {
    logger.error('Error transitioning offer status:', error);
    res.status(500).json({
      error: 'Failed to transition offer status',
      message: error.message,
    });
  }
}
