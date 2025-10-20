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
import { offerAcceptedEmail } from './emails/offer-accepted';
import { offerActiveEmail } from './emails/offer-active';
import { offerCancelledEmail } from './emails/offer-cancelled';
import { offerCompletedEmail } from './emails/offer-completed';
import { orderPlacedEmail } from './emails/order-placed';
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
	ORDER_SHIPPED = 'order-shipped',
	ORDER_DELIVERED = 'order-delivered',
	ORDER_CANCELLED = 'order-cancelled',
	ORDER_REFUNDED = 'order-refunded',
	ORDER_RETURNED = 'order-returned',
	PASSWORD_RESET = 'password-reset',
	WELCOME = 'welcome',
	VERIFICATION = 'verification',
	ORDER_CONFIRMATION = 'order-confirmation',
	// Offer templates
	OFFER_ACTIVE = 'offer-active',
	OFFER_ACCEPTED = 'offer-accepted',
	OFFER_COMPLETED = 'offer-completed',
	OFFER_CANCELLED = 'offer-cancelled',
	OFFER_NOTIFICATION = 'offer-notification',
	// User management templates
	USER_INVITED = 'user-invited',
}

const templates: { [key in Templates]?: (props: unknown) => React.ReactNode } =
	{
		[Templates.ORDER_PLACED]: orderPlacedEmail,
		[Templates.PASSWORD_RESET]: passwordResetEmail,
		// Offer templates
		[Templates.OFFER_ACTIVE]: offerActiveEmail,
		[Templates.OFFER_ACCEPTED]: offerAcceptedEmail,
		[Templates.OFFER_COMPLETED]: offerCompletedEmail,
		[Templates.OFFER_CANCELLED]: offerCancelledEmail,
		// User management templates
		[Templates.USER_INVITED]: userInvitedEmail,
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
			case Templates.ORDER_PLACED:
				return 'Order Confirmation';
			case Templates.PASSWORD_RESET:
				return 'Reset Your Password';
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
			case Templates.USER_INVITED:
				return 'Sie wurden zu unserem Team eingeladen';
			default:
				return 'New Email';
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
