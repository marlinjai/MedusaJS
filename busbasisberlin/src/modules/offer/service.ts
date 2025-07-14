/**
 * service.ts
 * Main service for offer/quote management with complete ERP functionality
 * Handles offer lifecycle, inventory reservations, and business logic
 */
import { ContainerRegistrationKeys, MedusaService } from '@medusajs/framework/utils';

import offer, { Offer } from './models/offer';
import offerItem, { OfferItem } from './models/offer-item';
import offerStatusHistory from './models/offer-status-history';

// Interfaces for service operations
interface CreateOfferInput {
  title: string;
  description?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  valid_until?: Date;
  internal_notes?: string;
  customer_notes?: string;
  created_by?: string;
  assigned_to?: string;
  currency_code?: string;
  items?: CreateOfferItemInput[];
}

interface CreateOfferItemInput {
  product_id?: string;
  service_id?: string;
  item_type: 'product' | 'service';
  sku?: string;
  title: string;
  description?: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  discount_percentage?: number;
  discount_amount?: number;
  tax_rate?: number;
  variant_title?: string;
  supplier_info?: string;
  lead_time?: number;
  custom_specifications?: string;
  delivery_notes?: string;
  item_group?: string;
  sort_order?: number;
}

interface UpdateOfferInput {
  title?: string;
  description?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  valid_until?: Date;
  internal_notes?: string;
  customer_notes?: string;
  assigned_to?: string;
  currency_code?: string;
  requires_approval?: boolean;
  has_reservations?: boolean;
  reservation_expires_at?: Date;
}

interface OfferWithItems extends Offer {
  items: OfferItem[];
}

interface OfferStatistics {
  total_offers: number;
  active_offers: number;
  pending_acceptance: number;
  completed_offers: number;
  cancelled_offers: number;
  total_value: number;
  average_offer_value: number;
}

/**
 * Enhanced OfferService with complete ERP functionality
 * Handles offers, inventory reservations, and business logic
 */
