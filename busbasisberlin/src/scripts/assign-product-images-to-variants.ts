/**
 * assign-product-images-to-variants.ts
 * Migration script to associate product images with all variants
 * This ensures images display correctly on product detail pages
 * Uses batchVariantImagesWorkflow for bulk operations (recommended by Medusa)
 * Run with: npx medusa exec ./src/scripts/assign-product-images-to-variants.ts
 */
import { ExecArgs } from '@medusajs/framework/types';
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';
import { batchVariantImagesWorkflow } from '@medusajs/medusa/core-flows';

export default async function assignProductImagesToVariants({
	container,
}: ExecArgs) {
	const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
	const query = container.resolve(ContainerRegistrationKeys.QUERY);
	const productModuleService = container.resolve(Modules.PRODUCT);

	logger.info('🔄 Starting product image to variant association...');

	try {
		// Query all products with images and variants using query.graph
		// This is more reliable than retrieveProduct for loading relations
		logger.info('📦 Fetching all products with images and variants...');

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

		logger.info(`📊 Found ${products.length} total products`);

		// Filter products that have images and variants
		type ProductWithData = {
			id: string;
			title: string;
			handle: string;
			images: Array<{ id: string }>;
			variants: Array<{ id: string }>;
		};

		const productsWithData: ProductWithData[] = [];
		let productsWithImages = 0;
		let productsWithoutImages = 0;
		let productsWithoutVariants = 0;

		for (const product of products) {
			const productImages = (product as any).images || [];
			const variants = (product as any).variants || [];

			if (productImages.length === 0) {
				productsWithoutImages++;
				continue;
			}

			if (variants.length === 0) {
				productsWithoutVariants++;
				continue;
			}

			productsWithImages++;
			productsWithData.push({
				id: product.id,
				title: (product as any).title || 'Untitled',
				handle: (product as any).handle || '',
				images: productImages.map((img: any) => ({ id: img.id })),
				variants: variants.map((v: any) => ({ id: v.id })),
			});
		}

		logger.info(
			`📊 Found ${productsWithData.length} products with images and variants`,
		);
		logger.info(`   - ${productsWithoutImages} products without images`);
		logger.info(
			`   - ${productsWithoutVariants} products with images but no variants`,
		);

		let processedCount = 0;
		let skippedCount = 0;
		let errorCount = 0;
		let totalAssociations = 0;

		// Process each product using batchVariantImagesWorkflow (recommended by Medusa)
		for (const product of productsWithData) {
			const productImages = product.images || [];
			const variants = product.variants || [];

			// Skip if no variants
			if (variants.length === 0) {
				logger.warn(
					`⚠️  Product ${product.id} (${product.title}) has images but no variants - skipping`,
				);
				skippedCount++;
				continue;
			}

			// Skip if no images (shouldn't happen since we filtered, but just in case)
			if (productImages.length === 0) {
				skippedCount++;
				continue;
			}

			// Log first few products for debugging
			if (processedCount < 5) {
				logger.info(
					`\n🔍 Processing product: ${product.title} (${product.id})`,
				);
				logger.info(`   Product images: ${productImages.length}`);
				logger.info(`   Variants: ${variants.length}`);
			}

			// Process each variant using batchVariantImagesWorkflow
			// This is the recommended approach for bulk operations
			let productProcessed = false;
			const imageIds = productImages.map(img => img.id);

			for (const variant of variants) {
				try {
					// Use batchVariantImagesWorkflow as recommended by Medusa docs
					// This is what the Admin API uses under the hood
					const { result } = await batchVariantImagesWorkflow(container).run({
						input: {
							variant_id: variant.id,
							add: imageIds,
							remove: [], // Don't remove any existing associations
						},
					});

					if (result.added && result.added.length > 0) {
						totalAssociations += result.added.length;
						productProcessed = true;
					}
				} catch (error: any) {
					errorCount++;
					logger.error(
						`❌ Failed to associate images for variant ${variant.id} in product ${product.id} (${product.title}): ${error.message}`,
					);
					// Log detailed error for first few failures
					if (errorCount <= 5) {
						logger.error(`   Error details:`, error);
					}
					// Continue with next variant instead of failing entire product
					continue;
				}
			}

			if (productProcessed) {
				processedCount++;
				if (processedCount <= 10) {
					logger.info(
						`  ✅ Processed product: ${product.title} (${product.handle})`,
					);
				}
			} else {
				// All associations already existed (idempotent)
				skippedCount++;
			}

			// Log progress every 50 products
			if (processedCount % 50 === 0 && processedCount > 0) {
				logger.info(
					`   Progress: ${processedCount} products processed, ${skippedCount} skipped`,
				);
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
