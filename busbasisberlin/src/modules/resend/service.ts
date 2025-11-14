import {
	Logger,
	ProviderSendNotificationDTO,
	ProviderSendNotificationResultsDTO,
} from '@medusajs/framework/types';
import {
	AbstractNotificationProviderService,
	MedusaError,
} from '@medusajs/framework/utils';
import { CreateEmailOptions, Resend } from 'resend';
import { adminPasswordResetEmail } from './emails/admin-password-reset';
import { contactFormEmail } from './emails/contact-form';
import { customerWelcomeEmail } from './emails/customer-welcome';
import { offerAcceptedEmail } from './emails/offer-accepted';
import { offerActiveEmail } from './emails/offer-active';
import { offerCancelledEmail } from './emails/offer-cancelled';
import { offerCompletedEmail } from './emails/offer-completed';
import { orderCancelledEmail } from './emails/order-cancelled';
import { orderDeliveredEmail } from './emails/order-delivered';
import { orderPlacedEmail } from './emails/order-placed';
import { orderPlacedPickupEmail } from './emails/order-placed-pickup';
import { orderShippedEmail } from './emails/order-shipped';
import { productInquiryEmail } from './emails/product-inquiry';
import { quoteRequestEmail } from './emails/quote-request';
import { passwordResetEmail } from './emails/reset-password';
import { userInvitedEmail } from './emails/user-invited';

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

enum Templates {
	ORDER_PLACED = 'order-placed',
	ORDER_PLACED_PICKUP = 'order-placed-pickup',
	ORDER_SHIPPED = 'order-shipped',
	ORDER_DELIVERED = 'order-delivered',
	ORDER_CANCELLED = 'order-cancelled',
	ORDER_REFUNDED = 'order-refunded',
	ORDER_RETURNED = 'order-returned',
	PASSWORD_RESET = 'password-reset',
	ADMIN_PASSWORD_RESET = 'admin-password-reset',
	WELCOME = 'welcome',
	VERIFICATION = 'verification',
	ORDER_CONFIRMATION = 'order-confirmation',
	// Offer templates
	OFFER_ACTIVE = 'offer-active',
	OFFER_ACCEPTED = 'offer-accepted',
	OFFER_COMPLETED = 'offer-completed',
	OFFER_CANCELLED = 'offer-cancelled',
	OFFER_NOTIFICATION = 'offer-notification',
	// Product inquiry templates
	PRODUCT_INQUIRY = 'product-inquiry',
	// Quote request templates (Sperrgut)
	QUOTE_REQUEST = 'quote-request',
	// Contact form templates
	CONTACT_FORM = 'contact-form',
	// User management templates
	USER_INVITED = 'user-invited',
}

