// src/admin/lib/sdk.ts
import Medusa from '@medusajs/js-sdk';

// Use relative URL in production (same domain), absolute URL in development
const getBaseUrl = () => {
	// In development, use localhost
	if (import.meta.env.DEV) {
		return 'http://localhost:9000';
	}
	// In production, use the current origin (same domain as admin)
	// Since both admin and API are served from https://basiscamp-berlin.de
	return typeof window !== 'undefined' ? window.location.origin : '';
};

export const sdk = new Medusa({
	baseUrl: getBaseUrl(),
	debug: import.meta.env.DEV,
	auth: {
		type: 'session',
	},
});
