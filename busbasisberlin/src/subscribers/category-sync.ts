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

		// Sync all products that might be affected by this category change
		// This includes products directly in this category AND products in child categories
		// because category hierarchy changes affect the category_paths of all descendants
		const query = container.resolve('query');

		// First, get all child categories recursively
		const getAllChildCategories = async (
			categoryId: string,
		): Promise<string[]> => {
			const { data: children } = await query.graph({
				entity: 'product_category',
				fields: ['id'],
				filters: {
					parent_category_id: categoryId,
				} as any,
			});

			let allChildren = [categoryId];
			for (const child of children || []) {
				const grandChildren = await getAllChildCategories(child.id);
				allChildren = allChildren.concat(grandChildren);
			}
			return allChildren;
		};

		const allAffectedCategoryIds = await getAllChildCategories(data.id);
		logger.info(
			`🔍 Category change affects ${allAffectedCategoryIds.length} categories (including children)`,
		);

		// Get all products in this category and all its children
		const { data: products } = await query.graph({
			entity: 'product',
			fields: ['id'],
			filters: {
				categories: {
					id: allAffectedCategoryIds,
				},
			} as any,
		});

		if (products && products.length > 0) {
			logger.info(
				`🔄 Syncing ${products.length} products affected by category hierarchy change`,
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