const templates: { [key in Templates]?: (props: unknown) => React.ReactNode } =
	{
		// Order templates
		[Templates.ORDER_PLACED]: orderPlacedEmail,
		[Templates.ORDER_PLACED_PICKUP]: orderPlacedPickupEmail,
		[Templates.ORDER_SHIPPED]: orderShippedEmail,
		[Templates.ORDER_DELIVERED]: orderDeliveredEmail,
		[Templates.ORDER_CANCELLED]: orderCancelledEmail,
		// Customer templates
		[Templates.WELCOME]: customerWelcomeEmail,
		[Templates.PASSWORD_RESET]: passwordResetEmail,
		// Admin templates
		[Templates.ADMIN_PASSWORD_RESET]: adminPasswordResetEmail,
		[Templates.USER_INVITED]: userInvitedEmail,
		// Offer templates
		[Templates.OFFER_ACTIVE]: offerActiveEmail,
		[Templates.OFFER_ACCEPTED]: offerAcceptedEmail,
		[Templates.OFFER_COMPLETED]: offerCompletedEmail,
		[Templates.OFFER_CANCELLED]: offerCancelledEmail,
		// Product inquiry templates
		[Templates.PRODUCT_INQUIRY]: productInquiryEmail,
		// Quote request templates (Sperrgut)
		[Templates.QUOTE_REQUEST]: quoteRequestEmail,
		// Contact form templates
		[Templates.CONTACT_FORM]: contactFormEmail,
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

	getTemplate(template: Templates) {
		if (this.options.html_templates?.[template]) {
			return this.options.html_templates[template].content;
		}
		const allowedTemplates = Object.keys(templates);

		if (!allowedTemplates.includes(template)) {
			return null;
		}

		return templates[template];
	}

	getTemplateSubject(template: Templates) {
		if (this.options.html_templates?.[template]?.subject) {
			return this.options.html_templates[template].subject;
		}
		switch (template) {
			// Order templates
			case Templates.ORDER_PLACED:
				return 'Bestellbestätigung';
			case Templates.ORDER_PLACED_PICKUP:
				return 'Bestellbestätigung - Abholung am Lager';
			case Templates.ORDER_SHIPPED:
				return 'Ihre Bestellung wurde versandt';
			case Templates.ORDER_DELIVERED:
				return 'Ihre Bestellung wurde zugestellt';
			case Templates.ORDER_CANCELLED:
				return 'Bestellung storniert';
			// Customer templates
			case Templates.WELCOME:
				return 'Willkommen bei Basis Camp Berlin';
			case Templates.PASSWORD_RESET:
				return 'Passwort zurücksetzen';
			// Admin templates
			case Templates.ADMIN_PASSWORD_RESET:
				return 'Admin-Passwort zurücksetzen';
			case Templates.USER_INVITED:
				return 'Sie wurden zu unserem Team eingeladen';
			// Offer templates
			case Templates.OFFER_ACTIVE:
				return 'Ihr Angebot ist bereit';
			case Templates.OFFER_ACCEPTED:
				return 'Angebot angenommen - Bestätigung';
			case Templates.OFFER_COMPLETED:
				return 'Angebot erfolgreich abgeschlossen';
			case Templates.OFFER_CANCELLED:
				return 'Angebot storniert';
			case Templates.OFFER_NOTIFICATION:
				return 'Angebot Update';
			// Product inquiry templates
			case Templates.PRODUCT_INQUIRY:
				return 'Neue Anfrage für ein Artikel';
			// Quote request templates (Sperrgut)
			case Templates.QUOTE_REQUEST:
				return 'Neue Versandkosten-Anfrage (Sperrgut)';
			// Contact form templates
			case Templates.CONTACT_FORM:
				return 'Neue Kontaktanfrage';
			default:
				return 'Neue Benachrichtigung';
		}
	}

	async send(
		notification: ProviderSendNotificationDTO,
	): Promise<ProviderSendNotificationResultsDTO> {
		const template = this.getTemplate(notification.template as Templates);

		if (!template) {
			this.logger.error(
				`Couldn't find an email template for ${notification.template}. The valid options are ${Object.values(Templates)}`,
			);
			return {};
		}

		const commonOptions = {
			from: this.options.from,
			to: [notification.to],
			subject: this.getTemplateSubject(notification.template as Templates),
		};

		let emailOptions: CreateEmailOptions;
		if (typeof template === 'string') {
			emailOptions = {
				...commonOptions,
				html: template,
			};
		} else {
			emailOptions = {
				...commonOptions,
				react: template(notification.data),
			};
		}

		// Add attachment support
		if (notification.attachments && notification.attachments.length > 0) {
			emailOptions.attachments = await Promise.all(
				notification.attachments.map(async attachment => {
					// Handle different attachment formats
					if ('url' in attachment && attachment.url) {
						// For S3 URLs, fetch the content
						try {
							const response = await fetch(attachment.url as string);
							if (!response.ok) {
								throw new Error(
									`Failed to fetch attachment: ${response.statusText}`,
								);
							}
							const arrayBuffer = await response.arrayBuffer();
							const buffer = Buffer.from(arrayBuffer);

							return {
								filename: attachment.filename || 'attachment.pdf',
								content: buffer,
							};
						} catch (error) {
							this.logger.error(
								`Failed to fetch attachment from ${(attachment as any).url}:`,
								error,
							);
							throw error;
						}
					} else if ('content' in attachment && attachment.content) {
						// Direct content (Buffer or string)
						return {
							filename: attachment.filename || 'attachment.pdf',
							content: attachment.content,
						};
					} else {
						throw new Error('Attachment must have either url or content');
					}
				}),
			);
		}

		this.logger.info(
			`[RESEND] Attempting to send email to ${notification.to} with template ${notification.template}`,
		);

		const { data, error } = await this.resendClient.emails.send(emailOptions);

		if (error || !data) {
			if (error) {
				this.logger.error(
					'[RESEND] Failed to send email via Resend API:',
					error,
				);
			} else {
				this.logger.error('[RESEND] Failed to send email: unknown error');
			}
			throw new Error(
				`Email send failed: ${error?.message || 'Unknown error'}`,
			);
		}

		this.logger.info(
			`[RESEND] Email sent successfully via Resend API. Email ID: ${data.id}`,
		);

		return { id: data.id };
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
