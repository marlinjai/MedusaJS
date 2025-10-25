// src/scripts/fix-product-handles.ts
// Script to generate SEO-friendly handles from product titles

import { MedusaContainer } from '@medusajs/framework/types';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

/**
 * Generate SEO-friendly URL handle from product title
 */
function generateHandle(title: string): string {
	return (
		title
			.toLowerCase()
			// German umlauts
			.replace(/ä/g, 'ae')
			.replace(/ö/g, 'oe')
			.replace(/ü/g, 'ue')
			.replace(/ß/g, 'ss')
			// Remove parentheses and content
			.replace(/\([^)]*\)/g, '')
			// Replace non-alphanumeric with hyphens
			.replace(/[^a-z0-9]+/g, '-')
			// Remove leading/trailing hyphens
			.replace(/^-+|-+$/g, '')
			// Collapse multiple hyphens
			.replace(/-+/g, '-')
			// Limit length to 60 characters
			.substring(0, 60)
			.replace(/-+$/, '')
	);
}

/**
 * Check if handle already exists (to avoid duplicates)
 */
async function isHandleUnique(
	container: MedusaContainer,
	handle: string,
	excludeId?: string,
): Promise<boolean> {
	const query = container.resolve(ContainerRegistrationKeys.QUERY);

	const { data: existingProducts } = await query.graph({
		entity: 'product',
		filters: { handle },
		fields: ['id'],
	});

	if (!existingProducts || existingProducts.length === 0) {
		return true;
	}

	// If product exists but it's the one we're updating, that's fine
	if (excludeId && existingProducts[0].id === excludeId) {
		return true;
	}

	return false;
}

/**
 * Make handle unique by appending number
 */
async function makeHandleUnique(
	container: MedusaContainer,
	baseHandle: string,
	productId: string,
): Promise<string> {
	let handle = baseHandle;
	let counter = 1;

	while (!(await isHandleUnique(container, handle, productId))) {
		handle = `${baseHandle}-${counter}`;
		counter++;
	}

	return handle;
}

/**
 * Main script execution
 */
export default async function fixProductHandles({
	container,
}: {
	container: MedusaContainer;
}) {
	console.log('🔧 Starting product handle fix...\n');

	const query = container.resolve(ContainerRegistrationKeys.QUERY);
	const productModuleService = container.resolve('product');

	try {
		// Get all products
		const { data: allProducts } = await query.graph({
			entity: 'product',
			fields: ['id', 'title', 'handle', 'status'],
		});

		if (!allProducts || allProducts.length === 0) {
			console.log('❌ No products found');
			return;
		}

		console.log(`📦 Found ${allProducts.length} products\n`);

		let updatedCount = 0;
		let skippedCount = 0;
		const updates: Array<{ id: string; old: string; new: string }> = [];

		// Process each product
		for (const product of allProducts) {
			const currentHandle = product.handle;
			const generatedHandle = generateHandle(product.title);

			// Skip if handle is already SEO-friendly (contains letters, not just numbers/codes)
			const isAlreadyGood =
				currentHandle &&
				currentHandle.length > 10 &&
				/[a-z]{3,}/.test(currentHandle) &&
				!/^[a-z0-9-]{1,5}$/.test(currentHandle);

			if (isAlreadyGood) {
				console.log(
					`✅ Skipping "${product.title}" - handle already good: ${currentHandle}`,
				);
				skippedCount++;
				continue;
			}

			// Make sure handle is unique
			const uniqueHandle = await makeHandleUnique(
				container,
				generatedHandle,
				product.id,
			);

			// Update product
			try {
				await productModuleService.updateProducts(product.id, {
					handle: uniqueHandle,
				});

				updates.push({
					id: product.id,
					old: currentHandle,
					new: uniqueHandle,
				});

				console.log(`✅ Updated: "${product.title}"`);
				console.log(`   Old: ${currentHandle} → New: ${uniqueHandle}\n`);

				updatedCount++;
			} catch (error) {
				console.error(
					`❌ Failed to update product ${product.id}: ${error.message}`,
				);
			}
		}

		// Summary
		console.log('\n' + '='.repeat(60));
		console.log('📊 Summary:');
		console.log(`   Total products: ${allProducts.length}`);
		console.log(`   ✅ Updated: ${updatedCount}`);
		console.log(`   ⏭️  Skipped: ${skippedCount}`);
		console.log('='.repeat(60) + '\n');

		// Show all updates
		if (updates.length > 0) {
			console.log('📝 All changes:');
			updates.forEach(({ old, new: newHandle }, index) => {
				console.log(`${index + 1}. ${old} → ${newHandle}`);
			});
		}

		console.log('\n✅ Product handle fix complete!');
		console.log('⚠️  Next step: Re-sync Meilisearch to update search index\n');
	} catch (error) {
		console.error('❌ Error fixing product handles:', error);
		throw error;
	}
}
