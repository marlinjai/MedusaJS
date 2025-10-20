import { SubscriberArgs, type SubscriberConfig } from '@medusajs/framework';
import { MEILISEARCH_MODULE } from '../modules/meilisearch';
import MeilisearchModuleService from '../modules/meilisearch/service';
import { syncCategoriesWorkflow } from '../workflows/sync-categories';
import { syncProductsWorkflow } from '../workflows/sync-products';

export default async function meilisearchSyncHandler({
	container,
}: SubscriberArgs) {
	const logger = container.resolve('logger');
	const meilisearchService = container.resolve(
		MEILISEARCH_MODULE,
	) as MeilisearchModuleService;

	let hasMore = true;
	let offset = 0;
	const limit = 50;
	let totalIndexed = 0;

	logger.info('🔄 Starting Meilisearch product indexing...');

	try {
		// Ensure indexes are properly configured before syncing
		logger.info('⚙️ Configuring Meilisearch index settings...');
		await meilisearchService.ensureIndexConfiguration('product');
		await meilisearchService.ensureIndexConfiguration('category');
		logger.info('✅ Index configuration completed');

		// Sync categories first
		logger.info('📂 Starting category sync...');
		let categoryOffset = 0;
		let categoryHasMore = true;
		let totalCategoriesIndexed = 0;

		try {
			while (categoryHasMore) {
				logger.info(
					`📂 Fetching categories batch: offset=${categoryOffset}, limit=${limit}`,
				);

				const {
					result: { categories, metadata: categoryMetadata },
				} = await syncCategoriesWorkflow(container).run({
					input: {
						limit,
						offset: categoryOffset,
					},
				});

				logger.info(
					`✓ Indexed ${categories.length} categories (Total: ${categoryMetadata?.count ?? 0})`,
				);

				categoryHasMore =
					categoryOffset + limit < (categoryMetadata?.count ?? 0);
				categoryOffset += limit;
				totalCategoriesIndexed += categories.length;
			}

			logger.info(
				`✅ Successfully indexed ${totalCategoriesIndexed} categories to Meilisearch`,
			);
		} catch (error) {
			logger.error('❌ Failed to sync categories to Meilisearch:', error);
			// Continue with product sync even if category sync fails
		}

		// Now sync products
		logger.info('📦 Starting product sync...');
		while (hasMore) {
			logger.info(
				`📦 Fetching products batch: offset=${offset}, limit=${limit}`,
			);

			const {
				result: { products, metadata },
			} = await syncProductsWorkflow(container).run({
				input: {
					limit,
					offset,
				},
			});

			logger.info(
				`✓ Indexed ${products.length} products (Total: ${metadata?.count ?? 0})`,
			);

			hasMore = offset + limit < (metadata?.count ?? 0);
			offset += limit;
			totalIndexed += products.length;
		}

		logger.info(
			`✅ Successfully indexed ${totalIndexed} products to Meilisearch`,
		);
	} catch (error) {
		logger.error('❌ Failed to sync products to Meilisearch:', error);
		throw error;
	}
}

export const config: SubscriberConfig = {
	event: 'meilisearch.sync',
};
