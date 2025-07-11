/**
 * offer.ts
 * Main offer/quote model for ERP functionality
 * Handles the complete offer lifecycle from draft to completion
 */
import { InferTypeOf } from '@medusajs/framework/types';
import { model } from '@medusajs/framework/utils';

const offer = model.define('offer', {
  id: model.id().primaryKey(),

  // Offer identification
  offer_number: model.text(), // Generated offer number (e.g., "OFF-2024-001")
  title: model.text(), // Offer title/subject
  description: model.text().nullable(), // Detailed description

  // Status management - follows the lifecycle: draft → active → accepted → completed/cancelled
  status: model.text().default('draft'), // draft, active, accepted, completed, cancelled

  // Customer information
  customer_name: model.text().nullable(), // Customer company/name
  customer_email: model.text().nullable(), // Customer contact email
  customer_phone: model.text().nullable(), // Customer contact phone
  customer_address: model.text().nullable(), // Customer address (JSON or text)

  // Financial information (all prices in cents for consistency)
  subtotal: model.number().default(0), // Sum of all line items before tax
  tax_amount: model.number().default(0), // Total tax amount
  discount_amount: model.number().default(0), // Total discount amount
  total_amount: model.number().default(0), // Final total amount
  currency_code: model.text().default('EUR'), // Currency for all amounts

  // Important dates
  valid_until: model.dateTime().nullable(), // Offer expiration date
  accepted_at: model.dateTime().nullable(), // When offer was accepted
  completed_at: model.dateTime().nullable(), // When offer was completed/fulfilled
  cancelled_at: model.dateTime().nullable(), // When offer was cancelled

  // Additional metadata
  internal_notes: model.text().nullable(), // Internal notes for staff
  customer_notes: model.text().nullable(), // Notes from/for customer
  pdf_url: model.text().nullable(), // URL to generated PDF

  // Sales person/creator tracking
  created_by: model.text().nullable(), // User ID who created the offer
  assigned_to: model.text().nullable(), // User ID responsible for this offer

  // Business settings
  requires_approval: model.boolean().default(false), // Whether offer needs management approval
  is_template: model.boolean().default(false), // Whether this is a template offer
  template_name: model.text().nullable(), // Name for template offers

  // Reservation tracking
  has_reservations: model.boolean().default(false), // Whether products are reserved
  reservation_expires_at: model.dateTime().nullable(), // When reservations expire
});

export type Offer = InferTypeOf<typeof offer>;
export default offer;
