// src/admin/lib/sdk.ts
// Admin panel client SDK configuration for Medusa backend connection
// See: https://docs.medusajs.com/learn/configurations/medusa-config#admin-configuration
//
// In production: Admin and API are served from same domain via nginx proxy
// - Admin panel: https://basiscamp-berlin.de/app
// - API: https://basiscamp-berlin.de/api  
// Therefore, we use window.location.origin for same-origin requests (no CORS needed)
// In development: Vite runs on different port, so we route to localhost:9000
import Medusa from '@medusajs/js-sdk';

const getBaseUrl = () => {
	// If we're on the browser, use the current origin (works for both dev and prod)
	if (typeof window !== 'undefined') {
		// In local dev, Vite runs on a different port, so detect it
		if (
			window.location.hostname === 'localhost' &&
			window.location.port !== '9000'
		) {
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
