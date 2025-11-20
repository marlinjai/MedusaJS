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

			// Track if we processed any images for this product
			let productProcessed = false;

			// For each image, check if it's already associated with all variants
			// and associate it with variants that don't have it
			for (const image of productImages) {
				// Query variant-image associations for this image
				// Check which variants already have this image
				const variantIdsWithImage: string[] = [];

				// Query each variant to check if it has this image
				for (const variant of variants) {
					const { data: variantData } = await query.graph({
						entity: 'product_variant',
						fields: ['id', 'images.id'],
						filters: { id: variant.id },
					});

					const variantWithImages = variantData?.[0];
					const variantImages = (variantWithImages as any)?.images || [];
					const hasImage = variantImages.some(
						(img: any) => img.id === image.id,
					);

					if (hasImage) {
						variantIdsWithImage.push(variant.id);
					}
				}

				// Find variants that don't have this image
				const variantIdsToAdd = variants
					.map((v: any) => v.id)
					.filter((id: string) => !variantIdsWithImage.includes(id));

				// If all variants already have this image, skip
				if (variantIdsToAdd.length === 0) {
					continue;
				}

				// Associate image with variants that don't have it
				// Use Admin API endpoint: POST /admin/products/{id}/images/{image_id}/variants/batch
				try {
					// Get the base URL from environment or use default
					const baseUrl =
						process.env.MEDUSA_BACKEND_URL ||
						process.env.BACKEND_URL ||
						'http://localhost:9000';

					// Call Admin API to associate image with variants
					const apiUrl = `${baseUrl}/admin/products/${product.id}/images/${image.id}/variants/batch`;

					const response = await fetch(apiUrl, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							add: variantIdsToAdd,
							remove: [],
						}),
					});

					if (!response.ok) {
						const errorData = await response.json().catch(() => ({}));
						throw new Error(
							`API call failed: ${response.status} ${response.statusText} - ${errorData.message || 'Unknown error'}`,
						);
					}

					const result = await response.json();
					totalAssociations += variantIdsToAdd.length;

					logger.info(
						`  ✅ Associated image ${image.id} with ${variantIdsToAdd.length} variants`,
					);
					productProcessed = true;
				} catch (error: any) {
					// If it's a 404, the endpoint might not exist (Medusa version < 2.11.2)
					if (error.message?.includes('404')) {
						logger.warn(
							`⚠️  Admin API endpoint not available (Medusa < 2.11.2?). Skipping image ${image.id} for product ${product.id}`,
						);
						continue;
					}

					errorCount++;
					logger.error(
						`❌ Failed to associate image ${image.id} for product ${product.id}: ${error.message}`,
					);
					// Continue with next image instead of failing entire product
					continue;
				}
			}

			// Log product processing status
			if (productProcessed) {
				processedCount++;
				logger.info(
					`✅ Processed product: ${(product as any).title} (${(product as any).handle})`,
				);
			} else {
				// All images were already associated or skipped
				skippedCount++;
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
