// src/subscribers/product-delete.ts
import { SubscriberArgs, type SubscriberConfig } from '@medusajs/framework';
import { deleteProductsFromMeilisearchWorkflow } from '../workflows/delete-products-from-meilisearch';

/**
 * Removes products from Meilisearch when they are deleted
 */
export default async function productDeleteHandler({
	event: { data },
	container,
}: SubscriberArgs<{ id: string }>) {
	const logger = container.resolve('logger');

	try {
		logger.info(
			`🗑️ [PRODUCT-DELETE] Deleting product ${data.id} from Meilisearch`,
		);

		await deleteProductsFromMeilisearchWorkflow(container).run({
			input: {
				ids: [data.id],
			},
		});

		logger.info(
			`✅ [PRODUCT-DELETE] Product ${data.id} removed from Meilisearch`,
		);
	} catch (error) {
		logger.error(
			`❌ [PRODUCT-DELETE] Failed to delete product ${data.id}:`,
			error,
		);
	}
}

export const config: SubscriberConfig = {
	event: 'product.deleted',
};
