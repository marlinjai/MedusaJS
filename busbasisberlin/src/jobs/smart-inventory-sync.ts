// src/jobs/smart-inventory-sync.ts
import { MedusaContainer } from '@medusajs/framework/types';
import { syncProductsWorkflow } from '../workflows/sync-products';
import { syncCategoriesWorkflow } from '../workflows/sync-categories';

/**
 * Smart periodic inventory and category sync job
 *
 * Runs every 5 minutes to catch manual inventory updates
 * Only syncs products that were updated since last run (efficient)
 * Also syncs categories when products change to ensure category visibility is correct
 *
 * This solves the limitation where direct inventory updates don't emit events
 * and ensures parent categories show when subcategories have products.
 *
 * Configure in medusa-config.ts:
 * jobs: [
 *   {
 *     schedule: '0 *\/5 * * * *', // Every 5 minutes
 *     handler: './src/jobs/smart-inventory-sync',
 *   }
 * ]
 */
export default async function smartInventorySync(container: MedusaContainer) {
	const logger = container.resolve('logger');
	const query = container.resolve('query');

	try {
		logger.info('🔄 [SMART-SYNC] Starting smart inventory sync...');

		// Get products updated in the last 10 minutes (buffer to ensure we don't miss updates)
		const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

		const { data: recentProducts } = await query.graph({
			entity: 'product',
			fields: ['id', 'updated_at'],
			filters: {
				updated_at: {
					$gte: tenMinutesAgo.toISOString(),
				},
			},
		});

		if (!recentProducts || recentProducts.length === 0) {
			logger.info('ℹ️ [SMART-SYNC] No recently updated products to sync');
			return;
		}

		logger.info(
			`🔄 [SMART-SYNC] Found ${recentProducts.length} products updated in last 10 minutes`,
		);

		const productIds = recentProducts.map((p: any) => p.id);

		// Sync in batches to avoid overwhelming the system
		const batchSize = 20;
		let syncedCount = 0;

		for (let i = 0; i < productIds.length; i += batchSize) {
			const batch = productIds.slice(i, i + batchSize);

			try {
				await syncProductsWorkflow(container).run({
					input: {
						filters: {
							id: batch,
						},
					},
				});

				syncedCount += batch.length;
				logger.info(
					`✓ [SMART-SYNC] Synced batch ${Math.floor(i / batchSize) + 1} (${batch.length} products)`,
				);
			} catch (error) {
				logger.error(
					`❌ [SMART-SYNC] Failed to sync batch starting at index ${i}:`,
					error instanceof Error ? error.message : error,
				);
				// Continue with next batch
			}
		}

		logger.info(
			`✅ [SMART-SYNC] Completed: ${syncedCount}/${recentProducts.length} products synced to Meilisearch`,
		);

		// Sync categories if we synced any products (product changes can affect category visibility)
		if (syncedCount > 0) {
			logger.info('📂 [SMART-SYNC] Syncing categories due to product changes...');
			try {
				// Get all categories that might be affected
				const { data: affectedCategories } = await query.graph({
					entity: 'product_category',
					fields: ['id', 'updated_at'],
					filters: {
						updated_at: {
							$gte: tenMinutesAgo.toISOString(),
						},
					},
				});

				// Always sync all categories to ensure visibility is correct
				// (since product changes in subcategories can affect parent category visibility)
				await syncCategoriesWorkflow(container).run({
					input: {
						limit: 1000, // Sync all categories at once for consistency
						offset: 0,
					},
				});

				logger.info(
					`✅ [SMART-SYNC] Categories synced successfully (${affectedCategories?.length || 0} recently updated)`,
				);
			} catch (error) {
				logger.error(
					'❌ [SMART-SYNC] Failed to sync categories:',
					error instanceof Error ? error.message : error,
				);
				// Don't throw - category sync failure shouldn't break the job
			}
		}
	} catch (error) {
		logger.error(
			'❌ [SMART-SYNC] Failed to run smart inventory sync:',
			error instanceof Error ? error.message : error,
		);
	}
}

// Job configuration
export const config = {
	name: 'smart-inventory-sync',
	// Cron format: second minute hour day month weekday
	// Run every 5 minutes: */5 * * * *
	// Note: Adjust frequency based on your needs:
	// - Every 5 minutes: '0 */5 * * * *'
	// - Every 10 minutes: '0 */10 * * * *'
	// - Every 15 minutes: '0 */15 * * * *'
	schedule: '0 */5 * * * *', // Every 5 minutes
};
