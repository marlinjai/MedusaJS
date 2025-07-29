import { Logger } from '@medusajs/framework/types';
import {
	AbstractNotificationProviderService,
	MedusaError,
} from '@medusajs/framework/utils';
import { Resend } from 'resend';

type ResendOptions = {
	api_key: string;
	from: string;
	html_templates?: Record<
		string,
		{
			subject?: string;
			content: string;
		}
	>;
};

type InjectedDependencies = {
	logger: Logger;
};

class ResendNotificationProviderService extends AbstractNotificationProviderService {
	static identifier = 'notification-resend';
	protected readonly channelTypes = ['email'];
	private resendClient: Resend;
	private options: ResendOptions;
	private logger: Logger;

	constructor({ logger }: InjectedDependencies, options: ResendOptions) {
		super();
		this.resendClient = new Resend(options.api_key);
		this.options = options;
		this.logger = logger;
	}

	static validateOptions(options: Record<any, any>) {
		if (!options.api_key) {
			throw new MedusaError(
				MedusaError.Types.INVALID_DATA,
				"Option `api_key` is required in the provider's options.",
			);
		}
		if (!options.from) {
			throw new MedusaError(
				MedusaError.Types.INVALID_DATA,
				"Option `from` is required in the provider's options.",
			);
		}
	}

	async send(notification: any): Promise<{ id: string }> {
		const { to, template, data, channel } = notification;

		// Only handle email notifications
		if (channel !== 'email') {
			throw new MedusaError(
				MedusaError.Types.INVALID_DATA,
				`Notification channel ${channel} is not supported`,
			);
		}

		this.logger.info(
			`Sending email notification to ${to} using template ${template}`,
		);

		// Get template configuration
		const templateConfig = this.options.html_templates?.[template];

		// Default templates based on type
		let subject = templateConfig?.subject || this.getDefaultSubject(template);
		let html =
			templateConfig?.content || this.getDefaultTemplate(template, data);

		try {
			const response = await this.resendClient.emails.send({
				from: this.options.from,
				to: [to],
				subject,
				html,
			});

			this.logger.info(`Email sent successfully with ID: ${response.data?.id}`);
			return { id: response.data?.id || 'unknown' };
		} catch (error) {
			this.logger.error(`Failed to send email: ${error.message}`);
			throw new MedusaError(
				MedusaError.Types.UNEXPECTED_STATE,
				`Failed to send email: ${error.message}`,
			);
		}
	}

	private getDefaultSubject(template: string): string {
		switch (template) {
			case 'order-placed':
				return 'Your Order Confirmation';
			default:
				return 'Notification from Bus Basis Berlin';
		}
	}

	private getDefaultTemplate(template: string, data: any): string {
		switch (template) {
			case 'order-placed':
				return this.getOrderPlacedTemplate(data.order);
			default:
				return '<p>Thank you for your message!</p>';
		}
	}

	private getOrderPlacedTemplate(order: any): string {
		const items =
			order.items
				?.map(
					(item: any) => `
				<tr>
					<td style="padding: 10px; border: 1px solid #ddd;">${item.title || 'Product'}</td>
					<td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
					<td style="padding: 10px; border: 1px solid #ddd; text-align: right;">
						${this.formatPrice(item.unit_price * item.quantity, order.currency_code)}
					</td>
				</tr>
			`,
				)
				.join('') || '';

		return `
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
				<h1 style="color: #333; text-align: center;">Order Confirmation</h1>
				<p>Dear ${order.customer?.first_name || 'Customer'},</p>
				<p>Thank you for your order! Your order <strong>#${order.display_id}</strong> has been confirmed.</p>

				<h2 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">Order Details</h2>
				<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
					<thead>
						<tr style="background-color: #f8f9fa;">
							<th style="padding: 15px; border: 1px solid #ddd; text-align: left;">Product</th>
							<th style="padding: 15px; border: 1px solid #ddd; text-align: center;">Quantity</th>
							<th style="padding: 15px; border: 1px solid #ddd; text-align: right;">Price</th>
						</tr>
					</thead>
					<tbody>
						${items}
					</tbody>
				</table>

				<div style="text-align: right; margin-top: 20px;">
					<p style="margin: 5px 0;"><strong>Subtotal: ${this.formatPrice(order.subtotal, order.currency_code)}</strong></p>
					${order.shipping_total ? `<p style="margin: 5px 0;">Shipping: ${this.formatPrice(order.shipping_total, order.currency_code)}</p>` : ''}
					${order.tax_total ? `<p style="margin: 5px 0;">Tax: ${this.formatPrice(order.tax_total, order.currency_code)}</p>` : ''}
					<p style="margin: 10px 0; font-size: 18px;"><strong>Total: ${this.formatPrice(order.total, order.currency_code)}</strong></p>
				</div>

				${
					order.shipping_address
						? `
				<h3 style="color: #333; margin-top: 30px;">Shipping Address</h3>
				<p style="margin: 5px 0;">${order.shipping_address.first_name} ${order.shipping_address.last_name}</p>
				<p style="margin: 5px 0;">${order.shipping_address.address_1}${order.shipping_address.address_2 ? ', ' + order.shipping_address.address_2 : ''}</p>
				<p style="margin: 5px 0;">${order.shipping_address.postal_code} ${order.shipping_address.city}</p>
				<p style="margin: 5px 0;">${order.shipping_address.country_code?.toUpperCase()}</p>
				`
						: ''
				}

				<div style="margin-top: 40px; padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
					<p style="margin: 0; text-align: center; color: #666;">
						Thank you for choosing Bus Basis Berlin!<br>
						We'll send you another email when your order ships.
					</p>
				</div>
			</div>
		`;
	}

	private formatPrice(amount: number, currencyCode: string): string {
		const formatter = new Intl.NumberFormat('de-DE', {
			style: 'currency',
			currency: currencyCode.toUpperCase(),
		});
		return formatter.format(amount / 100); // Assuming prices are in cents
	}
}

export default ResendNotificationProviderService;
