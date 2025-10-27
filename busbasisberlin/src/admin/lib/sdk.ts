// src/admin/lib/sdk.ts
import Medusa from '@medusajs/js-sdk';

// Use window.location.origin since admin and API are on the same domain
// In development, use http://localhost:9000 (admin and API are on different ports)
const getBaseUrl = () => {
	// In development, API is always on port 9000
	if (import.meta.env.DEV) {
		return 'http://localhost:9000';
	}
	// In production, admin and API are on the same domain
	if (typeof window !== 'undefined') {
		return window.location.origin;
	}
	// SSR fallback
	return 'http://localhost:9000';
};

export const sdk = new Medusa({
	baseUrl: getBaseUrl(),
	debug: import.meta.env.DEV,
	auth: {
		type: 'session',
	},
});
