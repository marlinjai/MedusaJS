/**
 * preview-email/route.ts
 * API endpoint for previewing offer email and PDF before sending
 * Returns both PDF (base64) and rendered email HTML for preview
 */

import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { offerAcceptedEmail } from '../../../../../modules/resend/emails/offer-accepted';
import { offerActiveEmail } from '../../../../../modules/resend/emails/offer-active';
import { offerCancelledEmail } from '../../../../../modules/resend/emails/offer-cancelled';
import { offerCompletedEmail } from '../../../../../modules/resend/emails/offer-completed';
import { resolveOfferService } from '../../../../../types/services';
import { generateOfferPdfBuffer } from '../../../../../utils/pdf-generator';
import { generateOfferAcceptanceUrl } from '../../../../../utils/offer-token';

interface PreviewEmailParams {
	id: string;
}

interface PreviewEmailRequest {
	event_type?: string; // Optional: 'offer_active', 'offer_accepted', 'offer_completed', 'offer_cancelled'
}

/**
 * Get email template component based on status
 */
function getEmailTemplate(status: string) {
	switch (status) {
		case 'active':
			return offerActiveEmail;
		case 'accepted':
			return offerAcceptedEmail;
		case 'completed':
			return offerCompletedEmail;
		case 'cancelled':
			return offerCancelledEmail;
		default:
			return offerActiveEmail;
	}
}

/**
 * POST /admin/offers/{id}/preview-email
 * Generate preview of PDF and email HTML for offer
 */
export async function POST(
	req: MedusaRequest<PreviewEmailRequest, PreviewEmailParams>,
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

		// Validate offer status allows PDF generation
		const allowedStatuses = ['active', 'accepted', 'cancelled', 'completed'];
		if (!allowedStatuses.includes(offer.status)) {
			res.status(400).json({
				success: false,
				error: `Cannot preview email for offer with status: ${offer.status}. Allowed statuses: ${allowedStatuses.join(', ')}`,
			});
			return;
		}

		logger.info(
			`[PREVIEW-EMAIL] Generating preview for offer ${offer.offer_number} (${id})`,
		);

		// Determine email type from event_type or offer status
		const emailStatus = event_type
			? event_type.replace('offer_', '')
			: offer.status;

		// Step 1: Generate PDF
		logger.info(
			`[PREVIEW-EMAIL] Generating PDF for offer ${offer.offer_number}`,
		);
		const pdfBuffer = await generateOfferPdfBuffer(offer);
		const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

		// Step 2: Render email template to HTML
		logger.info(
			`[PREVIEW-EMAIL] Rendering email template for status: ${emailStatus}`,
		);
		const emailTemplate = getEmailTemplate(emailStatus);

		// Generate acceptance URL for active offers
		let acceptanceUrl: string | undefined;
		if (emailStatus === 'active' && offer.customer_email) {
			acceptanceUrl = generateOfferAcceptanceUrl(
				offer.id,
				offer.customer_email,
			);
		}

		const emailProps = {
			offer_id: offer.id,
			offer_number: offer.offer_number,
			customer_name: offer.customer_name || undefined,
			customer_email: offer.customer_email || undefined,
			status: emailStatus,
			acceptance_url: acceptanceUrl,
		};
		const emailComponent = emailTemplate(emailProps);
		const emailHtml = renderToString(createElement(() => emailComponent));

		// Step 3: Get email subject
		const emailSubject = getEmailSubject(emailStatus);

		logger.info(
			`[PREVIEW-EMAIL] Successfully generated preview for offer ${offer.offer_number}`,
		);

		res.json({
			success: true,
			pdf: {
				base64: pdfBase64,
				filename: `${offer.offer_number}.pdf`,
			},
			email: {
				html: emailHtml,
				subject: emailSubject,
				to: offer.customer_email,
			},
		});
	} catch (error) {
		logger.error(`[PREVIEW-EMAIL] Error generating preview:`, error);

		res.status(500).json({
			success: false,
			error: error.message || 'Failed to generate preview',
			details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
		});
	}
}

/**
 * Get email subject based on offer status
 */
function getEmailSubject(status: string): string {
	switch (status) {
		case 'active':
			return 'Ihr Angebot ist bereit';
		case 'accepted':
			return 'Angebot angenommen - Bestätigung';
		case 'completed':
			return 'Angebot erfolgreich abgeschlossen';
		case 'cancelled':
			return 'Angebot storniert';
		default:
			return 'Angebot Update';
	}
}
