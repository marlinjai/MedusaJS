// src/admin/lib/sdk.ts
import Medusa from '@medusajs/js-sdk';

// Always use window.location.origin since admin and API are always on the same domain
// The only exception is local development where this might be localhost:5173 -> localhost:9000
const getBaseUrl = () => {
	// If we're on the browser, use the current origin (works for both dev and prod)
	if (typeof window !== 'undefined') {
		// In local dev, Vite runs on a different port, so detect it
		if (window.location.hostname === 'localhost' && window.location.port !== '9000') {
			return 'http://localhost:9000';
		}
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
