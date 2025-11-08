/**
 * /public/offers/[id]/accept/route.ts
 * Public API endpoint for customers to accept offers via email link
 * Route is under /public instead of /store to avoid publishable API key requirement
 */

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { resolveOfferService } from '../../../../../types/services';
import { validateOfferAcceptanceToken } from '../../../../../utils/offer-token';
import { transitionOfferStatusWorkflow } from '../../../../../workflows/transition-offer-status';

interface AcceptOfferParams {
	id: string;
}

interface AcceptOfferQuery {
	token?: string;
	email?: string;
}

// Disable default CORS middleware - we use custom middleware instead
export const CORS = false;

// Handle OPTIONS preflight requests explicitly
export async function OPTIONS(
	req: MedusaRequest,
	res: MedusaResponse,
): Promise<void> {
	const origin = req.headers.origin || '*';
	res.setHeader('Access-Control-Allow-Origin', origin);
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	res.setHeader('Access-Control-Max-Age', '3600');
	res.status(204).end();
	return;
}

export async function POST(
	req: MedusaRequest<AcceptOfferQuery, AcceptOfferParams>,
	res: MedusaResponse,
): Promise<void> {
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	// Set CORS headers for POST response (fallback if middleware doesn't apply)
	const origin = req.headers.origin || '*';
	res.setHeader('Access-Control-Allow-Origin', origin);
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

	const { id } = req.params;
	const token =
		typeof req.query.token === 'string' ? req.query.token : undefined;
	const email =
		typeof req.query.email === 'string' ? req.query.email : undefined;

	try {
		// Validate required parameters
		if (!token) {
			res.status(400).json({
				success: false,
				error: 'Token is required',
			});
			return;
		}

		if (!email) {
			res.status(400).json({
				success: false,
				error: 'Email is required',
			});
			return;
		}

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

		// Validate token
		if (!validateOfferAcceptanceToken(token, id, email)) {
			logger.warn(
				`[OFFER-ACCEPT] Invalid token for offer ${id} from email ${email}`,
			);
			res.status(403).json({
				success: false,
				error: 'Invalid or expired token',
			});
			return;
		}

		// Validate email matches offer
		if (offer.customer_email?.toLowerCase() !== email.toLowerCase()) {
			logger.warn(
				`[OFFER-ACCEPT] Email mismatch for offer ${id}: expected ${offer.customer_email}, got ${email}`,
			);
			res.status(403).json({
				success: false,
				error: 'Email does not match offer',
			});
			return;
		}

		// Validate offer can be accepted (must be 'active')
		if (offer.status !== 'active') {
			res.status(400).json({
				success: false,
				error: `Offer cannot be accepted. Current status: ${offer.status}. Only 'active' offers can be accepted.`,
			});
			return;
		}

		logger.info(
			`[OFFER-ACCEPT] Customer accepting offer ${offer.offer_number} (${id}) via email link`,
		);

		// Transition offer status to 'accepted' using workflow
		const result = await transitionOfferStatusWorkflow(req.scope).run({
			input: {
				offer_id: id,
				new_status: 'accepted',
				user_id: 'customer', // Indicates customer-initiated acceptance
			},
		});

		logger.info(
			`[OFFER-ACCEPT] Successfully accepted offer ${offer.offer_number}`,
		);

		res.json({
			success: true,
			message: 'Offer accepted successfully',
			offer: {
				id: offer.id,
				offer_number: offer.offer_number,
				status: 'accepted',
			},
		});
	} catch (error: any) {
		logger.error(`[OFFER-ACCEPT] Error accepting offer:`, error);

		res.status(500).json({
			success: false,
			error: error.message || 'Failed to accept offer',
			details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
		});
	}
}
