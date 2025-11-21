/**
 * assign-product-images-to-variants.ts
 * Migration script to:
 * 1. Create image records from product thumbnails (if products have thumbnails but no images)
 * 2. Associate product images with all variants
 * This ensures images display correctly on product detail pages
 * Uses updateProductsWorkflow to create images and batchVariantImagesWorkflow for associations
 * Run with: npx medusa exec ./src/scripts/assign-product-images-to-variants.ts
 */
import { ExecArgs } from '@medusajs/framework/types';
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';
import {
	batchVariantImagesWorkflow,
	updateProductsWorkflow,
} from '@medusajs/medusa/core-flows';

export default async function assignProductImagesToVariants({
	container,
}: ExecArgs) {
	const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
	const query = container.resolve(ContainerRegistrationKeys.QUERY);
	const productModuleService = container.resolve(Modules.PRODUCT);

	logger.info('🔄 Starting product image to variant association...');

	try {
		// Step 1: Query all products with thumbnails, images, and variants
		logger.info(
			'📦 Step 1: Fetching all products with thumbnails, images, and variants...',
		);

		const { data: products } = await query.graph({
			entity: 'product',
			fields: [
				'id',
				'title',
				'handle',
				'thumbnail',
				'images.id',
				'images.url',
				'variants.id',
				'variants.title',
				'variants.sku',
			],
		});

		logger.info(`📊 Found ${products.length} total products`);

		// Step 2: Identify products that need image records created from thumbnails
		type ProductWithData = {
			id: string;
			title: string;
			handle: string;
			thumbnail?: string;
			images: Array<{ id: string; url?: string }>;
			variants: Array<{ id: string }>;
		};

		const productsNeedingImages: ProductWithData[] = [];
		const productsWithData: ProductWithData[] = [];
		let productsWithImages = 0;
		let productsWithoutImages = 0;
		let productsWithoutVariants = 0;
		let productsWithThumbnailsButNoImages = 0;

		for (const product of products) {
			const productImages = (product as any).images || [];
			const variants = (product as any).variants || [];
			const thumbnail = (product as any).thumbnail;

			// Skip products without variants
			if (variants.length === 0) {
				productsWithoutVariants++;
				continue;
			}

			// Check if product has thumbnail but no image records
			if (thumbnail && (!productImages || productImages.length === 0)) {
				productsWithThumbnailsButNoImages++;
				productsNeedingImages.push({
					id: product.id,
					title: (product as any).title || 'Untitled',
					handle: (product as any).handle || '',
					thumbnail,
					images: [],
					variants: variants.map((v: any) => ({ id: v.id })),
				});
				continue;
			}

			// Products with existing image records
			if (productImages.length > 0) {
				productsWithImages++;
				productsWithData.push({
					id: product.id,
					title: (product as any).title || 'Untitled',
					handle: (product as any).handle || '',
					images: productImages.map((img: any) => ({
						id: img.id,
						url: img.url,
					})),
					variants: variants.map((v: any) => ({ id: v.id })),
				});
			} else {
				productsWithoutImages++;
			}
		}

		logger.info(`📊 Analysis complete:`);
		logger.info(
			`   - ${productsWithData.length} products with existing image records`,
		);
		logger.info(
			`   - ${productsWithThumbnailsButNoImages} products with thumbnails but no image records (will create)`,
		);
		logger.info(
			`   - ${productsWithoutImages} products without images or thumbnails`,
		);
		logger.info(
			`   - ${productsWithoutVariants} products without variants (skipped)`,
		);

		// Step 3: Create image records from thumbnails
		let imagesCreated = 0;
		if (productsNeedingImages.length > 0) {
			logger.info(
				`\n🖼️  Step 2: Creating image records from ${productsNeedingImages.length} product thumbnails...`,
			);

			for (const product of productsNeedingImages) {
				if (!product.thumbnail) {
					continue;
				}

				try {
					// Use updateProductsWorkflow to add image from thumbnail
					await updateProductsWorkflow(container).run({
						input: {
							products: [
								{
									id: product.id,
									images: [{ url: product.thumbnail }],
								},
							],
						},
					});

					imagesCreated++;

					// Reload product to get the newly created image ID
					const { data: updatedProducts } = await query.graph({
						entity: 'product',
						fields: ['id', 'images.id', 'images.url'],
						filters: { id: product.id },
					});

					if (updatedProducts.length > 0) {
						const updatedProduct = updatedProducts[0];
						const newImages = (updatedProduct as any).images || [];
						if (newImages.length > 0) {
							// Add to productsWithData for variant association
							productsWithData.push({
								id: product.id,
								title: product.title,
								handle: product.handle,
								images: newImages.map((img: any) => ({
									id: img.id,
									url: img.url,
								})),
								variants: product.variants,
							});
						}
					}

					// Log progress every 50 products
					if (imagesCreated % 50 === 0) {
						logger.info(
							`   Progress: ${imagesCreated}/${productsNeedingImages.length} images created`,
						);
					}
				} catch (error: any) {
					logger.error(
						`❌ Failed to create image for product ${product.id} (${product.title}): ${error.message}`,
					);
					// Continue with next product
					continue;
				}
			}

			logger.info(`✅ Created ${imagesCreated} image records from thumbnails`);
		}

		logger.info(
			`\n📦 Step 3: Associating images with variants for ${productsWithData.length} products...`,
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
		logger.info(`Image records created from thumbnails: ${imagesCreated}`);
		logger.info(`Products processed (variants associated): ${processedCount}`);
		logger.info(`Products skipped: ${skippedCount}`);
		logger.info(`Errors: ${errorCount}`);
		logger.info(
			`Total variant-image associations created: ${totalAssociations}`,
		);
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
