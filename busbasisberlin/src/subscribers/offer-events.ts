/**
 * offer-events.ts
 * Subscriber for offer events - handles PDF generation and email notifications
 * Triggers on offer creation and status changes
 */
import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';
import { Modules } from '@medusajs/framework/utils';
import {
	shouldSendEmailForOfferCreation,
	shouldSendEmailForStatusChange,
} from '../utils/email-settings';
import { generateOfferPdfBuffer } from '../utils/pdf-generator';

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
};

/**
 * Handle offer created events
 * Currently just logs the event - PDF generation typically happens when status changes to 'active'
 */
export async function handleOfferCreated({
	event: { data },
	container,
}: SubscriberArgs<OfferEventData>) {
	const logger = container.resolve('logger');

	logger.info(
		`[OFFER-SUBSCRIBER] Offer created: ${data.offer_number} (${data.offer_id})`,
	);

	// Check if email notifications are enabled for offer creation
	if (!shouldSendEmailForOfferCreation()) {
		logger.info(
			`[OFFER-SUBSCRIBER] Email notifications disabled for offer creation - skipping ${data.offer_number}`,
		);
		return;
	}

	// For now, we don't generate PDFs for draft offers
	// PDF generation will happen when status changes to 'active' or later
	if (data.status === 'draft') {
		logger.info(
			`[OFFER-SUBSCRIBER] Skipping PDF generation for draft offer ${data.offer_number}`,
		);
		return;
	}

	// If offer is created with active status, trigger PDF generation and email
	if (data.status === 'active' && data.customer_email) {
		await generatePdfAndSendEmail(data, container, logger);
	}
}

/**
 * Handle offer status change events
 * Generates PDF and sends email for certain status transitions
 */
export async function handleOfferStatusChanged({
	event: { data },
	container,
}: SubscriberArgs<OfferEventData>) {
	const logger = container.resolve('logger');

	logger.info(
		`[OFFER-SUBSCRIBER] Offer status changed: ${data.offer_number} (${data.previous_status} → ${data.new_status})`,
	);

	// Check if email notifications are enabled for this status change
	const shouldSendEmail = shouldSendEmailForStatusChange(
		data.previous_status,
		data.new_status,
	);

	if (shouldSendEmail && data.customer_email) {
		await generatePdfAndSendEmail(data, container, logger);
	} else {
		const reason = !shouldSendEmail
			? 'email notifications disabled for this status change'
			: 'no customer email provided';
		logger.info(
			`[OFFER-SUBSCRIBER] Skipping email for status change ${data.previous_status} → ${data.new_status}: ${reason}`,
		);
	}
}

// Email trigger logic moved to utils/email-settings.ts

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
				content: Buffer.from(pdfBuffer).toString('binary'), // Use binary string, not base64
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

		await notificationModuleService.createNotifications({
			to: data.customer_email,
			channel: 'email',
			template: emailDetails.template,
			data: {
				offer_id: data.offer_id,
				offer_number: data.offer_number,
				customer_name: data.customer_name,
				status: data.new_status || data.status,
				previous_status: data.previous_status,
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
