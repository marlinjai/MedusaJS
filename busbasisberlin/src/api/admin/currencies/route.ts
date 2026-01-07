// busbasisberlin/src/api/admin/currencies/route.ts
// Admin API route to list store-supported currencies

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { getStoreSupportedCurrencies } from '../../../utils/currency-helper';

export const GET = async (
	req: MedusaRequest,
	res: MedusaResponse,
): Promise<void> => {
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	try {
		// Use shared service to get store-supported currencies
		const currencies = await getStoreSupportedCurrencies(req.scope, logger);

		// Cache for 1 hour since store currencies don't change frequently
		res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');

		res.json({
			currencies,
			count: currencies.length,
		});
	} catch (error) {
		logger.error('[ADMIN-CURRENCIES] Error fetching currencies:', error);
		res.status(500).json({
			error: 'Failed to fetch currencies',
			message: error instanceof Error ? error.message : 'Unknown error',
		});
	}
};
