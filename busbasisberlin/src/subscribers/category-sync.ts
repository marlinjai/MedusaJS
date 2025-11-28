// src/subscribers/category-sync.ts
import { SubscriberArgs, type SubscriberConfig } from '@medusajs/framework';
import { MEILISEARCH_MODULE } from '../modules/meilisearch';
import MeilisearchModuleService from '../modules/meilisearch/service';
import { syncCategoriesWorkflow } from '../workflows/sync-categories';
import { syncProductsWorkflow } from '../workflows/sync-products';

/**
 * Syncs categories and related products when categories change
 * This ensures category hierarchy and product categorization is accurate
 */
export default async function handleCategoryEvents({
	event: { data, name },
	container,
}: SubscriberArgs<{ id: string }>) {
	const logger = container.resolve('logger');
	const meilisearchService = container.resolve(
		MEILISEARCH_MODULE,
	) as MeilisearchModuleService;

	try {
		logger.info(
			`🔄 [CATEGORY-SYNC] Event: ${name} | Category ID: ${data.id}`,
		);

		// Handle deletion separately - remove from Meilisearch directly
		if (name === 'product_category.deleted') {
			logger.info(
				`🗑️ [CATEGORY-SYNC] Deleting category ${data.id} from Meilisearch`,
			);

			try {
				await meilisearchService.deleteFromIndex([data.id], 'category');
				logger.info(
					`✅ [CATEGORY-SYNC] Category ${data.id} deleted from Meilisearch`,
				);
			} catch (deleteError: any) {
				// If category doesn't exist in index, that's fine
				if (deleteError?.code === 'document_not_found') {
					logger.info(
						`ℹ️ [CATEGORY-SYNC] Category ${data.id} not found in index (already deleted)`,
					);
				} else {
					throw deleteError;
				}
			}

			// Sync all products that were in this category (they still exist, just need category removed)
			const query = container.resolve('query');

			try {
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
						`🔄 [CATEGORY-SYNC] Syncing ${products.length} products that were in deleted category`,
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
						`✅ [CATEGORY-SYNC] Updated ${products.length} products after category deletion`,
					);
				}
			} catch (productError) {
				logger.warn(
					`⚠️ [CATEGORY-SYNC] Could not find products for deleted category ${data.id}:`,
					productError,
				);
			}

			return;
		}

		// For create/update events, sync the category
		logger.info(
			`📝 [CATEGORY-SYNC] Syncing category ${data.id} (${name})`,
		);

		// Verify category exists before syncing
		const query = container.resolve('query');
		const { data: categoryData } = await query.graph({
			entity: 'product_category',
			fields: ['id', 'name', 'is_active'],
			filters: {
				id: data.id,
			} as any,
		});

		if (!categoryData || categoryData.length === 0) {
			logger.warn(
				`⚠️ [CATEGORY-SYNC] Category ${data.id} not found in database, removing from Meilisearch`,
			);
			await meilisearchService.deleteFromIndex([data.id], 'category');
			return;
		}

		logger.info(
			`🔍 [CATEGORY-SYNC] Found category: ${categoryData[0].name} (active: ${categoryData[0].is_active})`,
		);

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

		logger.info(`✅ [CATEGORY-SYNC] Category ${data.id} synced to Meilisearch`);

		// Also sync all products in this category
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
				`🔄 [CATEGORY-SYNC] Syncing ${products.length} products in category ${categoryData[0].name}`,
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
				`✅ [CATEGORY-SYNC] Synced ${products.length} products to Meilisearch`,
			);
		} else {
			logger.info(
				`ℹ️ [CATEGORY-SYNC] No products found in category ${categoryData[0].name}`,
			);
		}
	} catch (error) {
		logger.error(
			`❌ [CATEGORY-SYNC] Failed to sync category ${data.id}:`,
			error,
		);
	}
}

export const config: SubscriberConfig = {
	event: [
		'product_category.created',
		'product_category.updated',
		'product_category.deleted',
	],
};
