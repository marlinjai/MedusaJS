import { ExecArgs } from '@medusajs/framework/types';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

export default async function testVariantImages({ container }: ExecArgs) {
	const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
	const query = container.resolve('query');

	// Test with variant that has 1 pivot entry but 3 product images
	const variantId = 'variant_01K5CAV6B38D96CDV7DB6J5DJT';

	logger.info(`\n🔍 Testing variant images for: ${variantId}`);

	// Query variant with images
	const { data: variants } = await query.graph({
		entity: 'product_variant',
		fields: ['id', 'title', 'sku', 'images.id', 'images.url'],
		filters: { id: variantId },
	});

	const variant = variants?.[0];
	if (variant) {
		logger.info(`\n📦 Variant: ${variant.title} (${variant.sku})`);
		logger.info(`   Images from query.graph: ${(variant as any).images?.length || 0}`);
		if ((variant as any).images?.length > 0) {
			for (const img of (variant as any).images) {
				logger.info(`   - ${img.id}: ${img.url?.substring(0, 60)}...`);
			}
		}
	} else {
		logger.error('Variant not found!');
	}

	// Try querying the pivot entity directly
	logger.info(`\n🔍 Querying pivot table directly...`);
	try {
		const { data: pivotData } = await query.graph({
			entity: 'product_variant_product_image',
			fields: ['id', 'variant_id', 'image_id'],
			filters: { variant_id: variantId },
		});
		logger.info(`   Pivot table entries: ${pivotData?.length || 0}`);
		for (const p of pivotData || []) {
			logger.info(`   - ${(p as any).id}: variant=${(p as any).variant_id}, image=${(p as any).image_id}`);
		}
	} catch (error: any) {
		logger.error(`   Error querying pivot: ${error.message}`);
	}

	// Also query the product to compare
	const { data: products } = await query.graph({
		entity: 'product',
		fields: ['id', 'title', 'variants.id', 'variants.images.id', 'variants.images.url', 'images.id', 'images.url'],
		filters: { id: 'prod_01K5CAVYPM5G2P144HQT4EGBVA' },
	});

	const product = products?.[0];
	if (product) {
		logger.info(`\n📦 Product: ${product.title}`);
		logger.info(`   Product-level images: ${(product as any).images?.length || 0}`);
		for (const v of (product as any).variants || []) {
			logger.info(`   Variant ${v.id} images: ${v.images?.length || 0}`);
			if (v.images?.length > 0) {
				for (const img of v.images) {
					logger.info(`     - ${img.id}: ${img.url?.substring(0, 60)}...`);
				}
			}
		}
	}

	logger.info('\n✅ Done');
}

