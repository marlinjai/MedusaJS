/**
 * search/customers/route.ts
 * API endpoint for searching customers for offer creation
 * Searches BOTH manual customers AND core customers (online shop)
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
		const query = req.scope.resolve('query');

		// Search manual customers using the searchCustomers method
		const manualCustomers = await manualCustomerService.searchCustomers(
			q as string,
		);

		// Also search core customers (from online shop)
		let coreCustomers: any[] = [];
		if (q && q.trim()) {
			const { data } = await query.graph({
				entity: 'customer',
				fields: ['id', 'email', 'first_name', 'last_name', 'phone', 'has_account'],
				filters: {
					$or: [
						{ email: { $ilike: `%${q}%` } },
						{ first_name: { $ilike: `%${q}%` } },
						{ last_name: { $ilike: `%${q}%` } },
					],
				},
				pagination: {
					take: limitNum,
					skip: 0,
				},
			});
			coreCustomers = data || [];
		}

		// Format manual customers
		const formattedManualCustomers = manualCustomers.map(customer => ({
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
			customer_source: customer.is_linked ? 'linked' : 'manual',
			manual_customer_id: customer.id,
			core_customer_id: customer.core_customer_id,
				address:
					`${customer.street} ${customer.street_number}, ${customer.postal_code} ${customer.city}`.trim(),
				// Additional fields for better display
				company: customer.company,
			company_name: customer.company,
			first_name: customer.first_name,
			last_name: customer.last_name,
			customer_type: customer.customer_type,
			status: customer.status,
			is_linked: customer.is_linked,
		}));

		// Format core customers (filter out those already linked)
		const linkedCoreIds = new Set(
			manualCustomers
				.filter(mc => mc.core_customer_id)
				.map(mc => mc.core_customer_id),
		);

		const formattedCoreCustomers = coreCustomers
			.filter(cc => !linkedCoreIds.has(cc.id))
			.map(customer => ({
				id: customer.id,
				title: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email,
				display_name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email,
				name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email,
				email: customer.email,
				phone: customer.phone,
				customer_source: 'core',
				manual_customer_id: null,
				core_customer_id: customer.id,
				first_name: customer.first_name,
				last_name: customer.last_name,
				has_account: customer.has_account,
			}));

		// Merge results: manual customers first, then core customers
		const allCustomers = [
			...formattedManualCustomers,
			...formattedCoreCustomers,
		].slice(0, limitNum);

		logger.info(
			`Customer search completed: ${formattedManualCustomers.length} manual, ${formattedCoreCustomers.length} core, ${allCustomers.length} total for query "${q}"`,
		);

		res.json({
			customers: allCustomers,
			count: allCustomers.length,
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
