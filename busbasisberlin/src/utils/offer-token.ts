/**
 * offer-token.ts
 * Utility functions for generating and validating secure tokens for offer acceptance links
 */

import { createHash } from 'crypto';

const SECRET_KEY =
	process.env.OFFER_ACCEPTANCE_SECRET ||
	'default-secret-key-change-in-production';

/**
 * Generate a secure token for offer acceptance
 * Token is based on offer_id + customer_email + secret key
 */
export function generateOfferAcceptanceToken(
	offerId: string,
	customerEmail: string,
): string {
	const data = `${offerId}:${customerEmail}:${SECRET_KEY}`;
	const hash = createHash('sha256').update(data).digest('hex');
	// Return first 32 characters for shorter URLs
	return hash.substring(0, 32);
}

/**
 * Validate an offer acceptance token
 * Returns true if token is valid for the given offer and email
 */
export function validateOfferAcceptanceToken(
	token: string,
	offerId: string,
	customerEmail: string,
): boolean {
	const expectedToken = generateOfferAcceptanceToken(offerId, customerEmail);
	return token === expectedToken;
}

/**
 * Generate acceptance URL for offer email
 */
export function generateOfferAcceptanceUrl(
	offerId: string,
	customerEmail: string,
	baseUrl?: string,
): string {
	const token = generateOfferAcceptanceToken(offerId, customerEmail);
	const storefrontUrl =
		baseUrl ||
		process.env.NEXT_PUBLIC_STOREFRONT_URL ||
		process.env.NEXT_PUBLIC_BASE_URL;

	// Use storefront URL for better UX
	const acceptPath = `/de/offers/${offerId}/accept?token=${token}&email=${encodeURIComponent(customerEmail)}`;

	return `${storefrontUrl}${acceptPath}`;
}