class OfferService extends MedusaService({
  offer,
  offerItem,
  offerStatusHistory,
}) {
  private logger_: any;
  private inventoryService_: any;
  private productService_: any;
  private stockLocationService_: any;
  private query_: any;

  constructor(container: any) {
    super(container);

    // Only resolve the logger for now, which is always available
    try {
      this.logger_ = container.resolve(ContainerRegistrationKeys.LOGGER);
    } catch (error) {
      console.warn('Logger not available, using console');
      this.logger_ = console;
    }

    // Set other services to null for now - inventory integration will be added later
    this.inventoryService_ = null;
    this.productService_ = null;
    this.stockLocationService_ = null;
    this.query_ = null;
  }

  /**
   * Create a new offer with items and automatic numbering
   */
  async createOfferWithItems(input: CreateOfferInput): Promise<OfferWithItems> {
    const offerNumber = await this.generateOfferNumber();

    // Create the main offer
    const [createdOffer] = await this.createOffers([
      {
        offer_number: offerNumber,
        title: input.title,
        description: input.description,
        customer_name: input.customer_name,
        customer_email: input.customer_email,
        customer_phone: input.customer_phone,
        customer_address: input.customer_address,
        valid_until: input.valid_until,
        internal_notes: input.internal_notes,
        customer_notes: input.customer_notes,
        created_by: input.created_by,
        assigned_to: input.assigned_to,
        currency_code: input.currency_code || 'EUR',
        status: 'draft',
      },
    ]);

    // Create offer items with enhanced inventory data
    const offerItems: OfferItem[] = [];
    for (const [index, itemInput] of (input.items || []).entries()) {
      // Simplified item creation for now (inventory integration can be added later)
      const itemData = {
        offer_id: createdOffer.id,
        product_id: itemInput.product_id || null,
        service_id: itemInput.service_id || null,
        item_type: itemInput.item_type,
        sku: itemInput.sku || null,
        title: itemInput.title,
        description: itemInput.description || null,
        quantity: itemInput.quantity,
        unit: itemInput.unit || 'STK',
        unit_price: itemInput.unit_price,
        total_price: itemInput.unit_price * itemInput.quantity,
        discount_percentage: itemInput.discount_percentage || 0,
        discount_amount: itemInput.discount_amount || 0,
        tax_rate: itemInput.tax_rate || 0,
        tax_amount: 0,
        variant_title: itemInput.variant_title || null,
        supplier_info: itemInput.supplier_info || null,
        lead_time: itemInput.lead_time || null,
        custom_specifications: itemInput.custom_specifications || null,
        delivery_notes: itemInput.delivery_notes || null,
        internal_notes: null,
        item_group: itemInput.item_group || null,
        sort_order: itemInput.sort_order || index,
        available_quantity: null, // Will be populated when inventory integration is ready
        reserved_quantity: 0,
        is_reservable: false, // Will be enabled when inventory integration is ready
        is_active: true,
        requires_approval: false,
      };

      try {
        const createdItems = await this.createOfferItems([itemData]);
        if (createdItems && createdItems.length > 0) {
          offerItems.push(createdItems[0]);
        }
      } catch (error) {
        this.logger_.error(`Failed to create offer item: ${error.message}`);
        // Continue with other items
      }
    }

    // Calculate and update totals
    const totals = await this.calculateOfferTotals(createdOffer.id);
    await this.updateOffers({
      id: createdOffer.id,
      subtotal: totals.subtotal,
      tax_amount: totals.tax_amount,
      discount_amount: totals.discount_amount,
      total_amount: totals.total_amount,
    });

    // Create initial status history
    await this.createOfferStatusHistories([
      {
        offer_id: createdOffer.id,
        previous_status: null,
        new_status: 'draft',
        event_type: 'created',
        event_description: `Offer ${offerNumber} created`,
        changed_by: input.created_by,
        system_change: false,
        inventory_impact: `${offerItems.length} items added`,
      },
    ]);

    return {
      ...createdOffer,
      items: offerItems,
    } as OfferWithItems;
  }

  /**
   * Get offer with all its items and history
   */
  async getOfferWithDetails(offerId: string): Promise<OfferWithItems | null> {
    const offerData = await this.listOffers({ id: offerId });
    if (!offerData.length) return null;

    const offer = offerData[0];
    const items = await this.listOfferItems({ offer_id: offerId });

    return {
      ...offer,
      items,
    } as OfferWithItems;
  }

  /**
   * Transition offer to new status with validation and inventory actions
   */
  async transitionOfferStatus(
    offerId: string,
    newStatus: string,
    changedBy?: string,
    notes?: string,
  ): Promise<OfferWithItems> {
    const offer = await this.getOfferWithDetails(offerId);
    if (!offer) {
      throw new Error(`Offer with ID ${offerId} not found`);
    }

    const previousStatus = offer.status;

    // Validate status transition
    if (!this.isValidStatusTransition(previousStatus, newStatus)) {
      throw new Error(`Invalid status transition from ${previousStatus} to ${newStatus}`);
    }

    // Perform status transition actions (inventory reservations, etc.)
    await this.performStatusTransitionActions(offer, newStatus);

    // Update offer status
    await this.updateOffers({
      id: offerId,
      status: newStatus,
      ...(newStatus === 'accepted' && { accepted_at: new Date() }),
      ...(newStatus === 'completed' && { completed_at: new Date() }),
      ...(newStatus === 'cancelled' && { cancelled_at: new Date() }),
    });

    // Create status history entry
    await this.createOfferStatusHistories([
      {
        offer_id: offerId,
        previous_status: previousStatus,
        new_status: newStatus,
        event_type: 'status_change',
        event_description: `Status changed from ${previousStatus} to ${newStatus}`,
        changed_by: changedBy || null,
        notes: notes || null,
        system_change: false,
      },
    ]);

    const updatedOffer = await this.getOfferWithDetails(offerId);
    if (!updatedOffer) {
      throw new Error(`Failed to retrieve updated offer ${offerId}`);
    }
    return updatedOffer;
  }

  /**
   * Calculate financial totals for an offer
   */
  async calculateOfferTotals(offerId: string): Promise<{
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
  }> {
    const items = await this.listOfferItems({ offer_id: offerId });

    let subtotal = 0;
    let totalTaxAmount = 0;
    let totalDiscountAmount = 0;

    for (const item of items) {
      const itemSubtotal = item.unit_price * item.quantity;
      const itemDiscount = item.discount_amount || (itemSubtotal * (item.discount_percentage || 0)) / 100;
      const itemTaxableAmount = itemSubtotal - itemDiscount;
      const itemTax = (itemTaxableAmount * (item.tax_rate || 0)) / 100;

      subtotal += itemSubtotal;
      totalDiscountAmount += itemDiscount;
      totalTaxAmount += itemTax;

      // Update item with calculated values
      try {
        await this.updateOfferItems({
          id: item.id,
          total_price: itemSubtotal,
          discount_amount: itemDiscount,
          tax_amount: itemTax,
        });
      } catch (error) {
        this.logger_.error(`Failed to update offer item ${item.id}: ${error.message}`);
      }
    }

    const total_amount = subtotal - totalDiscountAmount + totalTaxAmount;

    return {
      subtotal,
      tax_amount: totalTaxAmount,
      discount_amount: totalDiscountAmount,
      total_amount,
    };
  }

  /**
   * Get comprehensive offer statistics
   */
  async getOfferStatistics(): Promise<OfferStatistics> {
    const allOffers = await this.listOffers({});

    const stats = {
      total_offers: allOffers.length,
      active_offers: allOffers.filter(o => o.status === 'active').length,
      pending_acceptance: allOffers.filter(o => o.status === 'accepted').length,
      completed_offers: allOffers.filter(o => o.status === 'completed').length,
      cancelled_offers: allOffers.filter(o => o.status === 'cancelled').length,
      total_value: allOffers.reduce((sum, o) => sum + o.total_amount, 0),
      average_offer_value: 0,
    };

    stats.average_offer_value = stats.total_offers > 0 ? stats.total_value / stats.total_offers : 0;

    return stats;
  }

  /**
   * Generate unique offer number
   */
  private async generateOfferNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const existingOffers = await this.listOffers({});
    const yearOffers = existingOffers.filter(o => o.offer_number.includes(year.toString()));
    const nextNumber = yearOffers.length + 1;
    return `OFF-${year}-${nextNumber.toString().padStart(3, '0')}`;
  }

  /**
   * Validate if status transition is allowed
   */
  private isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
    const validTransitions: { [key: string]: string[] } = {
      draft: ['active', 'cancelled'],
      active: ['accepted', 'cancelled'],
      accepted: ['completed', 'cancelled'],
      completed: [], // Terminal state
      cancelled: [], // Terminal state
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * Perform actions specific to status transitions
   */
  private async performStatusTransitionActions(offer: OfferWithItems, newStatus: string): Promise<void> {
    switch (newStatus) {
      case 'active':
        // Reserve inventory when offer becomes active
        await this.reserveOfferInventory(offer);
        break;

      case 'accepted':
        // Confirm reservations and prepare for fulfillment
        await this.confirmOfferReservations(offer);
        break;

      case 'completed':
        // Fulfill reservations (reduce stock) and cleanup
        await this.fulfillOfferReservations(offer);
        break;

      case 'cancelled':
        // Release all reservations
        await this.releaseOfferReservations(offer);
        break;
    }
  }

  /**
   * Reserve inventory for an offer using Medusa workflows
   * Supports negative stock scenarios for backorders
   */
  private async reserveOfferInventory(offer: OfferWithItems): Promise<void> {
    if (!this.inventoryService_ || !this.productService_) {
      this.logger_.warn('Inventory services not available, skipping reservation');
      return;
    }

    try {
      const reservationItems: Array<{
        inventory_item_id: string;
        required_quantity: number;
        allow_backorder: boolean;
        quantity: number;
        location_ids: string[];
      }> = [];

      for (const item of offer.items) {
        if (item.item_type === 'product' && item.product_id) {
          // Get inventory items for the product
          const inventoryItems = await this.getInventoryItemsForProduct(item.product_id);

          for (const inventoryItem of inventoryItems) {
            const availableQuantity = await this.getInventoryItemAvailableQuantity(inventoryItem.id);

            // Allow backorders (negative stock) for offers
            const allowBackorder = true;
            const requiredQuantity = Math.min(item.quantity, availableQuantity + (allowBackorder ? item.quantity : 0));

            reservationItems.push({
              inventory_item_id: inventoryItem.id,
              required_quantity: requiredQuantity,
              allow_backorder: allowBackorder,
              quantity: item.quantity,
              location_ids: inventoryItem.location_levels?.map((level: any) => level.location_id) || [],
            });
          }
        }
      }

      if (reservationItems.length > 0) {
        // For now, use direct inventory service calls until workflow is properly integrated
        for (const reservation of reservationItems) {
          await this.createInventoryReservation(reservation.inventory_item_id, reservation.quantity, {
            type: 'offer',
            offer_id: offer.id,
            allow_backorder: reservation.allow_backorder,
            description: `Reserved for offer ${offer.offer_number}`,
          });
        }

        this.logger_.info(`Inventory reserved for offer ${offer.offer_number}`);

        // Update offer with reservation info
        await this.updateOffers({
          id: offer.id,
          has_reservations: true,
          reservation_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        });
      }
    } catch (error) {
      this.logger_.error(`Failed to reserve inventory for offer ${offer.id}:`, error);
      throw new Error(`Inventory reservation failed: ${error.message}`);
    }
  }

  /**
   * Confirm reservations (when status becomes 'accepted')
   */
  private async confirmOfferReservations(offer: OfferWithItems): Promise<void> {
    // For now, just log the confirmation - reservations remain in place
    this.logger_.info(`Confirming reservations for offer ${offer.offer_number}`);

    // Create status history entry
    await this.createOfferStatusHistories([
      {
        offer_id: offer.id,
        previous_status: null,
        new_status: offer.status,
        event_type: 'reservation_confirmed',
        event_description: 'Inventory reservations confirmed',
        system_change: true,
        inventory_impact: `Confirmed reservations for ${offer.items.length} items`,
      },
    ]);
  }

  /**
   * Fulfill reservations and reduce stock (when status becomes 'completed')
   */
  private async fulfillOfferReservations(offer: OfferWithItems): Promise<void> {
    const productItems = offer.items.filter(item => item.item_type === 'product' && item.reserved_quantity > 0);

    let fulfilledCount = 0;
    let totalFulfilledQuantity = 0;

    for (const item of productItems) {
      if (!item.product_id) continue;

      try {
        // Get inventory items for this product
        const inventoryItems = await this.getInventoryItemsForProduct(item.product_id);

        for (const inventoryItem of inventoryItems) {
          // Delete the reservation and reduce stock
          await this.deleteInventoryReservation(inventoryItem.id, {
            type: 'offer',
            offer_id: offer.id,
            offer_item_id: item.id,
          });

          // Reduce stock level
          await this.reduceInventoryLevel(inventoryItem.id, item.reserved_quantity);

          fulfilledCount++;
          totalFulfilledQuantity += item.reserved_quantity;

          this.logger_.info(
            `Fulfilled ${item.reserved_quantity} units of ${item.title} for offer ${offer.offer_number}`,
          );
        }

        // Update offer item
        await this.updateOfferItems({
          id: item.id,
          reserved_quantity: 0,
        });
      } catch (error) {
        this.logger_.error(`Failed to fulfill inventory for item ${item.title}: ${error.message}`);
      }
    }

    // Update offer
    await this.updateOffers({
      id: offer.id,
      has_reservations: false,
      reservation_expires_at: null,
    });

    // Create status history entry for fulfillment
    await this.createOfferStatusHistories([
      {
        offer_id: offer.id,
        previous_status: null,
        new_status: offer.status,
        event_type: 'fulfillment',
        event_description: 'Inventory fulfilled and stock reduced',
        system_change: true,
        inventory_impact: `Fulfilled ${totalFulfilledQuantity} units across ${fulfilledCount} items`,
      },
    ]);
  }

  /**
   * Release reservations (when status becomes 'cancelled')
   */
  private async releaseOfferReservations(offer: OfferWithItems): Promise<void> {
    const productItems = offer.items.filter(item => item.item_type === 'product' && item.reserved_quantity > 0);

    let releasedCount = 0;
    let totalReleasedQuantity = 0;

    for (const item of productItems) {
      if (!item.product_id) continue;

      try {
        // Get inventory items for this product
        const inventoryItems = await this.getInventoryItemsForProduct(item.product_id);

        for (const inventoryItem of inventoryItems) {
          // Delete the reservation
          await this.deleteInventoryReservation(inventoryItem.id, {
            type: 'offer',
            offer_id: offer.id,
            offer_item_id: item.id,
          });

          releasedCount++;
          totalReleasedQuantity += item.reserved_quantity;

          this.logger_.info(
            `Released ${item.reserved_quantity} units of ${item.title} for offer ${offer.offer_number}`,
          );
        }

        // Update offer item
        await this.updateOfferItems({
          id: item.id,
          reserved_quantity: 0,
        });
      } catch (error) {
        this.logger_.error(`Failed to release inventory for item ${item.title}: ${error.message}`);
      }
    }

    // Update offer
    await this.updateOffers({
      id: offer.id,
      has_reservations: false,
      reservation_expires_at: null,
    });

    // Create status history entry for release
    await this.createOfferStatusHistories([
      {
        offer_id: offer.id,
        previous_status: null,
        new_status: offer.status,
        event_type: 'reservation_release',
        event_description: 'Inventory reservations released',
        system_change: true,
        inventory_impact: `Released reservations for ${totalReleasedQuantity} units across ${releasedCount} items`,
      },
    ]);
  }

  /**
   * Get available quantity for a product across all locations
   * Simplified implementation - will be enhanced when inventory integration is ready
   */
  private async getProductAvailableQuantity(productId: string): Promise<number | null> {
    // Simplified implementation for now
    this.logger_.info(`Getting available quantity for product ${productId} - simplified implementation`);
    return null;
  }

  /**
   * Get inventory items for a product
   * Simplified implementation - will be enhanced when inventory integration is ready
   */
  private async getInventoryItemsForProduct(productId: string): Promise<any[]> {
    // Simplified implementation for now
    this.logger_.info(`Getting inventory items for product ${productId} - simplified implementation`);
    return [];
  }

  /**
   * Get available quantity for an inventory item
   */
  private async getInventoryItemAvailableQuantity(inventoryItemId: string): Promise<number> {
    try {
      const inventoryLevels = await this.inventoryService_.listInventoryLevels({
        inventory_item_id: inventoryItemId,
      });

      let totalAvailable = 0;
      for (const level of inventoryLevels) {
        // Available = stocked - reserved
        const available = (level.stocked_quantity || 0) - (level.reserved_quantity || 0);
        totalAvailable += Math.max(0, available);
      }

      return totalAvailable;
    } catch (error) {
      this.logger_.error(`Failed to get available quantity for inventory item ${inventoryItemId}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Create inventory reservation
   */
  private async createInventoryReservation(inventoryItemId: string, quantity: number, metadata: any): Promise<void> {
    try {
      await this.inventoryService_.createReservationItems([
        {
          inventory_item_id: inventoryItemId,
          quantity,
          metadata,
        },
      ]);
    } catch (error) {
      this.logger_.error(`Failed to create inventory reservation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete inventory reservation
   */
  private async deleteInventoryReservation(inventoryItemId: string, metadata: any): Promise<void> {
    try {
      // Find reservations that match our metadata
      const reservations = await this.inventoryService_.listReservationItems({
        inventory_item_id: inventoryItemId,
      });

      for (const reservation of reservations) {
        if (
          reservation.metadata &&
          reservation.metadata.type === metadata.type &&
          reservation.metadata.offer_id === metadata.offer_id &&
          reservation.metadata.offer_item_id === metadata.offer_item_id
        ) {
          await this.inventoryService_.deleteReservationItems([reservation.id]);
        }
      }
    } catch (error) {
      this.logger_.error(`Failed to delete inventory reservation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reduce inventory level
   */
  private async reduceInventoryLevel(inventoryItemId: string, quantity: number): Promise<void> {
    try {
      const inventoryLevels = await this.inventoryService_.listInventoryLevels({
        inventory_item_id: inventoryItemId,
      });

      for (const level of inventoryLevels) {
        if (level.stocked_quantity >= quantity) {
          await this.inventoryService_.updateInventoryLevels([
            {
              id: level.id,
              stocked_quantity: level.stocked_quantity - quantity,
            },
          ]);
          break;
        }
      }
    } catch (error) {
      this.logger_.error(`Failed to reduce inventory level: ${error.message}`);
      throw error;
    }
  }
}

export default OfferService;
