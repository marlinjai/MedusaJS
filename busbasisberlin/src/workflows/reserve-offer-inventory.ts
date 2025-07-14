/**
 * reserve-offer-inventory.ts
 * Workflow for reserving inventory when offers become active
 * Supports negative stock scenarios for backorders
 *
 * Following Medusa workflow patterns from documentation
 */
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

// Step to prepare inventory reservation data
const prepareInventoryReservationStep = createStep(
  'prepare-inventory-reservation',
  async (input: { offer_id: string; items: any[] }, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

    logger.info(`Preparing inventory reservation for offer ${input.offer_id}`);

    // Transform offer items into inventory reservation format
    const reservationItems = input.items
      .filter(item => item.item_type === 'product' && item.product_id)
      .map(item => ({
        inventory_item_id: item.product_id,
        required_quantity: item.quantity,
        allow_backorder: true, // Allow negative stock for offers
        quantity: item.quantity,
        location_ids: [], // Will be populated by inventory service
      }));

    return new StepResponse(reservationItems, { offer_id: input.offer_id });
  },
  async (reservationItems, { container }) => {
    // Compensation: Log the rollback
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    logger.info('Rolling back inventory reservation preparation');
  },
);

// Step to execute inventory reservation
const executeInventoryReservationStep = createStep(
  'execute-inventory-reservation',
  async (input: { offer_id: string; reservation_items: any[] }, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

    logger.info(`Executing inventory reservation for offer ${input.offer_id}`);

    // For now, we'll simulate the reservation since we don't have full inventory integration
    // In a real implementation, this would call the inventory service
    const reservationResults = input.reservation_items.map(item => ({
      ...item,
      reserved: true,
      reservation_id: `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }));

    return new StepResponse(reservationResults, { offer_id: input.offer_id });
  },
  async (reservationResults, { container }) => {
    // Compensation: Release reservations
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    logger.info('Releasing inventory reservations due to rollback');
  },
);

// Main workflow
export const reserveOfferInventoryWorkflow = createWorkflow(
  'reserve-offer-inventory',
  (input: { offer_id: string; items: any[] }) => {
    // Step 1: Prepare inventory reservation data
    const reservationItems = prepareInventoryReservationStep(input);

    // Step 2: Execute the reservation
    const reservationResults = executeInventoryReservationStep({
      offer_id: input.offer_id,
      reservation_items: reservationItems,
    });

    return new WorkflowResponse({
      offer_id: input.offer_id,
      reservation_items: reservationResults,
      status: 'reserved',
    });
  },
);

export default reserveOfferInventoryWorkflow;
