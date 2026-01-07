import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';
import { sendOrderConfirmationWorkflow } from '../workflows/send-order-confirmation';
import { MANUAL_CUSTOMER_MODULE } from '../modules/manual-customer';
import ManualCustomerService from '../modules/manual-customer/service';

export default async function orderPlacedHandler({
	event: { data },
	container,
}: SubscriberArgs<{ id: string }>) {
	const logger = container.resolve('logger');

	// Send order confirmation email
	await sendOrderConfirmationWorkflow(container).run({
		input: {
			id: data.id,
		},
	});

	// Auto-link customer if this is a guest checkout or new customer
	try {
		const query = container.resolve('query');

		// Get order with customer data
		const { data: orders } = await query.graph({
			entity: 'order',
			fields: ['id', 'email', 'customer_id', 'customer.*'],
			filters: { id: data.id },
		});

		const order = orders[0];
		if (!order) {
			logger.warn(`[ORDER-PLACED] Order ${data.id} not found`);
			return;
		}

		// Only auto-link if there's a customer ID
		if (order.customer_id && order.customer) {
			const manualCustomerService: ManualCustomerService = container.resolve(
				MANUAL_CUSTOMER_MODULE,
			);

			const linkResult = await manualCustomerService.autoLinkCustomer({
				id: order.customer.id,
				email: order.customer.email,
				first_name: order.customer.first_name,
				last_name: order.customer.last_name,
				phone: order.customer.phone,
			});

			if (linkResult.linked) {
				logger.info(
					`[ORDER-PLACED] Auto-linked customer ${order.customer.id} to manual customer via order ${order.id}: ${linkResult.reason}`,
				);
			}
		}
	} catch (linkError) {
		// Log but don't fail - linking is optional
		logger.error(
			`[ORDER-PLACED] Error auto-linking customer for order ${data.id}:`,
			linkError,
		);
	}
}

export const config: SubscriberConfig = {
	event: 'order.placed',
};
