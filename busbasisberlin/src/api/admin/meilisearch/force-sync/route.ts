// src/api/admin/meilisearch/force-sync/route.ts
// Force complete product and category sync to rebuild hierarchical categories

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { syncProductsWorkflow } from '../../../../workflows/sync-products';
import { syncCategoriesWorkflow } from '../../../../workflows/sync-categories';
import { MEILISEARCH_MODULE } from '../../../../modules/meilisearch';
import MeilisearchModuleService from '../../../../modules/meilisearch/service';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
	const logger = req.scope.resolve('logger');

	res.json({
		message: 'Force sync started in background. Check logs for progress.',
		timestamp: new Date().toISOString(),
	});

	// Run sync in background
	(async () => {
		const meilisearchService = req.scope.resolve(
			MEILISEARCH_MODULE,
		) as MeilisearchModuleService;

		const limit = 50;
		let offset = 0;
		let hasMore = true;
		let totalIndexed = 0;

		logger.info('🔄 [FORCE-SYNC] Starting complete Meilisearch force sync...');
		logger.info('🔄 [FORCE-SYNC] This will rebuild ALL hierarchical categories from current data');

		try {
			// Ensure indexes are properly configured before syncing
			logger.info('⚙️ [FORCE-SYNC] Configuring Meilisearch index settings...');
			await meilisearchService.ensureIndexConfiguration('product');
			await meilisearchService.ensureIndexConfiguration('category');
			logger.info('✅ [FORCE-SYNC] Index configuration completed');

			// Sync categories first to ensure they have correct has_public_products flags
			logger.info('📂 [FORCE-SYNC] Starting category sync...');
			let categoryOffset = 0;
			let categoryHasMore = true;
			let totalCategoriesIndexed = 0;

			try {
				while (categoryHasMore) {
					logger.info(
						`📂 [FORCE-SYNC] Fetching categories batch: offset=${categoryOffset}, limit=${limit}`,
					);

					const {
						result: { categories, metadata: categoryMetadata },
					} = await syncCategoriesWorkflow(req.scope).run({
						input: {
							limit,
							offset: categoryOffset,
						},
					});

					logger.info(
						`✓ [FORCE-SYNC] Indexed ${categories.length} categories (Total: ${categoryMetadata?.count ?? 0})`,
					);

					categoryHasMore =
						categoryOffset + limit < (categoryMetadata?.count ?? 0);
					categoryOffset += limit;
					totalCategoriesIndexed += categories.length;
				}

				logger.info(
					`✅ [FORCE-SYNC] Successfully indexed ${totalCategoriesIndexed} categories to Meilisearch`,
				);
			} catch (error) {
				logger.error('❌ [FORCE-SYNC] Failed to sync categories to Meilisearch:', error);
				// Continue with product sync even if category sync fails
			}

			// Now sync ALL products to rebuild hierarchical categories
			logger.info('📦 [FORCE-SYNC] Starting complete product sync...');
			logger.info('📦 [FORCE-SYNC] This will rebuild hierarchical categories for ALL products');

			while (hasMore) {
				logger.info(
					`📦 [FORCE-SYNC] Fetching products batch: offset=${offset}, limit=${limit}`,
				);

				const {
					result: { products, metadata },
				} = await syncProductsWorkflow(req.scope).run({
					input: {
						limit,
						offset,
					},
				});

				logger.info(
					`✓ [FORCE-SYNC] Indexed ${products.length} products (Total: ${metadata?.count ?? 0})`,
				);

				hasMore = offset + limit < (metadata?.count ?? 0);
				offset += limit;
				totalIndexed += products.length;
			}

			logger.info(
				`✅ [FORCE-SYNC] Successfully force-synced ${totalIndexed} products to Meilisearch`,
			);
			logger.info(
				`🎉 [FORCE-SYNC] Complete! All hierarchical categories have been rebuilt from current data`,
			);
		} catch (error) {
			logger.error('❌ [FORCE-SYNC] Failed to force sync to Meilisearch:', error);
			throw error;
		}
	})().catch(error => {
		logger.error('❌ [FORCE-SYNC] Background sync failed:', error);
	});
}
