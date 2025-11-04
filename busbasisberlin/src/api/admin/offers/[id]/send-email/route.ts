/**
 * /admin/offers/[id]/send-email/route.ts
 * API route for manually sending offer emails
 *
 * This route allows admins to manually send offer emails via button click.
 * Emails are no longer sent automatically on status changes.
 */

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';
import { resolveOfferService } from '../../../../../types/services';
import { generateOfferPdfBuffer } from '../../../../../utils/pdf-generator';

interface SendEmailRequest {
	event_type?: string; // Optional: 'offer_active', 'offer_accepted', 'offer_completed', 'offer_cancelled'
}

interface SendEmailParams {
	id: string;
}

export async function POST(
	req: MedusaRequest<SendEmailRequest, SendEmailParams>,
	res: MedusaResponse,
): Promise<void> {
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
	const { id } = req.params;
	const { event_type } = req.body;

	try {
		const offerService = resolveOfferService(req.scope);

		// Get offer details
		const offer = await offerService.getOfferWithDetails(id);

		if (!offer) {
			res.status(404).json({
				success: false,
				error: 'Offer not found',
			});
			return;
		}

		// Validate offer has customer email
		if (!offer.customer_email) {
			res.status(400).json({
				success: false,
				error: 'Offer does not have a customer email address',
			});
			return;
		}

		// Validate offer status allows PDF generation
		const allowedStatuses = ['active', 'accepted', 'cancelled', 'completed'];
		if (!allowedStatuses.includes(offer.status)) {
			res.status(400).json({
				success: false,
				error: `Cannot send email for offer with status: ${offer.status}. Allowed statuses: ${allowedStatuses.join(', ')}`,
			});
			return;
		}

		logger.info(
			`[SEND-EMAIL] Manual email sending requested for offer ${offer.offer_number} (${id})`,
		);

		// Determine email type from event_type or offer status
		const emailStatus = event_type
			? event_type.replace('offer_', '')
			: offer.status;

		// Step 1: Generate PDF
		logger.info(`[SEND-EMAIL] Generating PDF for offer ${offer.offer_number}`);
		const pdfBuffer = await generateOfferPdfBuffer(offer);

		// Step 2: Upload PDF to S3
		const fileModuleService = req.scope.resolve(Modules.FILE);
		const filename = `${offer.offer_number}.pdf`;

		const uploadResult = await fileModuleService.createFiles([
			{
				filename,
				mimeType: 'application/pdf',
				content: Buffer.from(pdfBuffer),
			},
		]);

		const pdfUrl = uploadResult[0]?.url || '';

		logger.info(`[SEND-EMAIL] PDF uploaded to S3: ${pdfUrl}`);

		// Step 3: Update offer with PDF URL
		try {
			await offerService.updateOffers([
				{
					id: id,
					pdf_url: pdfUrl,
				},
			]);
		} catch (error) {
			logger.warn(
				`[SEND-EMAIL] Failed to update offer with PDF URL: ${error.message}`,
			);
			// Continue anyway - email can still be sent
		}

		// Step 4: Send email with PDF attachment
		const notificationModuleService = req.scope.resolve(Modules.NOTIFICATION);

		const emailDetails = getEmailDetailsForStatus(emailStatus);

		// Fetch PDF content from S3 URL for attachment
		let attachmentContent: Buffer | undefined;
		if (pdfUrl) {
			try {
				const response = await fetch(pdfUrl);
				if (response.ok) {
					const arrayBuffer = await response.arrayBuffer();
					attachmentContent = Buffer.from(arrayBuffer);
				}
			} catch (error) {
				logger.warn(
					`[SEND-EMAIL] Failed to fetch PDF for attachment: ${error.message}`,
				);
			}
		}

		// Create notification - must be an array
		const notificationData: any = {
			to: offer.customer_email,
			channel: 'email',
			template: emailDetails.template,
			data: {
				offer_id: offer.id,
				offer_number: offer.offer_number,
				customer_name: offer.customer_name,
				status: emailStatus,
			},
		};

		// Add attachment if we have content
		if (attachmentContent) {
			notificationData.attachments = [
				{
					filename,
					content: attachmentContent,
				},
			];
		}

		await notificationModuleService.createNotifications([notificationData]);

		logger.info(
			`[SEND-EMAIL] Successfully sent email to ${offer.customer_email} for offer ${offer.offer_number}`,
		);

		res.json({
			success: true,
			message: `Email sent successfully to ${offer.customer_email}`,
			offer_number: offer.offer_number,
			email_type: emailStatus,
		});
	} catch (error) {
		logger.error(`[SEND-EMAIL] Error sending email:`, error);

		res.status(500).json({
			success: false,
			error: error.message || 'Failed to send email',
			details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
		});
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
