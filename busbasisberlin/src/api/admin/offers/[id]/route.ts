/**
 * route.ts
 * Individual offer API route for specific offer operations
 * Handles GET (retrieve), PUT (update), and DELETE (delete) operations
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

import OfferService from '../../../../modules/offer/service';

// Module constant for service resolution
const OFFER_MODULE = 'offer';

// Type definitions for request/response
interface UpdateOfferRequest {
  title?: string;
  description?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  valid_until?: string;
  internal_notes?: string;
  customer_notes?: string;
  assigned_to?: string;
  currency_code?: string;
}

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

    // Update the offer
    await offerService.updateOffers({
      id,
      ...updateFields,
    });

    // Get updated offer with details
    const updatedOffer = await offerService.getOfferWithDetails(id);

    logger.info(`Offer updated successfully: ${updatedOffer?.offer_number}`);

    res.json({
      offer: updatedOffer,
      message: 'Offer updated successfully',
    });
  } catch (error) {
    logger.error('Error updating offer:', error);
    res.status(500).json({
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
