/**
 * /store/quote-request/route.ts
 * API route for shipping quote requests (Sperrgut)
 *
 * This route receives quote requests from the frontend
 * and sends an email notification to info@basiscampberlin.de using
 * Medusa's Notification Module with Resend.
 */

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';

interface QuoteRequestRequest {
	product: {
		id: string;
		title: string;
		handle?: string;
		variantId?: string;
	};
	customer: {
		name: string;
		email: string;
		phone?: string;
		address?: string;
		city?: string;
		postalCode?: string;
		message?: string;
	};
}

export async function POST(
	req: MedusaRequest<QuoteRequestRequest>,
	res: MedusaResponse,
): Promise<void> {
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	try {
		const { product, customer } = req.body;

		// Validate required fields
		if (!product || !product.id || !product.title) {
			res.status(400).json({
				success: false,
				error: 'Product information is required',
			});
			return;
		}

		if (!customer || !customer.name || !customer.email) {
			res.status(400).json({
				success: false,
				error: 'Customer name and email are required',
			});
			return;
		}

		// Address is required for shipping quote
		if (!customer.address || !customer.city || !customer.postalCode) {
			res.status(400).json({
				success: false,
				error: 'Shipping address (address, city, postal code) is required',
			});
			return;
		}

		logger.info(
			`[QUOTE-REQUEST] Received quote request for product ${product.id} from ${customer.email}`,
		);

		// Get notification service
		const notificationModuleService = req.scope.resolve(Modules.NOTIFICATION);

		// Prepare notification data
		const notificationData = {
			to: 'info@basiscampberlin.de',
			channel: 'email',
			template: 'quote-request',
			data: {
				product_title: product.title,
				product_id: product.id,
				product_handle: product.handle || '',
				variant_id: product.variantId || '',
				customer_name: customer.name,
				customer_email: customer.email,
				customer_phone: customer.phone || '',
				customer_address: customer.address || '',
				customer_city: customer.city || '',
				customer_postal_code: customer.postalCode || '',
				customer_message: customer.message || '',
			},
		};

		// Send notification using Medusa's Notification Module
		await notificationModuleService.createNotifications([notificationData]);

		logger.info(
			`[QUOTE-REQUEST] Successfully sent quote request email for product ${product.id}`,
		);

		res.json({
			success: true,
			message: 'Quote request sent successfully',
		});
	} catch (error) {
		logger.error(`[QUOTE-REQUEST] Error processing quote request:`, error);

		res.status(500).json({
			success: false,
			error: error.message || 'Failed to process quote request',
			details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
		});
	}
}

