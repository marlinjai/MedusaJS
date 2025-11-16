/**
 * /store/product-inquiry/route.ts
 * API route for product inquiry requests (Artikel auf Anfrage)
 *
 * This route receives product inquiry requests from the frontend
 * and sends an email notification to info@basiscampberlin.de using
 * Medusa's Notification Module with Resend.
 */

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';

interface ProductInquiryRequest {
	product: {
		id: string;
		title: string;
		handle?: string;
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
	req: MedusaRequest<ProductInquiryRequest>,
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

		logger.info(
			`[PRODUCT-INQUIRY] Received inquiry for product ${product.id} from ${customer.email}`,
		);

		// Get notification service
		const notificationModuleService = req.scope.resolve(Modules.NOTIFICATION);

		// Prepare notification data
		const notificationData = {
			to: 'info@basiscampberlin.de',
			channel: 'email',
			template: 'product-inquiry',
			data: {
				product_title: product.title,
				product_id: product.id,
				product_handle: product.handle || '',
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
			`[PRODUCT-INQUIRY] Successfully sent inquiry email for product ${product.id}`,
		);

		res.json({
			success: true,
			message: 'Product inquiry sent successfully',
		});
	} catch (error) {
		logger.error(`[PRODUCT-INQUIRY] Error processing inquiry:`, error);

		res.status(500).json({
			success: false,
			error: error.message || 'Failed to process product inquiry',
			details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
		});
	}
}

