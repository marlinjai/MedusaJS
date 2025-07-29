// busbasisberlin/src/modules/supplier/models/contact-email.ts
// ContactEmail model for supplier contacts (Medusa best practice)
import { InferTypeOf } from '@medusajs/framework/types';
import { model } from '@medusajs/framework/utils';

const contactEmail = model.define('contact_email', {
	id: model.id().primaryKey(),
	contact_id: model.text(), // Foreign key to contact
	email: model.text(),
	label: model.text().nullable(),
	type: model.text().nullable(), // e.g., 'work', 'personal', etc.
	is_active: model.boolean().default(true),
});

export type ContactEmail = InferTypeOf<typeof contactEmail>;
export default contactEmail;
