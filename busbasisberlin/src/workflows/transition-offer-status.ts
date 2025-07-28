/**
 * transition-offer-status.ts
 * Main workflow for handling offer status transitions with proper inventory management
 *
 * This workflow handles all the complex inventory scenarios:
 * - Draft → Active: Create new reservations
 * - Active → Accepted: Maintain existing reservations
 * - Any → Cancelled: Release all reservations
 * - Accepted → Completed: Fulfill reservations
 */

import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from '@medusajs/framework/workflows-sdk';
import { fulfillOfferReservationsWorkflow } from './fulfill-offer-reservations';
import { releaseOfferReservationsWorkflow, reserveOfferInventoryWorkflow } from './offer-inventory-workflows';

// Module constant for service resolution
const OFFER_MODULE = 'offer';

// ✅ Step 1: Validate the status transition
const validateStatusTransitionStep = createStep(
  'validate-status-transition',
  async (input: { offer_id: string; new_status: string }, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const offerService = container.resolve(OFFER_MODULE);

    logger.info(`[OFFER-TRANSITION] Validating transition to ${input.new_status} for offer ${input.offer_id}`);

    const validation = await offerService.validateStatusTransition(input.offer_id, input.new_status);

    if (!validation.isValid) {
      throw new Error(`Status transition validation failed: ${validation.error}`);
    }

    const offer = await offerService.getOfferWithDetails(input.offer_id);
    if (!offer) {
      throw new Error(`Offer ${input.offer_id} not found`);
    }

    return new StepResponse(
      {
        offer,
        previous_status: offer.status,
        new_status: input.new_status,
        validation_passed: true,
      },
      { offer, previous_status: offer.status },
    );
  },
  async (compensationData, { container }) => {
    // No compensation needed for validation
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    logger.info(`[OFFER-TRANSITION] Validation step compensation - no action needed`);
  },
);

// ✅ Step 2: Handle inventory operations based on status transition
const handleInventoryForStatusTransitionStep = createStep(
  'handle-inventory-for-status-transition',
  async (
    input: {
      offer: any;
      previous_status: string;
      new_status: string;
      user_id?: string;
    },
    { container },
  ) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

    logger.info(`[OFFER-TRANSITION] Handling inventory for transition: ${input.previous_status} → ${input.new_status}`);

    // ✅ Scenario 1: Draft → Active (create reservations)
    if (input.previous_status === 'draft' && input.new_status === 'active') {
      logger.info(`[OFFER-TRANSITION] Draft → Active: Creating new reservations`);
      try {
        const result = await reserveOfferInventoryWorkflow(container).run({
          input: { offer_id: input.offer.id },
        });
        logger.info(`[OFFER-TRANSITION] Reservations created: ${result.result.reservations_created} items`);
        return new StepResponse(
          {
            inventory_action: 'reservations_created',
            reservations_created: result.result.reservations_created,
          },
          {
            inventory_action: 'reservations_created',
            previous_status: input.previous_status,
            offer_id: input.offer.id,
          },
        );
      } catch (error) {
        logger.error(`[OFFER-TRANSITION] Failed to create reservations: ${error.message}`);
        throw error;
      }
    }

    // ✅ Scenario 2: Active → Accepted (maintain reservations)
    if (input.previous_status === 'active' && input.new_status === 'accepted') {
      logger.info(`[OFFER-TRANSITION] Active → Accepted: Maintaining existing reservations`);
      return new StepResponse(
        {
          inventory_action: 'reservations_maintained',
          reservations_maintained: true,
        },
        {
          inventory_action: 'reservations_maintained',
          previous_status: input.previous_status,
        },
      );
    }

    // ✅ Scenario 3: Any → Cancelled (release reservations)
    if (input.new_status === 'cancelled') {
      logger.info(`[OFFER-TRANSITION] → Cancelled: Releasing all reservations`);
      try {
        const result = await releaseOfferReservationsWorkflow(container).run({
          input: {
            offer_id: input.offer.id,
            reason: 'Offer cancelled',
          },
        });
        logger.info(`[OFFER-TRANSITION] Reservations released: ${result.result.reservations_released} items`);
        return new StepResponse(
          {
            inventory_action: 'reservations_released',
            reservations_released: result.result.reservations_released,
          },
          {
            inventory_action: 'reservations_released',
            previous_status: input.previous_status,
            offer_id: input.offer.id,
          },
        );
      } catch (error) {
        logger.error(`[OFFER-TRANSITION] Failed to release reservations: ${error.message}`);
        // Don't throw error for release failures to allow cancellation to proceed
        return new StepResponse(
          {
            inventory_action: 'reservations_release_failed',
            error: error.message,
          },
          {
            inventory_action: 'reservations_release_failed',
            previous_status: input.previous_status,
          },
        );
      }
    }

    // ✅ Scenario 4: Accepted → Completed (fulfill reservations)
    if (input.previous_status === 'accepted' && input.new_status === 'completed') {
      logger.info(`[OFFER-TRANSITION] Accepted → Completed: Fulfilling reservations`);
      try {
        const result = await fulfillOfferReservationsWorkflow(container).run({
          input: { offer_id: input.offer.id },
        });
        logger.info(`[OFFER-TRANSITION] Reservations fulfilled: ${result.result.items_reduced} items`);
        return new StepResponse(
          {
            inventory_action: 'reservations_fulfilled',
            reservations_fulfilled: result.result.items_reduced,
          },
          {
            inventory_action: 'reservations_fulfilled',
            previous_status: input.previous_status,
            offer_id: input.offer.id,
          },
        );
      } catch (error) {
        logger.error(`[OFFER-TRANSITION] Failed to fulfill reservations: ${error.message}`);
        throw error;
      }
    }

    // ✅ Scenario 5: Other transitions (no inventory action needed)
    logger.info(
      `[OFFER-TRANSITION] No inventory action needed for transition: ${input.previous_status} → ${input.new_status}`,
    );
    return new StepResponse(
      {
        inventory_action: 'no_action_needed',
        no_inventory_action: true,
      },
      {
        inventory_action: 'no_action_needed',
        previous_status: input.previous_status,
      },
    );
  },
  async (compensationData, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

    // ✅ Compensation logic for inventory actions
    if (compensationData.inventory_action === 'reservations_created') {
      logger.info(`[OFFER-TRANSITION] Compensating: Releasing created reservations`);
      try {
        await releaseOfferReservationsWorkflow(container).run({
          input: {
            offer_id: compensationData.offer_id,
            reason: 'Compensation for failed status transition',
          },
        });
      } catch (error) {
        logger.error(`[OFFER-TRANSITION] Compensation failed: ${error.message}`);
      }
    } else if (compensationData.inventory_action === 'reservations_released') {
      logger.info(`[OFFER-TRANSITION] Compensating: Re-creating released reservations`);
      try {
        await reserveOfferInventoryWorkflow(container).run({
          input: { offer_id: compensationData.offer_id },
        });
      } catch (error) {
        logger.error(`[OFFER-TRANSITION] Compensation failed: ${error.message}`);
      }
    } else if (compensationData.inventory_action === 'reservations_fulfilled') {
      logger.warn(`[OFFER-TRANSITION] Cannot compensate fulfilled reservations - manual intervention required`);
    }
  },
);

