// busbasisberlin/src/modules/supplier/models/contact-phone.ts
// ContactPhone model for supplier contacts (Medusa best practice)
import { InferTypeOf } from '@medusajs/framework/types';
import { model } from '@medusajs/framework/utils';

const contactPhone = model.define('contact_phone', {
  id: model.id().primaryKey(),
  contact_id: model.text(), // Foreign key to contact
  number: model.text(),
  label: model.text().nullable(),
  type: model.text().nullable(), // e.g., 'mobile', 'work', etc.
  is_active: model.boolean().default(true),
});

export type ContactPhone = InferTypeOf<typeof contactPhone>;
export default contactPhone;
