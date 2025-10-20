// src/subscribers/inventory-meilisearch.ts
/**
 * Comprehensive inventory tracking subscriber for Meilisearch sync
 *
 * Since Medusa doesn't emit inventory_level events, this subscriber listens to
 * ALL business events that affect product availability:
 *
 * 1. Order Events - orders reduce inventory
 * 2. Offer Events - offers create/release reservations
 * 3. Variant Events - variant changes may affect inventory settings
 *
 * This ensures Meilisearch always reflects accurate product availability.
 */
import { SubscriberArgs, type SubscriberConfig } from '@medusajs/framework';
import { syncProductsWorkflow } from '../workflows/sync-products';

export default async function handleInventoryAffectingEvents({
	event,
	container,
}: SubscriberArgs<any>) {
	const logger = container.resolve('logger');
	const query = container.resolve('query');

	try {
		logger.info(
			`🔄 [INVENTORY-SYNC] Event detected: ${event.name} - syncing affected products`,
		);

		let productIds: string[] = [];

		// Handle different event types
		switch (event.name) {
			case 'order.placed':
			case 'order.updated':
			case 'order.canceled':
				productIds = await getProductIdsFromOrder(event.data, query, logger);
				break;

			case 'offer.status_changed':
				productIds = await getProductIdsFromOffer(
					event.data,
					query,
					logger,
					container,
				);
				break;

			case 'product_variant.created':
			case 'product_variant.updated':
			case 'product_variant.deleted':
				// Variant events include product_id
				if (event.data.product_id) {
					productIds = [event.data.product_id];
				}
				break;

			default:
				logger.warn(`⚠️ [INVENTORY-SYNC] Unhandled event type: ${event.name}`);
				return;
		}

		if (productIds.length === 0) {
			logger.info(
				`ℹ️ [INVENTORY-SYNC] No products to sync for event: ${event.name}`,
			);
			return;
		}

		logger.info(
			`🔄 [INVENTORY-SYNC] Syncing ${productIds.length} products to Meilisearch`,
		);

		// Sync products in batches
		const batchSize = 10;
		for (let i = 0; i < productIds.length; i += batchSize) {
			const batch = productIds.slice(i, i + batchSize);

			await syncProductsWorkflow(container).run({
				input: {
					filters: {
						id: batch,
					},
				},
			});
		}

		logger.info(
			`✅ [INVENTORY-SYNC] Successfully synced ${productIds.length} products`,
		);
	} catch (error) {
		logger.error(
			`❌ [INVENTORY-SYNC] Failed to sync products:`,
			error instanceof Error ? error.message : error,
		);
		// Don't throw - we don't want to break the original operation
	}
}

/**
 * Extract product IDs from an order
 */
async function getProductIdsFromOrder(
	orderData: any,
	query: any,
	logger: any,
): Promise<string[]> {
	try {
		const orderId = orderData.id;

		if (!orderId) {
			logger.warn('⚠️ [INVENTORY-SYNC] Order event missing id');
			return [];
		}

		// Get order with items
		const { data: orders } = await query.graph({
			entity: 'order',
			fields: ['id', 'items.variant_id', 'items.product_id'],
			filters: {
				id: orderId,
			},
		});

		if (!orders || orders.length === 0) {
			logger.warn(`⚠️ [INVENTORY-SYNC] Order ${orderId} not found`);
			return [];
		}

		const order = orders[0];
		const productIds: Set<string> = new Set();

		// Extract product IDs from order items
		if (order.items) {
			for (const item of order.items) {
				if (item.product_id) {
					productIds.add(item.product_id);
				} else if (item.variant_id) {
					// If no product_id, get it from variant
					const { data: variants } = await query.graph({
						entity: 'product_variant',
						fields: ['id', 'product_id'],
						filters: {
							id: item.variant_id,
						},
					});

					if (variants && variants.length > 0) {
						productIds.add(variants[0].product_id);
					}
				}
			}
		}

		return Array.from(productIds);
	} catch (error) {
		logger.error(
			'❌ [INVENTORY-SYNC] Error getting products from order:',
			error,
		);
		return [];
	}
}

/**
 * Extract product IDs from an offer
 */
async function getProductIdsFromOffer(
	offerData: any,
	query: any,
	logger: any,
	container: any,
): Promise<string[]> {
	try {
		const offerId = offerData.offer_id;

		if (!offerId) {
			logger.warn('⚠️ [INVENTORY-SYNC] Offer event missing offer_id');
			return [];
		}

		// Only sync for status changes that affect inventory
		// draft → active (creates reservations)
		// active → cancelled (releases reservations)
		// accepted → completed (releases reservations)
		const inventoryAffectingStatuses = ['active', 'cancelled', 'completed'];

		if (
			offerData.new_status &&
			!inventoryAffectingStatuses.includes(offerData.new_status)
		) {
			logger.info(
				`ℹ️ [INVENTORY-SYNC] Offer status ${offerData.new_status} doesn't affect inventory`,
			);
			return [];
		}

		// Get offer service to retrieve offer items
		const offerService = container.resolve('offer');
		const offer = await offerService.getOfferWithDetails(offerId);

		if (!offer || !offer.items) {
			logger.warn(
				`⚠️ [INVENTORY-SYNC] Offer ${offerId} not found or has no items`,
			);
			return [];
		}

		const productIds: Set<string> = new Set();

		// Extract product IDs from offer items
		for (const item of offer.items) {
			if (item.product_id) {
				productIds.add(item.product_id);
			} else if (item.variant_id) {
				// Get product_id from variant
				const { data: variants } = await query.graph({
					entity: 'product_variant',
					fields: ['id', 'product_id'],
					filters: {
						id: item.variant_id,
					},
				});

				if (variants && variants.length > 0) {
					productIds.add(variants[0].product_id);
				}
			}
		}

		return Array.from(productIds);
	} catch (error) {
		logger.error(
			'❌ [INVENTORY-SYNC] Error getting products from offer:',
			error,
		);
		return [];
	}
}

export const config: SubscriberConfig = {
	event: [
		// Order events - affect actual inventory levels
		'order.placed',
		'order.updated',
		'order.canceled',

		// Offer events - affect inventory reservations
		'offer.status_changed',

		// Variant events - may affect inventory management settings
		'product_variant.created',
		'product_variant.updated',
		'product_variant.deleted',
	],
};
