/**
 * customer-created.ts
 * Handles customer registration events and sends welcome emails
 * Also auto-links to existing manual customers if match is found
 */

import { Modules } from '@medusajs/framework/utils';
import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';
import { MANUAL_CUSTOMER_MODULE } from '../modules/manual-customer';
import ManualCustomerService from '../modules/manual-customer/service';

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
			fields: ['id', 'email', 'first_name', 'last_name', 'phone', 'has_account'],
			filters: {
				id: data.id,
			},
		});

		const customer = customers[0];
		if (!customer) {
			logger.warn(`[CUSTOMER-SUBSCRIBER] Customer ${data.id} not found`);
			return;
		}

		// Auto-link to existing manual customer if match is found
		try {
			const manualCustomerService: ManualCustomerService = container.resolve(
				MANUAL_CUSTOMER_MODULE,
			);
			const linkResult = await manualCustomerService.autoLinkCustomer({
				id: customer.id,
				email: customer.email,
				first_name: customer.first_name,
				last_name: customer.last_name,
				phone: customer.phone,
			});

			if (linkResult.linked) {
				logger.info(
					`[CUSTOMER-SUBSCRIBER] Auto-linked customer ${customer.id} to manual customer: ${linkResult.reason}`,
				);
			} else {
				logger.info(
					`[CUSTOMER-SUBSCRIBER] No auto-link performed for customer ${customer.id} (no unique match found)`,
				);
			}
		} catch (linkError) {
			// Log but don't fail - linking is optional
			logger.error(
				`[CUSTOMER-SUBSCRIBER] Error auto-linking customer ${customer.id}:`,
				linkError,
			);
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
		logger.error(
			`[CUSTOMER-SUBSCRIBER] Error processing customer creation:`,
			error,
		);
		// Don't throw - email failure shouldn't break customer creation
	}
}

// Export subscriber config
export const config: SubscriberConfig = {
	event: 'customer.created',
};

