// src/subscribers/collection-sync.ts
import { SubscriberArgs, type SubscriberConfig } from '@medusajs/framework';
import { syncProductsWorkflow } from '../workflows/sync-products';

/**
 * Syncs products when their collection is updated
 * This ensures collection information is accurate in Meilisearch
 */
export default async function handleCollectionEvents({
	event: { data },
	container,
}: SubscriberArgs<{ id: string }>) {
	const logger = container.resolve('logger');

	try {
		logger.info(`🔄 Syncing products in collection ${data.id}`);

		// Get query service to find products in this collection
		const query = container.resolve('query');

		const { data: products } = await query.graph({
			entity: 'product',
			fields: ['id'],
			filters: {
				collection_id: [data.id] as any,
			},
		});

		if (products && products.length > 0) {
			logger.info(
				`🔄 Syncing ${products.length} products affected by collection change`,
			);

			// Sync products in batches
			const batchSize = 10;
			for (let i = 0; i < products.length; i += batchSize) {
				const batch = products.slice(i, i + batchSize);
				const productIds = batch.map((p: any) => p.id);

				await syncProductsWorkflow(container).run({
					input: {
						filters: {
							id: productIds,
						},
					},
				});
			}

			logger.info(
				`✅ Synced ${products.length} products to Meilisearch after collection update`,
			);
		} else {
			logger.info(`ℹ️ No products found in collection ${data.id}`);
		}
	} catch (error) {
		logger.error('❌ Failed to sync products after collection change:', error);
	}
}

export const config: SubscriberConfig = {
	event: [
		'product_collection.created',
		'product_collection.updated',
		'product_collection.deleted',
	],
};
