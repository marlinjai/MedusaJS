/**
 * offer-status-history.ts
 * Audit trail for offer status changes and important events
 * Provides complete tracking of offer lifecycle
 */
import { InferTypeOf } from '@medusajs/framework/types';
import { model } from '@medusajs/framework/utils';

const offerStatusHistory = model.define('offer_status_history', {
  id: model.id().primaryKey(),

  // Relationship
  offer_id: model.text(), // Foreign key to offer

  // Status tracking
  previous_status: model.text().nullable(), // Previous status (null for first entry)
  new_status: model.text(), // New status after change

  // Event information
  event_type: model.text(), // Type of event: 'status_change', 'created', 'updated', 'reservation', 'pdf_generated', etc.
  event_description: model.text(), // Human-readable description of what happened

  // User and system tracking
  changed_by: model.text().nullable(), // User ID who made the change
  changed_by_name: model.text().nullable(), // User name for display purposes
  system_change: model.boolean().default(false), // Whether this was an automated system change

  // Additional context
  metadata: model.text().nullable(), // JSON string with additional event data
  notes: model.text().nullable(), // Optional notes about the change

  // Impact tracking
  inventory_impact: model.text().nullable(), // Description of inventory changes (reservations, fulfillments)
  financial_impact: model.text().nullable(), // Description of financial changes

  // Communication tracking
  notification_sent: model.boolean().default(false), // Whether customer was notified
  notification_method: model.text().nullable(), // How customer was notified (email, phone, etc.)

  // Timestamps are automatically added by Medusa (created_at, updated_at)
});

export type OfferStatusHistoryType = InferTypeOf<typeof offerStatusHistory>;
export default offerStatusHistory;