// ✅ Step 3: Update offer status
const updateOfferStatusStep = createStep(
  'update-offer-status',
  async (
    input: {
      offer_id: string;
      new_status: string;
      user_id?: string;
    },
    { container },
  ) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const offerService = container.resolve(OFFER_MODULE);

    logger.info(`[OFFER-TRANSITION] Updating offer ${input.offer_id} status to ${input.new_status}`);

    // Update offer status with appropriate timestamps
    const updateData: any = {
      id: input.offer_id,
      status: input.new_status,
    };

    // Add appropriate timestamps based on status
    if (input.new_status === 'accepted') {
      updateData.accepted_at = new Date();
    } else if (input.new_status === 'completed') {
      updateData.completed_at = new Date();
    } else if (input.new_status === 'cancelled') {
      updateData.cancelled_at = new Date();
    }

    await offerService.updateOffers([updateData]);

    return new StepResponse(
      {
        status_updated: true,
        new_status: input.new_status,
        timestamp: new Date().toISOString(),
      },
      {
        offer_id: input.offer_id,
        new_status: input.new_status,
      },
    );
  },
  async (compensationData, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const offerService = container.resolve(OFFER_MODULE);

    logger.info(`[OFFER-TRANSITION] Compensating: Reverting status update for offer ${compensationData.offer_id}`);

    // Revert to previous status (we'd need to track this, but for now just log)
    logger.warn(`[OFFER-TRANSITION] Status reversion not implemented - manual intervention may be required`);
  },
);

// ✅ Step 4: Create status history entry
const createStatusHistoryStep = createStep(
  'create-status-history',
  async (
    input: {
      offer_id: string;
      previous_status: string;
      new_status: string;
      user_id?: string;
      inventory_action?: string;
    },
    { container },
  ) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const offerService = container.resolve(OFFER_MODULE);

    logger.info(`[OFFER-TRANSITION] Creating status history for offer ${input.offer_id}`);

    const historyEntry = {
      offer_id: input.offer_id,
      previous_status: input.previous_status,
      new_status: input.new_status,
      event_type: 'status_change',
      event_description: `Status changed from ${input.previous_status} to ${input.new_status}`,
      changed_by: input.user_id || null,
      notes: input.inventory_action ? `Inventory action: ${input.inventory_action}` : null,
      system_change: false,
    };

    await offerService.createOfferStatusHistories([historyEntry]);

    return new StepResponse(
      {
        history_created: true,
        history_id: historyEntry.offer_id, // Simplified - in real implementation you'd get the actual ID
      },
      {
        offer_id: input.offer_id,
        history_entry: historyEntry,
      },
    );
  },
  async (compensationData, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

    logger.info(`[OFFER-TRANSITION] Compensating: Removing status history entry`);
    // In a real implementation, you'd delete the history entry
    // For now, just log the compensation
    logger.warn(`[OFFER-TRANSITION] History entry removal not implemented - manual cleanup may be required`);
  },
);

// ✅ Main workflow definition
export const transitionOfferStatusWorkflow = createWorkflow(
  'transition-offer-status',
  (input: { offer_id: string; new_status: string; user_id?: string }) => {
    // Step 1: Validate transition
    const validation = validateStatusTransitionStep(input);

    // Step 2: Handle inventory operations based on transition
    const inventoryOps = handleInventoryForStatusTransitionStep({
      offer: validation.offer,
      previous_status: validation.previous_status,
      new_status: validation.new_status,
      user_id: input.user_id,
    });

    // Step 3: Update offer status
    const statusUpdate = updateOfferStatusStep({
      offer_id: input.offer_id,
      new_status: input.new_status,
      user_id: input.user_id,
    });

    // Step 4: Create history entry
    const history = createStatusHistoryStep({
      offer_id: input.offer_id,
      previous_status: validation.previous_status,
      new_status: input.new_status,
      user_id: input.user_id,
      inventory_action: inventoryOps.inventory_action,
    });

    return new WorkflowResponse({
      status: 'success',
      offer_id: input.offer_id,
      new_status: input.new_status,
      inventory_action: inventoryOps.inventory_action,
      history_created: history.history_created,
    });
  },
);
