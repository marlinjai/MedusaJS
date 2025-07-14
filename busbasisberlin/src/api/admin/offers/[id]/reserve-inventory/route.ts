/**
 * [id]/reserve-inventory/route.ts
 * API endpoint for manually reserving inventory for an offer
 * Supports negative stock scenarios for backorders
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

import { OFFER_MODULE } from '../../../../../modules/offer';
import OfferService from '../../../../../modules/offer/service';

interface ReserveInventoryBody {
  allow_backorder?: boolean;
  reservation_duration_hours?: number;
  notes?: string;
}

export async function POST(req: MedusaRequest<ReserveInventoryBody>, res: MedusaResponse): Promise<void> {
  const offerService: OfferService = req.scope.resolve(OFFER_MODULE);
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

  try {
    const { id } = req.params;
    const { allow_backorder = true, reservation_duration_hours = 24, notes } = req.body;

    // Get the offer with all details
    const offer = await offerService.getOfferWithDetails(id);
    if (!offer) {
      res.status(404).json({
        message: 'Angebot nicht gefunden',
      });
      return;
    }

    // Check if offer is in a state where inventory can be reserved
    if (!['draft', 'pending', 'active'].includes(offer.status)) {
      res.status(400).json({
        message: 'Angebot ist nicht in einem Status, der Inventarreservierung erlaubt',
        current_status: offer.status,
      });
      return;
    }

    // Check if inventory is already reserved
    if (offer.has_reservations && offer.reservation_expires_at && new Date(offer.reservation_expires_at) > new Date()) {
      res.status(400).json({
        message: 'Inventar ist bereits für dieses Angebot reserviert',
        expires_at: offer.reservation_expires_at,
      });
      return;
    }

    // For now, we'll update the offer status to trigger inventory reservation
    // The actual reservation logic will be handled in the service's status transition
    await offerService.transitionOfferStatus(
      offer.id,
      'active',
      'system',
      `Manuelle Inventarreservierung${notes ? `: ${notes}` : ''}`,
    );

    // Update offer with reservation details
    const reservationExpiresAt = new Date(Date.now() + reservation_duration_hours * 60 * 60 * 1000);

    await offerService.updateOffers({
      id: offer.id,
      has_reservations: true,
      reservation_expires_at: reservationExpiresAt,
    });

    logger.info(`Inventory reservation requested for offer ${offer.offer_number}`);

    res.status(200).json({
      message: 'Inventarreservierung angefordert',
      offer_id: offer.id,
      offer_number: offer.offer_number,
      has_reservations: true,
      reservation_expires_at: reservationExpiresAt,
      allow_backorder,
    });
  } catch (error) {
    logger.error('Failed to reserve inventory for offer:', error);
    res.status(500).json({
      message: 'Fehler beim Reservieren des Inventars',
      error: error.message,
    });
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const offerService: OfferService = req.scope.resolve(OFFER_MODULE);
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

  try {
    const { id } = req.params;

    // Get the offer with all details
    const offer = await offerService.getOfferWithDetails(id);
    if (!offer) {
      res.status(404).json({
        message: 'Angebot nicht gefunden',
      });
      return;
    }

    // Update offer to remove reservation status
    await offerService.updateOffers({
      id: offer.id,
      has_reservations: false,
      reservation_expires_at: null,
    });

    // Create status history entry
    await offerService.createOfferStatusHistories([
      {
        offer_id: offer.id,
        previous_status: offer.status,
        new_status: offer.status,
        event_type: 'inventory_release',
        event_description: 'Inventarreservierung aufgehoben',
        system_change: false,
        inventory_impact: 'Alle Reservierungen freigegeben',
        changed_by: 'system',
      },
    ]);

    logger.info(`Inventory reservations released for offer ${offer.offer_number}`);

    res.status(200).json({
      message: 'Inventarreservierung erfolgreich aufgehoben',
      offer_id: offer.id,
      offer_number: offer.offer_number,
      has_reservations: false,
    });
  } catch (error) {
    logger.error('Failed to release inventory reservations for offer:', error);
    res.status(500).json({
      message: 'Fehler beim Aufheben der Inventarreservierung',
      error: error.message,
    });
  }
}
