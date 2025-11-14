// busbasisberlin/src/api/admin/sales-channels/route.ts
// Admin API route to list all sales channels

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';

export const GET = async (
	req: MedusaRequest,
	res: MedusaResponse,
): Promise<void> => {
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	try {
		const salesChannelModuleService = req.scope.resolve(Modules.SALES_CHANNEL);

		const salesChannels = await salesChannelModuleService.listSalesChannels();

		res.json({
			sales_channels: salesChannels || [],
			count: salesChannels?.length || 0,
		});
	} catch (error) {
		logger.error('[SALES-CHANNELS] Error fetching sales channels:', error);
		res.status(500).json({
			error: 'Failed to fetch sales channels',
			message: error instanceof Error ? error.message : 'Unknown error',
		});
	}
};






