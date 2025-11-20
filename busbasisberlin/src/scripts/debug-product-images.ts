/**
 * debug-product-images.ts
 * Debug script to inspect product and variant image associations in the database
 * Run with: npx medusa exec ./src/scripts/debug-product-images.ts
 */
import { ExecArgs } from '@medusajs/framework/types';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

export default async function debugProductImages({ container }: ExecArgs) {
	const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
	const query = container.resolve(ContainerRegistrationKeys.QUERY);

	logger.info('🔍 Starting product image debugging...');

	try {
		// Query products with images and variants
		logger.info('📦 Fetching products with images and variants...');
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
			pagination: {
				take: 100, // Sample first 100 products
			},
		});

		logger.info(`📊 Found ${products.length} products to analyze`);

		// Statistics
		let productsWithImages = 0;
		let productsWithoutImages = 0;
		let variantsWithImages = 0;
		let variantsWithoutImages = 0;
		let totalVariants = 0;
		const sampleProducts: any[] = [];

		// Analyze each product
		for (const product of products) {
			const productImages = (product as any).images || [];
			const variants = (product as any).variants || [];
			totalVariants += variants.length;

			// Check product images
			if (productImages.length > 0) {
				productsWithImages++;
			} else {
				productsWithoutImages++;
			}

			// Check variant images (need to query separately as variant images might not be in initial query)
			for (const variant of variants) {
				// Query variant with images
				const { data: variantData } = await query.graph({
					entity: 'product_variant',
					fields: ['id', 'images.id', 'images.url'],
					filters: { id: variant.id },
				});

				const variantWithImages = variantData?.[0];
				const variantImages = (variantWithImages as any)?.images || [];

				if (variantImages.length > 0) {
					variantsWithImages++;
				} else {
					variantsWithoutImages++;
				}
			}

			// Collect sample products for detailed logging
			if (sampleProducts.length < 5) {
				sampleProducts.push({
					id: product.id,
					title: product.title,
					handle: product.handle,
					thumbnail: (product as any).thumbnail,
					productImages: productImages.map((img: any) => ({
						id: img.id,
						url: img.url,
					})),
					variants: variants.map((v: any) => ({
						id: v.id,
						title: v.title,
						sku: v.sku,
					})),
				});
			}
		}

		// Log statistics
		logger.info('\n📊 IMAGE STATISTICS:');
		logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
		logger.info(`Products with images: ${productsWithImages}`);
		logger.info(`Products without images: ${productsWithoutImages}`);
		logger.info(`Total variants: ${totalVariants}`);
		logger.info(`Variants with images: ${variantsWithImages}`);
		logger.info(`Variants without images: ${variantsWithoutImages}`);
		logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

		// Log sample products
		logger.info('📋 SAMPLE PRODUCTS (first 5):');
		for (const sample of sampleProducts) {
			logger.info(`\n  Product: ${sample.title} (${sample.handle})`);
			logger.info(`    ID: ${sample.id}`);
			logger.info(`    Thumbnail: ${sample.thumbnail || 'NONE'}`);
			logger.info(`    Product Images: ${sample.productImages.length}`);
			if (sample.productImages.length > 0) {
				sample.productImages.forEach((img: any, idx: number) => {
					logger.info(`      [${idx + 1}] ${img.id}: ${img.url}`);
				});
			}

			// Query variant images for this product
			logger.info(`    Variants: ${sample.variants.length}`);
			for (const variant of sample.variants) {
				const { data: variantData } = await query.graph({
					entity: 'product_variant',
					fields: ['id', 'images.id', 'images.url'],
					filters: { id: variant.id },
				});

				const variantWithImages = variantData?.[0];
				const variantImages = (variantWithImages as any)?.images || [];

				logger.info(`      Variant: ${variant.title || variant.sku} (${variant.id})`);
				logger.info(`        Variant Images: ${variantImages.length}`);
				if (variantImages.length > 0) {
					variantImages.forEach((img: any, idx: number) => {
						logger.info(`          [${idx + 1}] ${img.id}: ${img.url}`);
					});
				}
			}
		}

		// Find products with images in MeiliSearch but not in database
		logger.info('\n🔍 Checking for products with images in search but not in detail...');
		logger.info('   (This requires checking MeiliSearch index - manual verification needed)');

		// Summary and recommendations
		logger.info('\n💡 RECOMMENDATIONS:');
		if (productsWithImages > 0 && variantsWithImages === 0) {
			logger.info('   ⚠️  Images are on products but NOT on variants');
			logger.info('   → Need to associate product images with variants');
		} else if (productsWithoutImages > 0 && variantsWithImages > 0) {
			logger.info('   ⚠️  Some variants have images but products do not');
			logger.info('   → May need to copy variant images to products');
		} else if (productsWithImages === 0 && variantsWithImages === 0) {
			logger.info('   ⚠️  No images found in database');
			logger.info('   → Images may need to be imported');
		} else {
			logger.info('   ✅ Image structure looks correct');
			logger.info('   → Issue may be in API response or frontend logic');
		}

		logger.info('\n✅ Debugging complete!');
	} catch (error) {
		logger.error('❌ Error during debugging:', error);
		throw error;
	}
}

