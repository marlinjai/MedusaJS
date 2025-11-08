/**
 * /store/contact/route.ts
 * API route for contact form submissions
 *
 * This route receives contact form submissions from the frontend
 * and sends an email notification to info@basiscampberlin.de using
 * Medusa's Notification Module with Resend.
 */

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';

interface ContactFormRequest {
	customer: {
		name: string;
		email: string;
		phone?: string;
		message: string;
	};
}

export async function POST(
	req: MedusaRequest<ContactFormRequest>,
	res: MedusaResponse,
): Promise<void> {
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	try {
		const { customer } = req.body;

		// Validate required fields
		if (!customer || !customer.name || !customer.email || !customer.message) {
			res.status(400).json({
				success: false,
				error: 'Name, email, and message are required',
			});
			return;
		}

		logger.info(
			`[CONTACT-FORM] Received contact form submission from ${customer.email}`,
		);

		// Get notification service
		const notificationModuleService = req.scope.resolve(Modules.NOTIFICATION);

		// Prepare notification data
		const notificationData = {
			to: 'info@basiscampberlin.de',
			channel: 'email',
			template: 'contact-form',
			data: {
				customer_name: customer.name,
				customer_email: customer.email,
				customer_phone: customer.phone || '',
				customer_message: customer.message,
			},
		};

		// Send notification using Medusa's Notification Module
		await notificationModuleService.createNotifications([notificationData]);

		logger.info(
			`[CONTACT-FORM] Successfully sent contact form email from ${customer.email}`,
		);

		res.json({
			success: true,
			message: 'Contact form submitted successfully',
		});
	} catch (error) {
		logger.error(`[CONTACT-FORM] Error processing contact form:`, error);

		res.status(500).json({
			success: false,
			error: error.message || 'Failed to process contact form',
			details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
		});
	}
}

