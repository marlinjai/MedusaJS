/**
 * assign-default-shipping-profile.ts
 * Assigns the default shipping profile to all products that don't have one
 * Run with: npx medusa exec ./src/scripts/assign-default-shipping-profile.ts
 */
import { ExecArgs } from '@medusajs/framework/types';
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';

export default async function assignDefaultShippingProfile({
	container,
}: ExecArgs) {
	const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
	const query = container.resolve(ContainerRegistrationKeys.QUERY);
	const link = container.resolve(ContainerRegistrationKeys.LINK);
	const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);

	try {
		logger.info('🔍 Finding default shipping profile...');

		// Find default shipping profile
		const shippingProfiles =
			await fulfillmentModuleService.listShippingProfiles({
				type: 'default',
			});

		if (shippingProfiles.length === 0) {
			logger.error(
				'❌ No default shipping profile found! Please create one in the admin panel first.',
			);
			return;
		}

		const defaultShippingProfile = shippingProfiles[0];
		logger.info(
			`✅ Found default shipping profile: ${defaultShippingProfile.name} (${defaultShippingProfile.id})`,
		);

		// Find all products without shipping profile using query.graph
		// This ensures we get accurate shipping_profile relation data
		logger.info('🔍 Finding products without shipping profile...');

		const { data: allProducts } = await query.graph({
			entity: 'product',
			fields: ['id', 'title', 'handle', 'shipping_profile.id'],
		});

		// Filter products that truly don't have a shipping profile
		// Check both shipping_profile_id and shipping_profile relation
		const productsWithoutProfile = (allProducts || []).filter(
			(product: any) =>
				!product.shipping_profile?.id &&
				(!product.shipping_profile_id || product.shipping_profile_id === ''),
		);

		if (!productsWithoutProfile || productsWithoutProfile.length === 0) {
			logger.info('✅ All products already have a shipping profile assigned!');
			return;
		}

		logger.info(
			`📦 Found ${productsWithoutProfile.length} products without shipping profile`,
		);

		// Update products in batches
		const BATCH_SIZE = 50;
		let updatedCount = 0;
		let failedCount = 0;

		for (let i = 0; i < productsWithoutProfile.length; i += BATCH_SIZE) {
			const batch = productsWithoutProfile.slice(i, i + BATCH_SIZE);

			logger.info(
				`🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(productsWithoutProfile.length / BATCH_SIZE)} (${batch.length} products)...`,
			);

			// Link shipping profile to each product in the batch
			await Promise.allSettled(
				batch.map(async (product: any) => {
					// Double-check: Skip if product already has a shipping profile
					// This prevents attempting to link when a profile already exists
					if (product.shipping_profile?.id) {
						logger.info(
							`  ⏭️  Skipped (already has profile): ${product.title || product.handle || product.id}`,
						);
						return;
					}

					try {
						// Use Link API to link shipping profile to product
						await link.create({
							[Modules.PRODUCT]: { product_id: product.id },
							[Modules.FULFILLMENT]: {
								shipping_profile_id: defaultShippingProfile.id,
							},
						});
						updatedCount++;
						logger.info(
							`  ✅ Linked shipping profile to: ${product.title || product.handle || product.id}`,
						);
					} catch (error: any) {
						// If link already exists, that's fine - count as success
						if (
							error.message?.includes('already exists') ||
							error.message?.includes('duplicate')
						) {
							updatedCount++;
							logger.info(
								`  ℹ️  Already linked: ${product.title || product.handle || product.id}`,
							);
						} else {
							failedCount++;
							logger.error(
								`  ❌ Failed to link shipping profile to ${product.title || product.handle || product.id}: ${error.message}`,
							);
						}
					}
				}),
			);
		}

		logger.info('');
		logger.info('📊 Summary:');
		logger.info(`  ✅ Successfully updated: ${updatedCount} products`);
		if (failedCount > 0) {
			logger.warn(`  ❌ Failed to update: ${failedCount} products`);
		}
		logger.info(
			`  📦 Default shipping profile: ${defaultShippingProfile.name}`,
		);
		logger.info('');
		logger.info('✅ Script completed!');
	} catch (error: any) {
		logger.error(`❌ Script failed: ${error.message}`);
		logger.error(error.stack);
		throw error;
	}
}
