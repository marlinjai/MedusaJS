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

/**
 * Debug middleware to track admin API requests timing and authentication
 */
function adminDebugMiddleware(
	req: MedusaRequest,
	res: MedusaResponse,
	next: MedusaNextFunction,
) {
	// #region agent log
	const requestStartTime = Date.now();
	fetch('http://127.0.0.1:7242/ingest/8dec15ee-be69-4a0f-a1bf-ccc71cc82934',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'middlewares.ts:adminDebugMiddleware',message:'Admin request received',data:{url:req.url,method:req.method,hasCookie:!!req.headers.cookie,hasAuth:!!req.headers.authorization,userAgent:req.headers['user-agent']},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,E'})}).catch(()=>{});
	
	// Capture response timing
	const originalJson = res.json.bind(res);
	const originalStatus = res.status.bind(res);
	let statusCode = 200;
	
	res.status = function(code: number) {
		statusCode = code;
		return originalStatus(code);
	};
	
	res.json = function(body: any) {
		const duration = Date.now() - requestStartTime;
		fetch('http://127.0.0.1:7242/ingest/8dec15ee-be69-4a0f-a1bf-ccc71cc82934',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'middlewares.ts:response',message:'Admin response sent',data:{url:req.url,statusCode,duration},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D,E'})}).catch(()=>{});
		return originalJson(body);
	};
	// #endregion
	
	next();
}

export default defineMiddlewares({
	routes: [
		{
			// Debug middleware for all admin requests
			matcher: '/admin/*',
			middlewares: [adminDebugMiddleware],
		},
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
		{
			// Public settings endpoint for announcement banners (no authentication required)
			matcher: '/public/settings',
			middlewares: [corsMiddleware],
		},
	],
});
