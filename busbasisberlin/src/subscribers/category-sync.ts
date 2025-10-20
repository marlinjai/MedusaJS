// src/subscribers/category-sync.ts
import { SubscriberArgs, type SubscriberConfig } from '@medusajs/framework';
import { syncCategoriesWorkflow } from '../workflows/sync-categories';
import { syncProductsWorkflow } from '../workflows/sync-products';

/**
 * Syncs categories and related products when categories change
 * This ensures category hierarchy and product categorization is accurate
 */
export default async function handleCategoryEvents({
	event: { data },
	container,
}: SubscriberArgs<{ id: string }>) {
	const logger = container.resolve('logger');

	try {
		logger.info(`🔄 Syncing category ${data.id} to Meilisearch`);

		// Sync the category itself
		// @ts-ignore - Workflow input type inference issue
		await syncCategoriesWorkflow(container).run({
			input: {
				filters: {
					id: data.id,
				},
				limit: 1,
				offset: 0,
			},
		});

		logger.info(`✅ Category ${data.id} synced to Meilisearch`);

		// Also sync all products in this category
		const query = container.resolve('query');

		const { data: products } = await query.graph({
			entity: 'product',
			fields: ['id'],
			filters: {
				categories: {
					id: [data.id],
				},
			} as any,
		});

		if (products && products.length > 0) {
			logger.info(
				`🔄 Syncing ${products.length} products affected by category change`,
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

			logger.info(`✅ Synced ${products.length} products to Meilisearch`);
		}
	} catch (error) {
		logger.error('❌ Failed to sync category:', error);
	}
}

export const config: SubscriberConfig = {
	event: [
		'product_category.created',
		'product_category.updated',
		'product_category.deleted',
	],
};
