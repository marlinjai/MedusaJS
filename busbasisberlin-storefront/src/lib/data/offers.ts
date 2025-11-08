/**
 * offers.ts
 * Server actions for offer-related operations
 */

'use server';

import medusaError from '@lib/util/medusa-error';

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';

/**
 * Accept an offer via email link
 * Server Action - runs on Next.js server, no CORS issues
 */
export async function acceptOffer(
	offerId: string,
	token: string,
	email: string,
): Promise<{
	success: boolean;
	message?: string;
	error?: string;
	offer?: {
		id: string;
		offer_number: string;
		status: string;
	};
}> {
	try {
		if (!offerId || !token || !email) {
			return {
				success: false,
				error: 'Offer ID, token, and email are required',
			};
		}

		// Server-to-server call - no CORS issues
		const response = await fetch(
			`${BACKEND_URL}/public/offers/${offerId}/accept?token=${token}&email=${encodeURIComponent(email)}`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
			},
		);

		const data = await response.json();

		if (!response.ok || !data.success) {
			return {
				success: false,
				error: data.error || 'Failed to accept offer',
			};
		}

		return {
			success: true,
			message: data.message || 'Offer accepted successfully',
			offer: data.offer,
		};
	} catch (error: any) {
		console.error('[acceptOffer] Error:', error);
		return {
			success: false,
			error: error.message || 'Failed to accept offer',
		};
	}
}

