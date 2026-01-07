/**
 * fulfillment-events.ts
 * Handles fulfillment events and sends appropriate shipping emails
 */

import { Modules } from '@medusajs/framework/utils';
import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

/**
 * Handle fulfillment created events (order shipped)
 * Sends shipping confirmation email with tracking information
 */
export async function handleFulfillmentCreated({
	event: { data },
	container,
}: SubscriberArgs<{ id: string }>) {
	const logger = container.resolve('logger');

	try {
		logger.info(
			`[FULFILLMENT-SUBSCRIBER] Processing fulfillment created: ${data.id}`,
		);

		// Get fulfillment details with order and customer info
		const query = container.resolve('query');
		const { data: fulfillments } = await query.graph({
			entity: 'fulfillment',
			fields: [
				'id',
				'created_at',
				'shipped_at',
				'delivered_at',
				'canceled_at',
				'metadata',
				'order.id',
				'order.display_id',
				'order.email',
				'order.customer.first_name',
				'order.customer.last_name',
			],
			filters: {
				id: data.id,
			},
		});

		const fulfillment = fulfillments[0];
		if (!fulfillment || !(fulfillment as any).order) {
			logger.warn(
				`[FULFILLMENT-SUBSCRIBER] Fulfillment ${data.id} or order not found`,
			);
			return;
		}

		const order = (fulfillment as any).order;

		// Validate email exists
		if (!order.email) {
			logger.warn(
				`[FULFILLMENT-SUBSCRIBER] Order ${order.id} has no email, skipping notification`,
			);
			return;
		}

		const customerName = order.customer
			? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim()
			: undefined;

		// Extract tracking information from metadata
		const trackingNumber = fulfillment.metadata?.tracking_number;
		const trackingUrl = fulfillment.metadata?.tracking_url;
		const carrier = fulfillment.metadata?.carrier;
		const estimatedDelivery = fulfillment.metadata?.estimated_delivery;

		// Get display_id from order (may be null, use order.id as fallback)
		const orderDisplayId = (order as any).display_id || order.id;

		// Send shipping confirmation email
		const notificationModuleService = container.resolve(Modules.NOTIFICATION);
		await notificationModuleService.createNotifications({
			to: order.email,
			channel: 'email',
			template: 'order-shipped',
			data: {
				order_display_id: String(orderDisplayId),
				customer_name: customerName,
				customer_email: order.email,
				tracking_number: trackingNumber,
				tracking_url: trackingUrl,
				carrier: carrier,
				estimated_delivery: estimatedDelivery,
			},
		});

		logger.info(
			`[FULFILLMENT-SUBSCRIBER] Shipped email sent for order #${orderDisplayId}`,
		);
	} catch (error) {
		logger.error(
			`[FULFILLMENT-SUBSCRIBER] Error processing fulfillment:`,
			error,
		);
		// Don't throw - email failure shouldn't break fulfillment
	}
}

/**
 * Handle fulfillment delivered events
 * Sends delivery confirmation email
 */
export async function handleFulfillmentDelivered({
	event: { data },
	container,
}: SubscriberArgs<{ id: string }>) {
	const logger = container.resolve('logger');

	try {
		logger.info(
			`[FULFILLMENT-SUBSCRIBER] Processing fulfillment delivered: ${data.id}`,
		);

		// Get fulfillment details
		const query = container.resolve('query');
		const { data: fulfillments } = await query.graph({
			entity: 'fulfillment',
			fields: [
				'id',
				'delivered_at',
				'order.id',
				'order.display_id',
				'order.email',
				'order.customer.first_name',
				'order.customer.last_name',
			],
			filters: {
				id: data.id,
			},
		});

		const fulfillment = fulfillments[0];
		if (!fulfillment || !(fulfillment as any).order) {
			logger.warn(
				`[FULFILLMENT-SUBSCRIBER] Fulfillment ${data.id} or order not found`,
			);
			return;
		}

		const order = (fulfillment as any).order;

		// Validate email exists
		if (!order.email) {
			logger.warn(
				`[FULFILLMENT-SUBSCRIBER] Order ${order.id} has no email, skipping notification`,
			);
			return;
		}

		const customerName = order.customer
			? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim()
			: undefined;

		// Format delivery date
		const deliveryDate = fulfillment.delivered_at
			? new Date(fulfillment.delivered_at).toLocaleDateString('de-DE', {
					day: '2-digit',
					month: 'long',
					year: 'numeric',
					hour: '2-digit',
					minute: '2-digit',
			  })
			: undefined;

		// Get display_id from order (may be null, use order.id as fallback)
		const orderDisplayId = (order as any).display_id || order.id;

		// Send delivery confirmation email
		const notificationModuleService = container.resolve(Modules.NOTIFICATION);
		await notificationModuleService.createNotifications({
			to: order.email,
			channel: 'email',
			template: 'order-delivered',
			data: {
				order_display_id: String(orderDisplayId),
				customer_name: customerName,
				customer_email: order.email,
				delivery_date: deliveryDate,
			},
		});

		logger.info(
			`[FULFILLMENT-SUBSCRIBER] Delivered email sent for order #${orderDisplayId}`,
		);
	} catch (error) {
		logger.error(
			`[FULFILLMENT-SUBSCRIBER] Error processing delivery:`,
			error,
		);
		// Don't throw - email failure shouldn't break fulfillment
	}
}

// Export subscriber configs
export const fulfillmentCreatedConfig: SubscriberConfig = {
	event: 'fulfillment.created',
};

export const fulfillmentDeliveredConfig: SubscriberConfig = {
	event: 'fulfillment.delivered',
};

