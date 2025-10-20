// src/subscribers/variant-sync.ts
import { SubscriberArgs, type SubscriberConfig } from '@medusajs/framework';
import { syncProductsWorkflow } from '../workflows/sync-products';

/**
 * Syncs products when variants are created, updated, or deleted
 * This ensures inventory and pricing changes are reflected in Meilisearch
 */
export default async function handleVariantEvents({
	event: { data },
	container,
}: SubscriberArgs<{ id: string; product_id: string }>) {
	const logger = container.resolve('logger');

	try {
		// Get the product ID from the variant data
		const productId = data.product_id;

		if (!productId) {
			logger.warn('⚠️ Variant event missing product_id, skipping sync');
			return;
		}

		logger.info(
			`🔄 Syncing product ${productId} due to variant ${data.id} change`,
		);

		await syncProductsWorkflow(container).run({
			input: {
				filters: {
					id: productId,
				},
			},
		});

		logger.info(`✅ Product ${productId} synced to Meilisearch`);
	} catch (error) {
		logger.error('❌ Failed to sync product after variant change:', error);
	}
}

export const config: SubscriberConfig = {
	event: [
		'product_variant.created',
		'product_variant.updated',
		'product_variant.deleted',
	],
};
