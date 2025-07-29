/**
 * search/customers/route.ts
 * API endpoint for searching customers for offer creation
 * Uses only manual customers (custom customer model)
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

import { MANUAL_CUSTOMER_MODULE } from '../../../../../modules/manual-customer';
import ManualCustomerService from '../../../../../modules/manual-customer/service';

interface SearchCustomersQuery {
	q?: string;
	limit?: string;
}

export async function GET(
	req: MedusaRequest<SearchCustomersQuery>,
	res: MedusaResponse,
) {
	const manualCustomerService: ManualCustomerService = req.scope.resolve(
		MANUAL_CUSTOMER_MODULE,
	);
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	try {
		const { q = '', limit = '10' } = req.query;
		const limitNum = parseInt(limit as string);

		// Search manual customers using the searchCustomers method
		const manualCustomers = await manualCustomerService.searchCustomers(
			q as string,
		);

		// Format results for the frontend
		const formattedCustomers = manualCustomers
			.slice(0, limitNum)
			.map(customer => ({
				id: customer.id,
				title:
					customer.company ||
					`${customer.first_name} ${customer.last_name}`.trim(),
				display_name:
					customer.company ||
					`${customer.first_name} ${customer.last_name}`.trim(),
				name:
					customer.company ||
					`${customer.first_name} ${customer.last_name}`.trim(),
				email: customer.email,
				phone: customer.phone,
				mobile: customer.mobile,
				customer_number: customer.customer_number,
				type: 'manual',
				address:
					`${customer.street} ${customer.street_number}, ${customer.postal_code} ${customer.city}`.trim(),
				// Additional fields for better display
				company: customer.company,
				first_name: customer.first_name,
				last_name: customer.last_name,
				customer_type: customer.customer_type,
				status: customer.status,
			}));

		logger.info(
			`Customer search completed: ${formattedCustomers.length} results for query "${q}"`,
		);

		res.json({
			customers: formattedCustomers,
			count: formattedCustomers.length,
			query: q,
		});
	} catch (error) {
		logger.error('Customer search error:', error);
		res.status(500).json({
			error: 'Failed to search customers',
			message: error.message,
		});
	}
}
