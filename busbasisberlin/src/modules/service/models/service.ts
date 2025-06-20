/**
 * service.ts
 * Defines the service model using Medusa's data modeling language (DML)
 */
import { InferTypeOf } from '@medusajs/framework/types';
import { model } from '@medusajs/framework/utils';

const service = model.define('service', {
  id: model.id().primaryKey(),

  // Basic service information
  title: model.text(),
  description: model.text().nullable(),
  short_description: model.text().nullable(),

  // Service categorization
  category: model.text().nullable(), // e.g., "Wartung", "Reparatur", "Beratung"
  service_type: model.text().nullable(), // e.g., "Stunden", "Pauschal", "Material"

  // Pricing
  base_price: model.number().nullable(), // Base price in cents
  hourly_rate: model.number().nullable(), // Hourly rate in cents
  currency_code: model.text().default('EUR'),

  // Service details
  estimated_duration: model.number().nullable(), // in minutes
  is_active: model.boolean().default(true),
  is_featured: model.boolean().default(false),

  // Technical details
  requires_vehicle: model.boolean().default(false),
  requires_diagnosis: model.boolean().default(false),
  requires_approval: model.boolean().default(false),

  // Additional information
  requirements: model.text().nullable(), // What's needed for this service
  notes: model.text().nullable(),

  // Status
  status: model.text().default('active'), // active, inactive, draft
});

export type Service = InferTypeOf<typeof service>;

export default service;
