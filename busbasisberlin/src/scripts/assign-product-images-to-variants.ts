/**
 * assign-product-images-to-variants.ts
 * Migration script to associate product images with all variants
 * This ensures images display correctly on product detail pages
 * Run with: npx medusa exec ./src/scripts/assign-product-images-to-variants.ts
 */
import { ExecArgs } from '@medusajs/framework/types';
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';

export default async function assignProductImagesToVariants({
	container,
}: ExecArgs) {
	const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
	const query = container.resolve(ContainerRegistrationKeys.QUERY);
	const productModuleService = container.resolve(Modules.PRODUCT);

	logger.info('🔄 Starting product image to variant association...');

	try {
		// Query all products with images and variants
		logger.info('📦 Fetching products with images and variants...');
		const { data: products } = await query.graph({
			entity: 'product',
			fields: [
				'id',
				'title',
				'handle',
				'images.id',
				'images.url',
				'variants.id',
				'variants.title',
				'variants.sku',
			],
		});

		logger.info(`📊 Found ${products.length} products to process`);

		let processedCount = 0;
		let skippedCount = 0;
		let errorCount = 0;
		let totalAssociations = 0;

		// Process each product
		for (const product of products) {
			const productImages = (product as any).images || [];
			const variants = (product as any).variants || [];

			// Skip if product has no images or no variants
			if (productImages.length === 0) {
				skippedCount++;
				continue;
			}

			if (variants.length === 0) {
				logger.warn(
					`⚠️  Product ${product.id} (${(product as any).title}) has images but no variants - skipping`,
				);
				skippedCount++;
				continue;
			}

			// Log first few products for debugging
			if (processedCount + skippedCount < 5) {
				logger.info(
					`\n🔍 Processing product: ${(product as any).title} (${product.id})`,
				);
				logger.info(`   Product images: ${productImages.length}`);
				logger.info(`   Variants: ${variants.length}`);
			}

			// Build array of image-variant pairs to associate
			// Use productModuleService.addImageToVariant() method directly
			const imageVariantPairs: Array<{
				image_id: string;
				variant_id: string;
			}> = [];

			for (const image of productImages) {
				for (const variant of variants) {
					imageVariantPairs.push({
						image_id: image.id,
						variant_id: variant.id,
					});
				}
			}

			// Skip if no pairs to create
			if (imageVariantPairs.length === 0) {
				skippedCount++;
				continue;
			}

			// Log first few for debugging
			if (processedCount + skippedCount < 5) {
				logger.info(
					`   Creating ${imageVariantPairs.length} image-variant associations`,
				);
			}

			// Associate images with variants using product module service
			// This method is idempotent - it won't create duplicates if associations already exist
			try {
				await productModuleService.addImageToVariant(imageVariantPairs);
				totalAssociations += imageVariantPairs.length;
				processedCount++;

				if (processedCount <= 10) {
					logger.info(
						`  ✅ Associated ${imageVariantPairs.length} image-variant pairs for product ${(product as any).title}`,
					);
				}
			} catch (error: any) {
				errorCount++;
				logger.error(
					`❌ Failed to associate images for product ${product.id} (${(product as any).title}): ${error.message}`,
				);
				// Log detailed error for first few failures
				if (errorCount <= 5) {
					logger.error(`   Error details:`, error);
				}
				// Continue with next product instead of failing entire migration
				continue;
			}
		}

		// Summary
		logger.info('\n📊 MIGRATION SUMMARY:');
		logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
		logger.info(`Products processed: ${processedCount}`);
		logger.info(`Products skipped: ${skippedCount}`);
		logger.info(`Errors: ${errorCount}`);
		logger.info(`Total associations created: ${totalAssociations}`);
		logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

		if (errorCount > 0) {
			logger.warn(
				`⚠️  ${errorCount} products had errors. Check logs above for details.`,
			);
		}

		logger.info('✅ Migration complete!');
	} catch (error) {
		logger.error('❌ Error during migration:', error);
		throw error;
	}
}
