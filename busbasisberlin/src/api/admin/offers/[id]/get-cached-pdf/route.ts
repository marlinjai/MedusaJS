/**
 * get-cached-pdf/route.ts
 * API endpoint to check for and serve cached PDFs
 */

import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import * as fs from 'fs';
import * as path from 'path';

const OFFER_MODULE = 'offer';

interface OfferParams {
	id: string;
}

/**
 * GET /admin/offers/{id}/get-cached-pdf
 * Check if a cached PDF exists and return its info or serve it
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

		// Define cache directory and file path
		const cacheDir = path.join(process.cwd(), 'tmp', 'pdfs');
		const pdfPath = path.join(cacheDir, `offer-${offerId}.pdf`);

		// Check if PDF exists
		if (!fs.existsSync(pdfPath)) {
			if (action === 'check') {
				res.json({ exists: false });
				return;
			} else {
				res.status(404).json({
					error: 'Not found',
					message: 'No cached PDF found for this offer',
				});
				return;
			}
		}

		// Get file stats
		const stats = fs.statSync(pdfPath);
		const lastModified = stats.mtime;
		const now = new Date();
		const hoursSinceGenerated =
			(now.getTime() - lastModified.getTime()) / (1000 * 60 * 60);

		// If just checking existence
		if (action === 'check') {
			res.json({
				exists: true,
				lastModified: lastModified.toISOString(),
				hoursSinceGenerated: Math.round(hoursSinceGenerated * 10) / 10,
				isRecent: hoursSinceGenerated < 24, // Consider recent if less than 24 hours old
			});
			return;
		}

		// Get actual offer number from database
		let filename = `OFFER-${offerId}.pdf`; // fallback
		try {
			const offerService = req.scope.resolve(OFFER_MODULE);
			const offer = await offerService.getOfferWithDetails(offerId);
			if (offer && offer.offer_number) {
				filename = `${offer.offer_number}.pdf`;
			}
		} catch (error) {
			logger.warn(
				`[PDF-CACHE] Could not get offer number for ${offerId}, using fallback`,
			);
		}

		try {
			res.setHeader('Content-Type', 'application/pdf');
			res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
			res.setHeader('Last-Modified', lastModified.toUTCString());

			// Stream the file
			const fileStream = fs.createReadStream(pdfPath);
			fileStream.pipe(res);

			logger.info(`[PDF-CACHE] Served cached PDF for offer ${offerId}`);
		} catch (error) {
			logger.error(
				`[PDF-CACHE] Error serving PDF for offer ${offerId}:`,
				error,
			);
			res.status(500).json({
				error: 'File serving error',
				message: 'Unable to serve cached PDF',
			});
		}
	} catch (error) {
		logger.error('[PDF-CACHE] Error checking cached PDF:', error);
		res.status(500).json({
			error: 'Cache check failed',
			message: error.message || 'Unable to check PDF cache',
		});
	}
}
