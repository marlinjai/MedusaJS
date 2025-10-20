// src/subscribers/product-sync.ts
import { SubscriberArgs, type SubscriberConfig } from '@medusajs/framework';
import { syncProductsWorkflow } from '../workflows/sync-products';

/**
 * Syncs products to Meilisearch when they are created or updated
 */
export default async function handleProductEvents({
	event,
	container,
}: SubscriberArgs<{ id: string }>) {
	const logger = container.resolve('logger');

	try {
		logger.info(
			`🔄 [PRODUCT-SYNC] Event ${event.name}: Syncing product ${event.data.id}`,
		);

		await syncProductsWorkflow(container).run({
			input: {
				filters: {
					id: event.data.id,
				},
			},
		});

		logger.info(
			`✅ [PRODUCT-SYNC] Product ${event.data.id} synced to Meilisearch`,
		);
	} catch (error) {
		logger.error(
			`❌ [PRODUCT-SYNC] Failed to sync product ${event.data.id}:`,
			error,
		);
	}
}

export const config: SubscriberConfig = {
	event: ['product.created', 'product.updated'],
};
