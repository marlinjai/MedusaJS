/**
 * get-cached-pdf/route.ts
 * API endpoint to check for and serve PDFs from S3 (via offer.pdf_url)
 * Replaces local file caching with S3-based PDF storage
 */

import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

const OFFER_MODULE = 'offer';

interface OfferParams {
	id: string;
}

/**
 * GET /admin/offers/{id}/get-cached-pdf
 * Check if a PDF exists in S3 (via offer.pdf_url) and redirect to it or return info
 */
export async function GET(
	req: MedusaRequest<OfferParams>,
	res: MedusaResponse,
): Promise<void> {
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	try {
		const { id: offerId } = req.params;
		const { action } = req.query;

		if (!offerId) {
			res.status(400).json({
				error: 'Validation error',
				message: 'Offer ID is required',
			});
			return;
		}

		// Get offer with PDF URL from database
		const offerService = req.scope.resolve(OFFER_MODULE);
		const offer = await offerService.getOfferWithDetails(offerId);

		if (!offer) {
			res.status(404).json({
				error: 'Not found',
				message: 'Offer not found',
			});
			return;
		}

		logger.info(
			`[PDF-S3] Retrieved offer: ${offer.offer_number}, pdf_url: ${offer.pdf_url}`,
		);

		// Check if PDF URL exists in offer
		const hasPdf = Boolean(offer.pdf_url);
		logger.info(`[PDF-S3] Offer has PDF: ${hasPdf}, pdf_url: ${offer.pdf_url}`);

		// If just checking existence
		if (action === 'check') {
			res.json({
				exists: hasPdf,
				pdfUrl: offer.pdf_url || null,
				lastModified: offer.updated_at,
				isRecent: true, // S3 PDFs are always considered recent
			});
			return;
		}

		// If no PDF URL, return 404
		if (!hasPdf) {
			res.status(404).json({
				error: 'Not found',
				message: 'No PDF found for this offer',
			});
			return;
		}

		// Redirect to S3 URL for direct access
		logger.info(
			`[PDF-S3] Redirecting to S3 PDF for offer ${offer.offer_number}: ${offer.pdf_url}`,
		);
		res.redirect(302, offer.pdf_url!);
	} catch (error) {
		logger.error('[PDF-S3] Error in get-cached-pdf:', error);
		res.status(500).json({
			error: 'Internal server error',
			message: error.message || 'Unable to process request',
		});
	}
}
