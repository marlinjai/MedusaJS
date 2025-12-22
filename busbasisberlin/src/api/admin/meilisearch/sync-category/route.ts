// busbasisberlin/src/api/admin/meilisearch/sync-category/route.ts
// Admin API route to sync a specific category to Meilisearch
// This is especially useful for updating the has_public_products flag after products are assigned

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

type SyncCategoryBody = {
	categoryId: string;
};

export const POST = async (
	req: MedusaRequest<SyncCategoryBody>,
	res: MedusaResponse,
): Promise<void> => {
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	try {
		const { categoryId } = req.body || {};

		if (!categoryId) {
			res.status(400).json({
				error: 'categoryId is required',
			});
			return;
		}

		logger.info(`[SYNC-CATEGORY-API] Syncing category ${categoryId} to Meilisearch...`);

		// Send immediate response
		res.status(202).json({
			message: 'Category sync started',
			categoryId,
		});

		// Run sync in background
		(async () => {
			try {
				const { syncCategoriesWorkflow } = await import('../../../../workflows/sync-categories');
				
				await syncCategoriesWorkflow(req.scope).run({
					input: {
						filters: {
							id: categoryId,
						},
						limit: 1,
					},
				});

				logger.info(`[SYNC-CATEGORY-API] ✅ Category ${categoryId} synced successfully`);
			} catch (error: any) {
				logger.error(`[SYNC-CATEGORY-API] ❌ Error syncing category ${categoryId}: ${error.message}`);
				if (error.stack) {
					logger.error(`[SYNC-CATEGORY-API] Stack trace: ${error.stack}`);
				}
			}
		})();
	} catch (error: any) {
		logger.error('[SYNC-CATEGORY-API] Error starting category sync:', error);
		res.status(500).json({
			error: 'Failed to start category sync',
			message: error.message,
		});
	}
};

