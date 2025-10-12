/**
 * cache-invalidation.ts
 * Subscriber for cache invalidation events
 * Handles frontend cache clearing when products, categories, or other data changes
 */
import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

/**
 * Invalidate frontend cache when products are updated
 * This ensures the storefront shows updated product information immediately
 */
export async function handleProductUpdated({
	event: { data },
	container,
}: SubscriberArgs<{ id: string }>) {
	const logger = container.resolve('logger');

	try {
		logger.info(`[CACHE-INVALIDATION] Product updated: ${data.id}`);

		// Call frontend cache invalidation endpoint
		await invalidateFrontendCache(['products', 'categories'], data.id);

		logger.info(
			`[CACHE-INVALIDATION] Frontend cache invalidated for product: ${data.id}`,
		);
	} catch (error) {
		logger.error(
			`[CACHE-INVALIDATION] Failed to invalidate cache for product ${data.id}:`,
			error,
		);
	}
}

/**
 * Invalidate frontend cache when products are created
 */
export async function handleProductCreated({
	event: { data },
	container,
}: SubscriberArgs<{ id: string }>) {
	const logger = container.resolve('logger');

	try {
		logger.info(`[CACHE-INVALIDATION] Product created: ${data.id}`);

		// Call frontend cache invalidation endpoint
		await invalidateFrontendCache(['products', 'categories'], data.id);

		logger.info(
			`[CACHE-INVALIDATION] Frontend cache invalidated for new product: ${data.id}`,
		);
	} catch (error) {
		logger.error(
			`[CACHE-INVALIDATION] Failed to invalidate cache for new product ${data.id}:`,
			error,
		);
	}
}

/**
 * Invalidate frontend cache when products are deleted
 */
export async function handleProductDeleted({
	event: { data },
	container,
}: SubscriberArgs<{ id: string }>) {
	const logger = container.resolve('logger');

	try {
		logger.info(`[CACHE-INVALIDATION] Product deleted: ${data.id}`);

		// Call frontend cache invalidation endpoint
		await invalidateFrontendCache(['products', 'categories'], data.id);

		logger.info(
			`[CACHE-INVALIDATION] Frontend cache invalidated for deleted product: ${data.id}`,
		);
	} catch (error) {
		logger.error(
			`[CACHE-INVALIDATION] Failed to invalidate cache for deleted product ${data.id}:`,
			error,
		);
	}
}

/**
 * Invalidate frontend cache when categories are updated
 */
export async function handleCategoryUpdated({
	event: { data },
	container,
}: SubscriberArgs<{ id: string }>) {
	const logger = container.resolve('logger');

	try {
		logger.info(`[CACHE-INVALIDATION] Category updated: ${data.id}`);

		// Call frontend cache invalidation endpoint
		await invalidateFrontendCache(['categories', 'products'], data.id);

		logger.info(
			`[CACHE-INVALIDATION] Frontend cache invalidated for category: ${data.id}`,
		);
	} catch (error) {
		logger.error(
			`[CACHE-INVALIDATION] Failed to invalidate cache for category ${data.id}:`,
			error,
		);
	}
}

/**
 * Invalidate frontend cache when inventory levels change
 */
export async function handleInventoryUpdated({
	event: { data },
	container,
}: SubscriberArgs<{ variant_id: string }>) {
	const logger = container.resolve('logger');

	try {
		logger.info(
			`[CACHE-INVALIDATION] Inventory updated for variant: ${data.variant_id}`,
		);

		// Call frontend cache invalidation endpoint
		await invalidateFrontendCache(['products'], data.variant_id);

		logger.info(
			`[CACHE-INVALIDATION] Frontend cache invalidated for inventory change: ${data.variant_id}`,
		);
	} catch (error) {
		logger.error(
			`[CACHE-INVALIDATION] Failed to invalidate cache for inventory ${data.variant_id}:`,
			error,
		);
	}
}

/**
 * Helper function to call frontend cache invalidation API
 */
async function invalidateFrontendCache(
	tags: string[],
	entityId: string,
): Promise<void> {
	const frontendUrl =
		process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8000';

	try {
		const response = await fetch(`${frontendUrl}/api/revalidate`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${process.env.REVALIDATE_SECRET || 'supersecret'}`,
			},
			body: JSON.stringify({
				tags,
				entityId,
				timestamp: new Date().toISOString(),
			}),
		});

		if (!response.ok) {
			throw new Error(`Frontend cache invalidation failed: ${response.status}`);
		}
	} catch (error) {
		// Don't throw - cache invalidation failure shouldn't break the main operation
		console.error('Frontend cache invalidation failed:', error);
	}
}

// Subscriber configuration
export default async function cacheInvalidationSubscriber(container: any) {
	const eventBusService = container.resolve('eventBusService');

	// Subscribe to product events
	eventBusService.subscribe('product.updated', handleProductUpdated);
	eventBusService.subscribe('product.created', handleProductCreated);
	eventBusService.subscribe('product.deleted', handleProductDeleted);

	// Subscribe to category events
	eventBusService.subscribe('product-category.updated', handleCategoryUpdated);
	eventBusService.subscribe('product-category.created', handleCategoryUpdated);
	eventBusService.subscribe('product-category.deleted', handleCategoryUpdated);

	// Subscribe to inventory events
	eventBusService.subscribe('inventory-item.updated', handleInventoryUpdated);
	eventBusService.subscribe('inventory-level.updated', handleInventoryUpdated);
}

export const config: SubscriberConfig = {
	event: [
		'product.updated',
		'product.created',
		'product.deleted',
		'product-category.updated',
		'product-category.created',
		'product-category.deleted',
		'inventory-item.updated',
		'inventory-level.updated',
	],
};
