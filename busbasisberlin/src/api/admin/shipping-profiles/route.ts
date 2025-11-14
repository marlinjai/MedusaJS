// busbasisberlin/src/api/admin/shipping-profiles/route.ts
// Admin API route to list all shipping profiles

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';

export const GET = async (
	req: MedusaRequest,
	res: MedusaResponse,
): Promise<void> => {
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	try {
		const fulfillmentModuleService = req.scope.resolve(Modules.FULFILLMENT);

		const limit = req.query.limit ? parseInt(req.query.limit as string) : 1000;
		const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

		// List all shipping profiles using the module service
		const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({});

		res.json({
			shipping_profiles: shippingProfiles || [],
			count: shippingProfiles?.length || 0,
			limit,
			offset,
		});
	} catch (error) {
		logger.error('[SHIPPING-PROFILES] Error fetching shipping profiles:', error);
		res.status(500).json({
			error: 'Failed to fetch shipping profiles',
			message: error instanceof Error ? error.message : 'Unknown error',
		});
	}
};

