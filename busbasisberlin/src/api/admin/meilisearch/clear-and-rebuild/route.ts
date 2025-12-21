// src/api/admin/meilisearch/clear-and-rebuild/route.ts
// Clear all documents from Meilisearch indexes and rebuild from scratch

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { syncProductsWorkflow } from '../../../../workflows/sync-products';
import { syncCategoriesWorkflow } from '../../../../workflows/sync-categories';
import { MEILISEARCH_MODULE } from '../../../../modules/meilisearch';
import MeilisearchModuleService from '../../../../modules/meilisearch/service';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
	const logger = req.scope.resolve('logger');

	res.json({
		message: 'Clear and rebuild started in background. Check logs for progress.',
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

		logger.info('🧹 [CLEAR-REBUILD] Starting complete Meilisearch clear and rebuild...');
		logger.info('🧹 [CLEAR-REBUILD] Step 1: Clearing all existing documents...');

		try {
			// Step 1: Clear all documents from both indexes
			logger.info('🗑️ [CLEAR-REBUILD] Clearing all documents from category index...');
			await meilisearchService.clearAllDocuments('category');
			logger.info('✅ [CLEAR-REBUILD] Category index cleared');

			logger.info('🗑️ [CLEAR-REBUILD] Clearing all documents from product index...');
			await meilisearchService.clearAllDocuments('product');
			logger.info('✅ [CLEAR-REBUILD] Product index cleared');

			// Step 2: Ensure indexes are properly configured
			logger.info('⚙️ [CLEAR-REBUILD] Step 2: Configuring Meilisearch index settings...');
			await meilisearchService.ensureIndexConfiguration('product');
			await meilisearchService.ensureIndexConfiguration('category');
			logger.info('✅ [CLEAR-REBUILD] Index configuration completed');

			// Step 3: Rebuild categories
			logger.info('📂 [CLEAR-REBUILD] Step 3: Rebuilding categories...');
			let categoryOffset = 0;
			let categoryHasMore = true;
			let totalCategoriesIndexed = 0;

			try {
				while (categoryHasMore) {
					logger.info(
						`📂 [CLEAR-REBUILD] Fetching categories batch: offset=${categoryOffset}, limit=${limit}`,
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
						`✓ [CLEAR-REBUILD] Indexed ${categories.length} categories (Total: ${categoryMetadata?.count ?? 0})`,
					);

					categoryHasMore =
						categoryOffset + limit < (categoryMetadata?.count ?? 0);
					categoryOffset += limit;
					totalCategoriesIndexed += categories.length;
				}

				logger.info(
					`✅ [CLEAR-REBUILD] Successfully rebuilt ${totalCategoriesIndexed} categories in Meilisearch`,
				);
			} catch (error) {
				logger.error('❌ [CLEAR-REBUILD] Failed to rebuild categories:', error);
				// Continue with product sync even if category sync fails
			}

			// Step 4: Rebuild products
			logger.info('📦 [CLEAR-REBUILD] Step 4: Rebuilding products...');

			while (hasMore) {
				logger.info(
					`📦 [CLEAR-REBUILD] Fetching products batch: offset=${offset}, limit=${limit}`,
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
					`✓ [CLEAR-REBUILD] Indexed ${products.length} products (Total: ${metadata?.count ?? 0})`,
				);

				hasMore = offset + limit < (metadata?.count ?? 0);
				offset += limit;
				totalIndexed += products.length;
			}

			logger.info(
				`✅ [CLEAR-REBUILD] Successfully rebuilt ${totalIndexed} products in Meilisearch`,
			);
			logger.info(
				`🎉 [CLEAR-REBUILD] Complete! All indexes have been cleared and rebuilt from scratch`,
			);
			logger.info(
				`📊 [CLEAR-REBUILD] Summary: ${totalCategoriesIndexed} categories, ${totalIndexed} products`,
			);
		} catch (error) {
			logger.error('❌ [CLEAR-REBUILD] Failed to clear and rebuild:', error);
			throw error;
		}
	})().catch(error => {
		logger.error('❌ [CLEAR-REBUILD] Background clear and rebuild failed:', error);
	});
}

