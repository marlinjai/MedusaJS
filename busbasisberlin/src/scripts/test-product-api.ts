/**
 * test-product-api.ts
 * Test script to check what the API returns for a specific product
 * Run with: npx medusa exec ./src/scripts/test-product-api.ts
 */
import { ExecArgs } from '@medusajs/framework/types';
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';

export default async function testProductAPI({ container }: ExecArgs) {
	const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
	const query = container.resolve(ContainerRegistrationKeys.QUERY);
	const productModuleService = container.resolve(Modules.PRODUCT);

	// Test with the specific product mentioned: "Reflektor rot Schrauben M6x20/8,8 Senkkopfschrauben"
	// Handle from the URL: /ab-99-012
	const testHandle = 'ab-99-012';
	const testProductId = 'prod_01K5CB4CVDWYYXJTXF3PTFT3QK';

	logger.info('🧪 Testing product API response...');
	logger.info(`   Testing product ID: ${testProductId}`);
	logger.info(`   Testing product handle: ${testHandle}`);

	try {
		// Test 1: Query using query.graph (what the script uses)
		logger.info('\n📋 Test 1: Query using query.graph');
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
				'variants.images.id',
				'variants.images.url',
			],
			filters: { id: testProductId },
		});

		if (products.length > 0) {
			const product = products[0];
			logger.info(`   ✅ Found product: ${(product as any).title}`);
			logger.info(`   Handle: ${(product as any).handle}`);
			logger.info(`   Thumbnail: ${(product as any).thumbnail || 'N/A'}`);
			logger.info(
				`   Product images (query.graph): ${((product as any).images || []).length}`,
			);
			if ((product as any).images && (product as any).images.length > 0) {
				(product as any).images.forEach((img: any, idx: number) => {
					logger.info(`     Image ${idx + 1}: ${img.id} - ${img.url}`);
				});
			}

			logger.info(`   Variants: ${((product as any).variants || []).length}`);
			if ((product as any).variants) {
				(product as any).variants.forEach((variant: any, idx: number) => {
					logger.info(
						`     Variant ${idx + 1}: ${variant.id} - ${variant.title || variant.sku}`,
					);
					const variantImages = (variant as any).images || [];
					logger.info(`       Variant images: ${variantImages.length}`);
					if (variantImages.length > 0) {
						variantImages.forEach((img: any, imgIdx: number) => {
							logger.info(
								`         Image ${imgIdx + 1}: ${img.id} - ${img.url}`,
							);
						});
					}
				});
			}

			// Log full product object structure
			logger.info('\n   Full product object keys:');
			logger.info(`     ${Object.keys(product).join(', ')}`);
			logger.info('\n   Full product object (JSON):');
			logger.info(JSON.stringify(product, null, 2));
		} else {
			logger.warn(`   ❌ Product not found with ID: ${testProductId}`);
		}

		// Test 2: Query by handle
		logger.info('\n📋 Test 2: Query by handle');
		const { data: productsByHandle } = await query.graph({
			entity: 'product',
			fields: [
				'id',
				'title',
				'handle',
				'images.id',
				'images.url',
				'variants.id',
			],
			filters: { handle: testHandle },
		});

		if (productsByHandle.length > 0) {
			const product = productsByHandle[0];
			logger.info(`   ✅ Found product: ${(product as any).title}`);
			logger.info(
				`   Product images: ${((product as any).images || []).length}`,
			);
		} else {
			logger.warn(`   ❌ Product not found with handle: ${testHandle}`);
		}

		// Test 3: Query variant images separately
		logger.info('\n📋 Test 3: Query variant images separately');
		if (products.length > 0) {
			const product = products[0];
			const variants = (product as any).variants || [];
			for (const variant of variants) {
				const { data: variantData } = await query.graph({
					entity: 'product_variant',
					fields: ['id', 'images.id', 'images.url'],
					filters: { id: variant.id },
				});

				if (variantData.length > 0) {
					const variantWithImages = variantData[0];
					const variantImages = (variantWithImages as any).images || [];
					logger.info(
						`   Variant ${variant.id}: ${variantImages.length} images`,
					);
					if (variantImages.length > 0) {
						variantImages.forEach((img: any, idx: number) => {
							logger.info(`     Image ${idx + 1}: ${img.id} - ${img.url}`);
						});
					}
				}
			}
		}

		// Test 4: Use productModuleService.retrieveProduct with relations
		logger.info('\n📋 Test 4: Using productModuleService.retrieveProduct');
		try {
			const productWithRelations = await productModuleService.retrieveProduct(
				testProductId,
				{
					relations: ['images', 'variants', 'variants.images'],
				},
			);

			logger.info(`   ✅ Retrieved product: ${productWithRelations.title}`);
			logger.info(
				`   Product images (module service): ${(productWithRelations.images || []).length}`,
			);
			if (
				productWithRelations.images &&
				productWithRelations.images.length > 0
			) {
				productWithRelations.images.forEach((img: any, idx: number) => {
					logger.info(
						`     Image ${idx + 1}: ${img.id} - ${img.url || img.url}`,
					);
				});
			}

			if (productWithRelations.variants) {
				productWithRelations.variants.forEach((variant: any, idx: number) => {
					logger.info(
						`   Variant ${idx + 1}: ${variant.id} - ${variant.title || variant.sku}`,
					);
					const variantImages = variant.images || [];
					logger.info(`     Variant images: ${variantImages.length}`);
					if (variantImages.length > 0) {
						variantImages.forEach((img: any, imgIdx: number) => {
							logger.info(
								`       Image ${imgIdx + 1}: ${img.id} - ${img.url || img.url}`,
							);
						});
					}
				});
			}
		} catch (error: any) {
			logger.error(`   ❌ Error: ${error.message}`);
		}

		// Test 5: Query images entity directly (query all and filter in code)
		logger.info('\n📋 Test 5: Query images entity directly');
		try {
			const { data: allImages } = await query.graph({
				entity: 'product_image',
				fields: ['id', 'url'],
				pagination: { take: 1000 }, // Get a sample
			});

			logger.info(`   Found ${allImages.length} total images in database`);

			// Try to find images related to this product by querying through product relation
			const { data: productWithImageRelation } = await query.graph({
				entity: 'product',
				fields: ['id', 'images.id', 'images.url'],
				filters: { id: testProductId },
			});

			if (productWithImageRelation.length > 0) {
				const productImages = (productWithImageRelation[0] as any).images || [];
				logger.info(
					`   Images for this product (via relation): ${productImages.length}`,
				);
				productImages.forEach((img: any, idx: number) => {
					logger.info(`     Image ${idx + 1}: ${img.id} - ${img.url}`);
				});
			}
		} catch (error: any) {
			logger.error(`   ❌ Error: ${error.message}`);
		}

		logger.info('\n✅ Test complete!');
	} catch (error) {
		logger.error('❌ Error during test:', error);
		throw error;
	}
}
