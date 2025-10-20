import { ProductDTO } from '@medusajs/framework/types';
import { getVariantAvailability } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import { MEILISEARCH_MODULE } from '../../modules/meilisearch';
import MeilisearchModuleService from '../../modules/meilisearch/service';
import { getDefaultSalesChannelIdFromQuery } from '../../utils/sales-channel-helper';

export type SyncProductsStepInput = {
	products: ProductDTO[];
};

export const syncProductsStep = createStep(
	'sync-products',
	async ({ products }: SyncProductsStepInput, { container }) => {
		const meilisearchModuleService = container.resolve(
			MEILISEARCH_MODULE,
		) as MeilisearchModuleService;

		// Get query service for inventory lookups
		const query = container.resolve('query');

		// Get default sales channel for inventory calculations
		const salesChannelId = await getDefaultSalesChannelIdFromQuery(query);

		// Collect all variant IDs for batch inventory lookup
		const allVariantIds: string[] = [];
		products.forEach(product => {
			if (product.variants) {
				product.variants.forEach(variant => {
					if (variant.id) {
						allVariantIds.push(variant.id);
					}
				});
			}
		});

		// Get real inventory data for all variants at once
		let inventoryMap: Record<string, number> = {};
		if (allVariantIds.length > 0) {
			try {
				console.log(
					`🔍 Getting inventory for ${allVariantIds.length} variants using sales channel: ${salesChannelId}`,
				);

				// @ts-ignore - Type conflict between @medusajs/types versions
				const availability = await getVariantAvailability(query, {
					variant_ids: allVariantIds,
					sales_channel_id: salesChannelId,
				});

				// Map variant IDs to available quantities
				inventoryMap = Object.fromEntries(
					Object.entries(availability).map(
						([variantId, data]: [string, any]) => [
							variantId,
							data.availability || 0,
						],
					),
				);

				console.log(
					`✅ Retrieved inventory for ${Object.keys(inventoryMap).length} variants`,
				);
			} catch (error) {
				console.error('❌ Error getting variant availability:', error);
				// Fallback: set all variants to 0 inventory
				allVariantIds.forEach(variantId => {
					inventoryMap[variantId] = 0;
				});
			}
		}

		// Transform products for better search functionality
		const transformedProducts = products.map(product => {
			// Debug: Log product data to see what we're getting
			if (products.indexOf(product) === 0) {
				console.log('🔍 Sample product data:', {
					id: product.id,
					title: product.title,
					categories: product.categories,
					variants: product.variants?.length,
					tags: product.tags?.length,
					sampleVariant: product.variants?.[0]
						? {
								id: product.variants[0].id,
								manage_inventory: product.variants[0].manage_inventory,
								allow_backorder: product.variants[0].allow_backorder,
								inventory_quantity: (product.variants[0] as any)
									.inventory_quantity,
								prices: (product.variants[0] as any).prices?.length,
							}
						: null,
				});
			}

			// Build category hierarchy paths
			const categoryPaths: string[] = [];
			const categoryNames: string[] = [];
			const categoryHandles: string[] = [];

			if (product.categories) {
				product.categories.forEach(category => {
					categoryNames.push(category.name);
					categoryHandles.push(category.handle);

					// Build hierarchical path
					if (category.parent_category?.name) {
						categoryPaths.push(
							`${category.parent_category.name} > ${category.name}`,
						);
					} else {
						categoryPaths.push(category.name);
					}
				});
			}

			// Calculate availability and pricing using real inventory data
			let isAvailable = false;
			let totalInventory = 0;
			let minPrice = Infinity;
			let maxPrice = 0;
			let currencies: string[] = [];
			let skus: string[] = [];

			if (product.variants && product.variants.length > 0) {
				product.variants.forEach(variant => {
					// Collect SKUs
					if (variant.sku) {
						skus.push(variant.sku);
					}

					// Check availability using real inventory data
					if (variant.id) {
						const realInventory = inventoryMap[variant.id] || 0;
						totalInventory += realInventory;

						// Product is available if:
						// 1. Backorders are allowed, OR
						// 2. Inventory is not managed, OR
						// 3. Real inventory quantity > 0
						if (
							variant.allow_backorder ||
							!variant.manage_inventory ||
							realInventory > 0
						) {
							isAvailable = true;
						}

						// If inventory management is undefined/null, check if we have real inventory
						if (
							(variant.manage_inventory === undefined ||
								variant.manage_inventory === null) &&
							realInventory > 0
						) {
							isAvailable = true;
						}
					}

					// Process pricing
					const variantPrices = (variant as any).prices;
					if (variantPrices) {
						variantPrices.forEach((price: any) => {
							const amount = price.amount || 0;
							if (amount > 0) {
								minPrice = Math.min(minPrice, amount);
								maxPrice = Math.max(maxPrice, amount);
								if (!currencies.includes(price.currency_code)) {
									currencies.push(price.currency_code);
								}
							}
						});
					}
				});
			}

			// Fallback: If we have variants but no clear availability rules, check total inventory
			if (
				product.variants &&
				product.variants.length > 0 &&
				!isAvailable &&
				totalInventory > 0
			) {
				isAvailable = true;
			}

			// Reset infinite values
			if (minPrice === Infinity) minPrice = 0;

			// Extract tag values
			const tagValues = product.tags?.map(tag => tag.value) || [];

			return {
				id: product.id,
				title: product.title,
				description: product.description,
				handle: product.handle,
				thumbnail: product.thumbnail,
				status: product.status,
				created_at: product.created_at,
				updated_at: product.updated_at,

				// Enhanced category data for faceted search
				category_names: categoryNames,
				category_handles: categoryHandles,
				category_paths: categoryPaths,
				category_ids: product.categories?.map(c => c.id) || [],

				// Availability and inventory
				is_available: isAvailable,
				total_inventory: totalInventory,
				variant_count: product.variants?.length || 0,

				// Pricing for filtering and sorting
				min_price: minPrice,
				max_price: maxPrice,
				price_range:
					minPrice !== maxPrice
						? `${minPrice}-${maxPrice}`
						: minPrice.toString(),
				currencies: currencies,

				// SKUs for search
				skus: skus,

				// Tags for filtering
				tags: tagValues,

				// Collection information
				collection_id: product.collection?.id,
				collection_title: product.collection?.title,
				collection_handle: product.collection?.handle,

				// Search-optimized fields
				searchable_text: [
					product.title,
					product.description,
					...categoryNames,
					...tagValues,
					...skus,
					product.collection?.title,
				]
					.filter(Boolean)
					.join(' '),
			};
		});

		const existingProducts = await meilisearchModuleService.retrieveFromIndex(
			products.map(product => product.id),
			'product',
		);
		const newProducts = products.filter(
			product => !existingProducts.some(p => p.id === product.id),
		);

		// Debug: Log sample transformed product
		if (transformedProducts.length > 0) {
			console.log('🔍 Sample transformed product:', {
				id: transformedProducts[0].id,
				title: transformedProducts[0].title,
				category_names: transformedProducts[0].category_names,
				category_paths: transformedProducts[0].category_paths,
				is_available: transformedProducts[0].is_available,
				total_inventory: transformedProducts[0].total_inventory,
				variant_count: transformedProducts[0].variant_count,
				min_price: transformedProducts[0].min_price,
				max_price: transformedProducts[0].max_price,
				currencies: transformedProducts[0].currencies,
				tags: transformedProducts[0].tags,
			});
		}

		await meilisearchModuleService.indexData(
			transformedProducts as unknown as Record<string, unknown>[],
			'product',
		);

		return new StepResponse(undefined, {
			newProducts: newProducts.map(product => product.id),
			existingProducts,
		});
	},
	async (input, { container }) => {
		if (!input) {
			return;
		}

		const meilisearchModuleService = container.resolve(
			MEILISEARCH_MODULE,
		) as MeilisearchModuleService;

		if (input.newProducts) {
			await meilisearchModuleService.deleteFromIndex(
				input.newProducts,
				'product',
			);
		}

		if (input.existingProducts) {
			await meilisearchModuleService.indexData(
				input.existingProducts,
				'product',
			);
		}
	},
);
