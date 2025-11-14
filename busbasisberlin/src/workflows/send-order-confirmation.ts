import {
	createWorkflow,
	WorkflowResponse,
} from '@medusajs/framework/workflows-sdk';
import { useQueryGraphStep } from '@medusajs/medusa/core-flows';
import { sendNotificationStep } from './steps/send-notification';

type WorkflowInput = {
	id: string;
};

export const sendOrderConfirmationWorkflow = createWorkflow(
	'send-order-confirmation',
	({ id }: WorkflowInput) => {
		//@ts-ignore
		const { data: orders } = useQueryGraphStep({
			entity: 'order',
			fields: [
				'id',
				'display_id',
				'email',
				'currency_code',
				'total',
				'items.*',
				'shipping_address.*',
				'billing_address.*',
				'shipping_methods.*',
				'shipping_methods.shipping_option.*',
				'payment_collections.*',
				'payment_collections.payments.*',
				'customer.*',
				'total',
				'subtotal',
				'discount_total',
				'shipping_total',
				'tax_total',
				'item_subtotal',
				'item_total',
				'item_tax_total',
			],
			filters: {
				id,
			},
		});

		const order = orders[0];
		const email = order?.email ?? '';

		// Check if this is a pickup order with manual payment
		const shippingMethod = order?.shipping_methods?.[0] as any;
		const shippingOptionName = (shippingMethod?.shipping_option?.name || shippingMethod?.name || '').toLowerCase();
		const isPickupOrder = shippingOptionName.includes('abholung') || shippingOptionName.includes('pickup');

		const payment = order?.payment_collections?.[0]?.payments?.[0];
		const isManualPayment = payment?.provider_id === 'pp_system' || payment?.provider_id === 'pp_system_default';

		// Use pickup template if both conditions are met
		const template = (isPickupOrder && isManualPayment) ? 'order-placed-pickup' : 'order-placed';

		const notification = sendNotificationStep([
			{
				to: email,
				channel: 'email',
				template: template,
				data: { order: order },
			},
		]);

		return new WorkflowResponse(notification);
	},
);
