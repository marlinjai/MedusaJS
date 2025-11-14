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
		const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

		const limit = req.query.limit ? parseInt(req.query.limit as string) : 1000;
		const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

		// Try using query.graph first (more reliable)
		let shippingProfiles: any[] = [];
		try {
			const result = await query.graph({
				entity: 'shipping_profile',
				fields: ['id', 'name', 'type', 'created_at', 'updated_at'],
				filters: {},
			});
			shippingProfiles = Array.isArray(result?.data) ? result.data : [];
			logger.info(
				`[SHIPPING-PROFILES] Found ${shippingProfiles.length} profiles via query.graph`,
			);
		} catch (graphError) {
			logger.warn(
				`[SHIPPING-PROFILES] query.graph failed, trying module service: ${graphError instanceof Error ? graphError.message : String(graphError)}`,
			);
			// Fallback to module service
			try {
				const profiles = await fulfillmentModuleService.listShippingProfiles();
				shippingProfiles = Array.isArray(profiles) ? profiles : [];
				logger.info(
					`[SHIPPING-PROFILES] Found ${shippingProfiles.length} profiles via module service`,
				);
			} catch (moduleError) {
				logger.error(
					`[SHIPPING-PROFILES] Module service also failed: ${moduleError instanceof Error ? moduleError.message : String(moduleError)}`,
				);
				shippingProfiles = [];
			}
		}

		logger.info(
			`[SHIPPING-PROFILES] Returning ${shippingProfiles.length} shipping profiles`,
		);

		res.json({
			shipping_profiles: shippingProfiles || [],
			count: shippingProfiles?.length || 0,
			limit,
			offset,
		});
	} catch (error) {
		logger.error(
			'[SHIPPING-PROFILES] Error fetching shipping profiles:',
			error,
		);
		res.status(500).json({
			error: 'Failed to fetch shipping profiles',
			message: error instanceof Error ? error.message : 'Unknown error',
		});
	}
};
