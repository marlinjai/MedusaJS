/**
 * offer-events.ts
 * Subscriber for offer events - handles PDF generation and email notifications
 * Triggers on offer creation and status changes
 */
import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';
import { Modules } from '@medusajs/framework/utils';
import { generateOfferPdfBuffer } from '../utils/pdf-generator';
import type { EmailNotificationSettings } from '../utils/email-settings';

// Define the data structure for offer events
type OfferEventData = {
	offer_id: string;
	offer_number: string;
	status: string;
	previous_status?: string;
	new_status?: string;
	customer_email?: string;
	customer_name?: string;
	user_id?: string;
	email_notifications?: any | null; // Kept for backwards compatibility but not used
};

/**
 * Handle offer created events
 * MANUAL EMAIL MODE: Emails are now sent manually via button clicks, not automatically
 */
export async function handleOfferCreated({
	event: { data },
	container,
}: SubscriberArgs<OfferEventData>) {
	const logger = container.resolve('logger');

	logger.info(
		`[OFFER-SUBSCRIBER] Offer created: ${data.offer_number} (${data.offer_id})`,
	);

	// ✅ MANUAL EMAIL MODE: No automatic email sending
	// Emails must be sent manually via the "Send Email" button in admin UI
	logger.info(
		`[OFFER-SUBSCRIBER] Email sending skipped - use manual "Send Email" button in admin UI`,
	);
}

/**
 * Handle offer status change events
 * MANUAL EMAIL MODE: Emails are now sent manually via button clicks, not automatically
 */
export async function handleOfferStatusChanged({
	event: { data },
	container,
}: SubscriberArgs<OfferEventData>) {
	const logger = container.resolve('logger');

	logger.info(
		`[OFFER-SUBSCRIBER] Offer status changed: ${data.offer_number} (${data.previous_status} → ${data.new_status})`,
	);

	// ✅ MANUAL EMAIL MODE: No automatic email sending
	// Emails must be sent manually via the "Send Email" button in admin UI
	logger.info(
		`[OFFER-SUBSCRIBER] Email sending skipped - use manual "Send Email" button in admin UI`,
	);
}

/**
 * Helper function to map offer status to email notification event type
 */
function getEventTypeFromStatus(
	status?: string,
): keyof EmailNotificationSettings | null {
	const map: Record<string, keyof EmailNotificationSettings> = {
		active: 'offer_active',
		accepted: 'offer_accepted',
		completed: 'offer_completed',
		cancelled: 'offer_cancelled',
	};
	return status ? map[status] || null : null;
}

/**
 * Generate PDF and send email notification
 */
async function generatePdfAndSendEmail(
	data: OfferEventData,
	container: any,
	logger: any,
) {
	try {
		logger.info(
			`[OFFER-SUBSCRIBER] Starting PDF generation and email for offer ${data.offer_number}`,
		);

		// Step 1: Generate PDF and upload to S3
		const pdfResult = await generateOfferPdfToS3(
			data.offer_id,
			container,
			logger,
		);

		if (!pdfResult.success) {
			logger.error(
				`[OFFER-SUBSCRIBER] PDF generation failed for offer ${data.offer_number}:`,
				pdfResult.error,
			);
			return;
		}

		// Step 2: Send email with PDF attachment
		await sendOfferEmail(
			data,
			pdfResult.pdfUrl || '',
			pdfResult.filename || `${data.offer_number}.pdf`,
			container,
			logger,
		);

		logger.info(
			`[OFFER-SUBSCRIBER] Successfully sent offer email with PDF for ${data.offer_number}`,
		);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error(
			`[OFFER-SUBSCRIBER] Error in PDF generation and email process for offer ${data.offer_number}: ${errorMessage}`,
		);
	}
}

/**
 * Generate PDF for offer and upload to S3
 * Returns S3 URL for email attachment
 */
