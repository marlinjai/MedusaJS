// busbasisberlin/src/api/admin/collections/route.ts
// Admin API route to list all product collections

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

export const GET = async (
	req: MedusaRequest,
	res: MedusaResponse,
): Promise<void> => {
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	try {
		const query = req.scope.resolve('query');

		const limit = req.query.limit ? parseInt(req.query.limit as string) : 1000;
		const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

		// Query all collections using query.graph
		const result = await query.graph({
			entity: 'product_collection',
			fields: ['id', 'title', 'handle', 'created_at', 'updated_at'],
			filters: {},
		});

		const collections = Array.isArray(result?.data) ? result.data : [];

		res.json({
			collections: collections || [],
			count: collections?.length || 0,
			limit,
			offset,
		});
	} catch (error) {
		logger.error('[COLLECTIONS] Error fetching collections:', error);
		res.status(500).json({
			error: 'Failed to fetch collections',
			message: error instanceof Error ? error.message : 'Unknown error',
		});
	}
};

