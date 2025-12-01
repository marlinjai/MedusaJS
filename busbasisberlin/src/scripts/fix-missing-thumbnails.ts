// busbasisberlin/src/scripts/fix-missing-thumbnails.ts
// Migration script to set thumbnail from first image for products missing thumbnails
// Run with: npx medusa exec ./src/scripts/fix-missing-thumbnails.ts

import { ExecArgs } from '@medusajs/framework/types';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { updateProductsWorkflow } from '@medusajs/medusa/core-flows';

export default async function fixMissingThumbnails({ container }: ExecArgs) {
	const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
	const query = container.resolve(ContainerRegistrationKeys.QUERY);

	logger.info('🔄 Starting thumbnail migration...');

	try {
		// Query all products with their images
		logger.info('📦 Fetching products...');
		const { data: products } = await query.graph({
			entity: 'product',
			fields: ['id', 'title', 'handle', 'thumbnail', 'images.id', 'images.url'],
			pagination: {
				take: 10000, // Fetch all products
				skip: 0,
			},
		});

		logger.info(`✅ Found ${products.length} total products`);

		// Filter products that need thumbnail updates
		const productsNeedingThumbnails = products.filter((product: any) => {
			const hasImages = product.images && product.images.length > 0;
			const hasThumbnail = product.thumbnail && product.thumbnail.trim() !== '';
			return hasImages && !hasThumbnail;
		});

		logger.info(
			`🎯 Found ${productsNeedingThumbnails.length} products without thumbnails but with images`,
		);

		if (productsNeedingThumbnails.length === 0) {
			logger.info('✅ All products already have thumbnails set. Nothing to do!');
			return;
		}

		// Display first few examples
		if (productsNeedingThumbnails.length > 0) {
			logger.info('\n📋 Sample products that will be updated:');
			productsNeedingThumbnails.slice(0, 5).forEach((product: any) => {
				logger.info(
					`   - ${product.title} (${product.handle}) - ${product.images.length} images`,
				);
			});
			logger.info('');
		}

		// Update products in batches
		const BATCH_SIZE = 50;
		let successCount = 0;
		let errorCount = 0;

		for (let i = 0; i < productsNeedingThumbnails.length; i += BATCH_SIZE) {
			const batch = productsNeedingThumbnails.slice(i, i + BATCH_SIZE);
			const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
			const totalBatches = Math.ceil(
				productsNeedingThumbnails.length / BATCH_SIZE,
			);

			logger.info(
				`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} products)`,
			);

			// Process batch
			const batchPromises = batch.map(async (product: any) => {
				try {
					const firstImageUrl = product.images[0].url;

					// Update product thumbnail using updateProductsWorkflow
					await updateProductsWorkflow(container).run({
						input: {
							products: [
								{
									id: product.id,
									thumbnail: firstImageUrl,
								},
							],
						},
					});

					successCount++;

					// Log first few successes
					if (successCount <= 10) {
						logger.info(
							`   ✅ Updated: ${product.title} → ${firstImageUrl}`,
						);
					}
				} catch (error: any) {
					errorCount++;
					logger.error(
						`   ❌ Failed to update ${product.id} (${product.title}): ${error.message}`,
					);
				}
			});

			// Wait for batch to complete
			await Promise.all(batchPromises);

			// Log progress
			logger.info(
				`   Progress: ${successCount} succeeded, ${errorCount} failed`,
			);
		}

		// Summary
		logger.info('\n📊 MIGRATION SUMMARY:');
		logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
		logger.info(`Products processed: ${productsNeedingThumbnails.length}`);
		logger.info(`✅ Successfully updated: ${successCount}`);
		logger.info(`❌ Errors: ${errorCount}`);
		logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

		if (successCount > 0) {
			logger.info(
				'\n💡 Next steps: Products will be re-synced to search index automatically.',
			);
		}
	} catch (error) {
		logger.error('❌ Migration failed:');
		logger.error(error instanceof Error ? error.message : String(error));
		throw error;
	}
}