async function generateOfferPdfToS3(
	offerId: string,
	container: any,
	logger: any,
): Promise<{
	success: boolean;
	pdfUrl?: string;
	filename?: string;
	error?: string;
}> {
	try {
		// Get offer service to fetch offer details
		const offerService = container.resolve('offer');
		const offer = await offerService.getOfferWithDetails(offerId);

		if (!offer) {
			return { success: false, error: 'Offer not found' };
		}

		// Check if offer status allows PDF generation (same logic as manual generation)
		const allowedStatuses = ['active', 'accepted', 'cancelled', 'completed'];
		if (!allowedStatuses.includes(offer.status)) {
			return {
				success: false,
				error: `PDF generation not allowed for status: ${offer.status}`,
			};
		}

		logger.info(
			`[OFFER-SUBSCRIBER] Generating PDF for offer ${offer.offer_number}`,
		);

		// Generate PDF using centralized utility
		const pdfBuffer = await generateOfferPdfBuffer(offer);

		// Upload to S3
		const fileModuleService = container.resolve(Modules.FILE);
		const filename = `${offer.offer_number}.pdf`;

		const uploadResult = await fileModuleService.createFiles([
			{
				filename,
				mimeType: 'application/pdf',
				content: Buffer.from(pdfBuffer),
			},
		]);

		logger.info(
			`[OFFER-SUBSCRIBER] PDF uploaded to S3: ${uploadResult[0]?.url}`,
		);

		// Update offer model with PDF URL for future reference
		try {
			await offerService.updateOffers([
				{
					id: offerId,
					pdf_url: uploadResult[0]?.url || '',
				},
			]);
			logger.info(
				`[OFFER-SUBSCRIBER] Updated offer ${offer.offer_number} with PDF URL`,
			);
		} catch (error) {
			logger.error(
				`[OFFER-SUBSCRIBER] Failed to update offer with PDF URL:`,
				error,
			);
			// Continue anyway - email can still be sent
		}

		return {
			success: true,
			pdfUrl: uploadResult[0]?.url || '',
			filename,
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error(`[OFFER-SUBSCRIBER] PDF generation error: ${errorMessage}`);
		return {
			success: false,
			error: errorMessage,
		};
	}
}

/**
 * Send email notification with PDF attachment
 */
async function sendOfferEmail(
	data: OfferEventData,
	pdfUrl: string,
	filename: string,
	container: any,
	logger: any,
) {
	try {
		const notificationModuleService = container.resolve(Modules.NOTIFICATION);

		// Determine email template and subject based on status
		const emailDetails = getEmailDetailsForStatus(
			data.new_status || data.status,
		);

		// Generate acceptance URL for active offers
		let acceptanceUrl: string | undefined;
		const emailStatus = data.new_status || data.status;
		if (emailStatus === 'active' && data.customer_email) {
			const { generateOfferAcceptanceUrl } = require('../../utils/offer-token');
			acceptanceUrl = generateOfferAcceptanceUrl(
				data.offer_id,
				data.customer_email,
			);
		}

		await notificationModuleService.createNotifications({
			to: data.customer_email,
			channel: 'email',
			template: emailDetails.template,
			data: {
				offer_id: data.offer_id,
				offer_number: data.offer_number,
				customer_name: data.customer_name,
				customer_email: data.customer_email,
				status: emailStatus,
				previous_status: data.previous_status,
				acceptance_url: acceptanceUrl,
			},
			attachments: [
				{
					filename,
					url: pdfUrl,
				},
			],
		});

		logger.info(
			`[OFFER-SUBSCRIBER] Email sent to ${data.customer_email} for offer ${data.offer_number}`,
		);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error(`[OFFER-SUBSCRIBER] Email sending error: ${errorMessage}`);
		throw error;
	}
}

/**
 * Get email template and subject based on offer status
 */
function getEmailDetailsForStatus(status: string): {
	template: string;
	subject: string;
} {
	switch (status) {
		case 'active':
			return {
				template: 'offer-active',
				subject: 'Ihr Angebot ist bereit',
			};
		case 'accepted':
			return {
				template: 'offer-accepted',
				subject: 'Angebot angenommen - Bestätigung',
			};
		case 'completed':
			return {
				template: 'offer-completed',
				subject: 'Angebot abgeschlossen',
			};
		case 'cancelled':
			return {
				template: 'offer-cancelled',
				subject: 'Angebot storniert',
			};
		default:
			return {
				template: 'offer-notification',
				subject: 'Angebot Update',
			};
	}
}

// Export subscriber configs
export const offerCreatedConfig: SubscriberConfig = {
	event: 'offer.created',
};

export const offerStatusChangedConfig: SubscriberConfig = {
	event: 'offer.status_changed',
};

// Default export for offer.created
export default handleOfferCreated;
export const config = offerCreatedConfig;
