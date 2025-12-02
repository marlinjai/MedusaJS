// src/scripts/test-category-sync.ts
// Test script to verify category sync is working correctly

import { MedusaApp } from '@medusajs/framework';
import { syncCategoriesWorkflow } from '../workflows/sync-categories';

async function testCategorySync() {
	console.log('🧪 [TEST] Starting category sync test...');

	// Initialize Medusa app
	const { container } = await MedusaApp({
		directory: process.cwd(),
	});

	const logger = container.resolve('logger');
	const query = container.resolve('query');

	try {
		// First, let's check the current state of the Beleuchtung category
		console.log('🔍 [TEST] Checking current category state...');

		const { data: beleuchtungCategories } = await query.graph({
			entity: 'product_category',
			fields: [
				'id',
				'name',
				'handle',
				'is_active',
				'is_internal',
				'parent_category_id',
				'category_children.id',
				'category_children.name',
				'category_children.handle'
			],
			filters: {
				name: 'Beleuchtung'
			}
		});

		if (beleuchtungCategories.length > 0) {
			const category = beleuchtungCategories[0];
			console.log('📂 [TEST] Beleuchtung category found:', {
				id: category.id,
				name: category.name,
				handle: category.handle,
				is_active: category.is_active,
				is_internal: category.is_internal,
				children_count: category.category_children?.length || 0,
				children_names: category.category_children?.map((c: any) => c.name) || []
			});

			// Check products in subcategories
			console.log('🔍 [TEST] Checking products in subcategories...');
			for (const child of category.category_children || []) {
				const { data: productsInChild } = await query.graph({
					entity: 'product',
					fields: ['id', 'title', 'sales_channels.id', 'sales_channels.name'],
					filters: {
						categories: { id: child.id }
					},
					pagination: { take: 5, skip: 0 }
				});

				console.log(`  📦 ${child.name}: ${productsInChild.length} products`);
				if (productsInChild.length > 0) {
					console.log(`    Sample: ${productsInChild[0].title}`);
					console.log(`    Sales channels: ${productsInChild[0].sales_channels?.map((sc: any) => sc.name).join(', ') || 'None'}`);
				}
			}
		}

		// Run the category sync
		console.log('🔄 [TEST] Running category sync workflow...');

		const { result } = await syncCategoriesWorkflow(container).run({
			input: {
				limit: 1000,
				offset: 0
			}
		});

		console.log(`✅ [TEST] Category sync completed! Synced ${result.categories?.length || 0} categories`);

		// Check Meilisearch index
		console.log('🔍 [TEST] Checking Meilisearch category index...');
		const meilisearchService = container.resolve('meilisearchModuleService');

		if (meilisearchService) {
			const searchResults = await meilisearchService.searchWithFacets(
				'Beleuchtung',
				{
					filters: [],
					facets: ['is_active', 'has_public_products'],
					limit: 20
				},
				'category'
			);

			console.log('🔍 [TEST] Meilisearch results for "Beleuchtung":', {
				totalHits: searchResults.estimatedTotalHits,
				categories: searchResults.hits.map((hit: any) => ({
					name: hit.name,
					has_public_products: hit.has_public_products,
					is_active: hit.is_active,
					parent_category_name: hit.parent_category_name
				}))
			});
		}

		console.log('✅ [TEST] Category sync test completed successfully!');
	} catch (error) {
		console.error('❌ [TEST] Category sync test failed:', error);
		throw error;
	}
}

// Run the test if this script is executed directly
if (require.main === module) {
	testCategorySync()
		.then(() => {
			console.log('🎉 Test completed successfully!');
			process.exit(0);
		})
		.catch((error) => {
			console.error('💥 Test failed:', error);
			process.exit(1);
		});
}

export { testCategorySync };
