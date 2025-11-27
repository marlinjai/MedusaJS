/**
 * generate-invoice/route.ts
 * API endpoint for generating professional German-compliant invoice PDFs from offers
 *
 * Standards Compliance:
 * - DIN 5008 (German business letter format)
 * - GoBD requirements (German tax compliance)
 * - Professional invoice layout
 */

import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';
import { resolveOfferService } from '../../../../../types/services';
import { generateInvoicePdfBuffer } from '../../../../../utils/pdf-generator';

const OFFER_MODULE = 'offer';

interface OfferParams {
	id: string;
}

/**
 * POST /admin/offers/{id}/generate-invoice
 * Generate professional German-compliant invoice PDF from offer
 * Only available for active, accepted, and completed offers
 */
export async function POST(
	req: MedusaRequest<OfferParams>,
	res: MedusaResponse,
): Promise<void> {
	const offerService = resolveOfferService(req.scope);
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	try {
		const { id: offerId } = req.params;

		if (!offerId) {
			res.status(400).json({
				error: 'Validation error',
				message: 'Offer ID is required',
			});
			return;
		}

		// Get offer with full details
		const offer = await offerService.getOfferWithDetails(offerId);
		if (!offer) {
			res.status(404).json({
				error: 'Not found',
				message: 'Offer not found',
			});
			return;
		}

		// Check if offer status allows invoice generation (only active, accepted, completed)
		const allowedStatuses = ['active', 'accepted', 'completed'];
		if (!allowedStatuses.includes(offer.status)) {
			res.status(400).json({
				error: 'Invalid status',
				message:
					'Invoice can only be generated for active, accepted, or completed offers',
			});
			return;
		}

		logger.info(
			`[INVOICE-GENERATION] Generating invoice PDF for offer ${offer.offer_number}`,
		);

		// Use separate invoice PDF generation utility with "Rechnung" template
		const pdfBuffer = await generateInvoicePdfBuffer(offer);

		// Upload invoice PDF to S3 for persistence and future access
		const fileModuleService = req.scope.resolve(Modules.FILE);
		const filename = `Rechnung-${offer.offer_number}.pdf`;

		logger.info(`[INVOICE-GENERATION] Starting S3 upload for ${filename}`);
		logger.info(
			`[INVOICE-GENERATION] PDF buffer size: ${pdfBuffer.length} bytes`,
		);

		let s3Url: string | null = null;
		try {
			// Try File Module first
			logger.info(`[INVOICE-GENERATION] Attempting File Module upload...`);
			const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
			const uploadResult = await fileModuleService.createFiles([
				{
					filename,
					mimeType: 'application/pdf',
					content: pdfBase64,
				},
			]);

			// Extract URL from result
			if (Array.isArray(uploadResult)) {
				s3Url = (uploadResult[0] as any)?.url || null;
			} else {
				s3Url = (uploadResult as any)?.url || null;
			}

			logger.info(
				`[INVOICE-GENERATION] File Module upload successful: ${s3Url}`,
			);
		} catch (error) {
			logger.error(`[INVOICE-GENERATION] File Module upload failed:`, error);

			// Fallback: Direct S3 upload
			try {
				logger.info(`[INVOICE-GENERATION] Attempting direct S3 upload...`);

				// Import AWS SDK
				const { S3Client, PutObjectCommand } = await import(
					'@aws-sdk/client-s3'
				);

				// Create S3 client
				const s3Client = new S3Client({
					region: process.env.S3_REGION,
					endpoint: process.env.S3_ENDPOINT,
					credentials: {
						accessKeyId: process.env.S3_ACCESS_KEY_ID!,
						secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
					},
					forcePathStyle: true,
				});

				// Upload to S3
				const uploadCommand = new PutObjectCommand({
					Bucket: process.env.S3_BUCKET!,
					Key: filename,
					Body: pdfBuffer,
					ContentType: 'application/pdf',
				});

				await s3Client.send(uploadCommand);

				// Construct the URL
				s3Url = `${process.env.S3_FILE_URL}/${filename}`;
				logger.info(
					`[INVOICE-GENERATION] Direct S3 upload successful: ${s3Url}`,
				);
			} catch (s3Error) {
				logger.error(
					`[INVOICE-GENERATION] Direct S3 upload also failed:`,
					s3Error,
				);
				// Continue with direct download even if S3 upload fails
			}
		}

		// Update offer model with invoice URL if S3 upload was successful
		if (s3Url) {
			logger.info(
				`[INVOICE-GENERATION] Attempting to update offer ${offerId} with invoice URL: ${s3Url}`,
			);
			try {
				const updateResult = await offerService.updateOffers({
					id: offerId,
					pdf_url: s3Url,
				});
				logger.info(
					`[INVOICE-GENERATION] Updated offer ${offer.offer_number} with invoice URL. Update result: ${JSON.stringify(updateResult)}`,
				);
			} catch (error) {
				logger.error(
					`[INVOICE-GENERATION] Failed to update offer with invoice URL:`,
					error,
				);
				logger.error(`[INVOICE-GENERATION] Database update error details:`, {
					message: error.message,
					stack: error.stack,
					name: error.name,
				});
			}
		} else {
			logger.warn(
				`[INVOICE-GENERATION] No S3 URL available, skipping database update`,
			);
		}

		// Set response headers for PDF download
		res.setHeader('Content-Type', 'application/pdf');
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
		res.setHeader('Content-Length', pdfBuffer.length);

		// Send invoice PDF directly to browser
		res.end(pdfBuffer);
	} catch (error) {
		logger.error('[INVOICE-GENERATION] Error:', error);
		res.status(500).json({
			error: 'Internal server error',
			message: error.message || 'Unable to generate invoice',
		});
	}
}
