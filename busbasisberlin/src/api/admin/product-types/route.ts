// busbasisberlin/src/api/admin/product-types/route.ts
// Admin API route to list all product types

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

		// Query all product types using query.graph
		const result = await query.graph({
			entity: 'product_type',
			fields: ['id', 'value', 'created_at', 'updated_at'],
			filters: {},
		});

		const productTypes = Array.isArray(result?.data) ? result.data : [];

		res.json({
			product_types: productTypes || [],
			count: productTypes?.length || 0,
			limit,
			offset,
		});
	} catch (error) {
		logger.error('[PRODUCT-TYPES] Error fetching product types:', error);
		res.status(500).json({
			error: 'Failed to fetch product types',
			message: error instanceof Error ? error.message : 'Unknown error',
		});
	}
};

