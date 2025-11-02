/**
 * customer-created.ts
 * Handles customer registration events and sends welcome emails
 */

import { Modules } from '@medusajs/framework/utils';
import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

/**
 * Handle customer created events
 * Sends welcome email to new customers who register in the storefront
 */
export default async function customerCreatedHandler({
	event: { data },
	container,
}: SubscriberArgs<{ id: string }>) {
	const logger = container.resolve('logger');

	try {
		logger.info(`[CUSTOMER-SUBSCRIBER] Processing customer created: ${data.id}`);

		// Get customer details
		const query = container.resolve('query');
		const { data: customers } = await query.graph({
			entity: 'customer',
			fields: ['id', 'email', 'first_name', 'last_name', 'has_account'],
			filters: {
				id: data.id,
			},
		});

		const customer = customers[0];
		if (!customer) {
			logger.warn(`[CUSTOMER-SUBSCRIBER] Customer ${data.id} not found`);
			return;
		}

		// Only send welcome email if:
		// 1. Customer has an email
		// 2. Customer has created an account (has_account = true)
		if (!customer.email) {
			logger.info(
				`[CUSTOMER-SUBSCRIBER] Skipping welcome email - no email for customer ${data.id}`,
			);
			return;
		}

		if (!customer.has_account) {
			logger.info(
				`[CUSTOMER-SUBSCRIBER] Skipping welcome email - customer ${data.id} has no account (guest checkout)`,
			);
			return;
		}

		const customerName = customer.first_name
			? `${customer.first_name} ${customer.last_name || ''}`.trim()
			: undefined;

		// Send welcome email
		const notificationModuleService = container.resolve(Modules.NOTIFICATION);
		await notificationModuleService.createNotifications({
			to: customer.email,
			channel: 'email',
			template: 'welcome',
			data: {
				customer_name: customerName,
				customer_email: customer.email,
				customer_id: customer.id,
			},
		});

		logger.info(
			`[CUSTOMER-SUBSCRIBER] Welcome email sent to ${customer.email}`,
		);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error(
			`[CUSTOMER-SUBSCRIBER] Error processing customer creation:`,
			errorMessage,
		);
		// Don't throw - email failure shouldn't break customer creation
	}
}

// Export subscriber config
export const config: SubscriberConfig = {
	event: 'customer.created',
};

