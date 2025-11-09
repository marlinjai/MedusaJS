/**
 * middlewares.ts
 * Custom middleware configuration for API routes
 */

import type {
	MedusaNextFunction,
	MedusaRequest,
	MedusaResponse,
} from '@medusajs/framework/http';
import { defineMiddlewares } from '@medusajs/framework/http';
import type { ConfigModule } from '@medusajs/framework/types';
import { parseCorsOrigins } from '@medusajs/framework/utils';
import cors from 'cors';

/**
 * CORS middleware for public routes (offer acceptance, password reset, etc.)
 * Uses Medusa's CORS utilities to properly handle CORS
 */
function corsMiddleware(
	req: MedusaRequest,
	res: MedusaResponse,
	next: MedusaNextFunction,
) {
	// Log for debugging
	if (process.env.NODE_ENV === 'development') {
		console.log('[CORS-MIDDLEWARE] Applying CORS to:', req.url);
	}

	const configModule: ConfigModule = req.scope.resolve('configModule');

	return cors({
		origin: parseCorsOrigins(configModule.projectConfig.http.storeCors),
		credentials: true,
		methods: ['GET', 'POST', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
	})(req, res, next);
}

export default defineMiddlewares({
	routes: [
		{
			// Match the offer acceptance route with dynamic ID parameter
			// Route is now under /public instead of /store to avoid publishable API key requirement
			// Using string pattern instead of regex for better compatibility
			matcher: '/public/offers/*/accept',
			middlewares: [corsMiddleware],
		},
		{
			// Contact form endpoint (no authentication required)
			matcher: '/store/contact',
			middlewares: [corsMiddleware],
		},
		{
			// Quote request endpoint for Sperrgut items (no authentication required)
			matcher: '/store/quote-request',
			middlewares: [corsMiddleware],
		},
		{
			// Product inquiry endpoint (no authentication required)
			matcher: '/store/product-inquiry',
			middlewares: [corsMiddleware],
		},
	],
});
