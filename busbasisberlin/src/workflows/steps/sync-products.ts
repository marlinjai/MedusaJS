import { ProductDTO } from '@medusajs/framework/types';
import { getVariantAvailability } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import { MEILISEARCH_MODULE } from '../../modules/meilisearch';
import MeilisearchModuleService from '../../modules/meilisearch/service';
import { getDefaultSalesChannelIdFromQuery } from '../../utils/sales-channel-helper';
import { calculateDeliveryDays } from '../../utils/inventory-helper';

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
		const transformedProducts = await Promise.all(
			products.map(async product => {
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
				const allCategoryNamesInPath = new Set<string>(); // To avoid duplicates
				const allCategoryIdsInPath = new Set<string>(); // All category IDs for hierarchical filtering
				const hierarchicalCategories: Record<string, string> = {}; // For HierarchicalMenu widget

				if (product.categories) {
					for (const category of product.categories) {
						// Add leaf category
						allCategoryNamesInPath.add(category.name);
						allCategoryIdsInPath.add(category.id);
						categoryHandles.push(category.handle);

						// Build complete hierarchy by recursively fetching all parent levels
						const fetchCompleteHierarchy = async (
							categoryId: string,
							currentPath: string[] = [],
							currentIds: string[] = [],
						): Promise<{ names: string[]; ids: string[] }> => {
							try {
								const { data: categoryQuery } = await query.graph({
									entity: 'product_category',
									filters: { id: categoryId },
									fields: [
										'id',
										'name',
										'handle',
										'parent_category.id',
										'parent_category.name',
										'parent_category.handle',
									],
									pagination: { take: 1 },
								});

								if (categoryQuery.length === 0) {
									return { names: currentPath, ids: currentIds };
								}

								const categoryData = categoryQuery[0];
								const newPath = [categoryData.name, ...currentPath];
								const newIds = [categoryData.id, ...currentIds];

								// If this category has a parent, recursively fetch it
								if (categoryData.parent_category?.id) {
									return await fetchCompleteHierarchy(
										categoryData.parent_category.id,
										newPath,
										newIds,
									);
								}

								// This is the root category
								return { names: newPath, ids: newIds };
							} catch (error) {
								console.error(
									`Error fetching hierarchy for category ${categoryId}:`,
									error,
								);
								return { names: currentPath, ids: currentIds };
							}
						};

						// Build complete hierarchy (names and IDs)
						const { names: completePath, ids: completeIds } =
							await fetchCompleteHierarchy(category.id);
						const fullPath = completePath.join(' > ');

						// Build Meilisearch-style hierarchical categories (lvl0, lvl1, etc.)
						// This enables using the HierarchicalMenu widget from InstantSearch
						completePath.forEach((cat, index) => {
							const levelKey = `lvl${index}`;
							const levelPath = completePath.slice(0, index + 1).join(' > ');
							hierarchicalCategories[levelKey] = levelPath;
						});

						// Add ALL categories in the path to category_names
						// This enables hierarchical filtering: selecting "Mercedes Benz" will match
						// products in "Mercedes Benz > Motor > Dichtungen"
						completePath.forEach(categoryNameInPath => {
							allCategoryNamesInPath.add(categoryNameInPath);
						});

						// Add ALL category IDs in the path for hierarchical filtering
						completeIds.forEach(categoryIdInPath => {
							allCategoryIdsInPath.add(categoryIdInPath);
						});

						categoryPaths.push(fullPath);

						// Debug: Log first category to verify depth
						const productIndex = products.indexOf(product);
						if (productIndex === 0) {
							console.log('🔍 Category hierarchy depth:', {
								categoryName: category.name,
								path: fullPath,
								segments: completePath.length,
								depth: completePath.length - 1,
							});
						}
					}
				}

				// Convert Sets to Arrays for category_names and category_ids
				categoryNames.push(...Array.from(allCategoryNamesInPath));
				const categoryIds = Array.from(allCategoryIdsInPath);

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

				// Extract sales channel information - consolidated as JSON
				const salesChannels = (product as any).sales_channels || [];
				const salesChannelsJSON = salesChannels.map((sc: any) => ({
					id: sc.id,
					name: sc.name || sc.id,
				}));
				const primarySalesChannel =
					salesChannels.length > 0
						? {
								id: salesChannels[0].id,
								name: salesChannels[0].name || salesChannels[0].id,
							}
						: { id: 'default', name: 'Default Sales Channel' };

				return {
					objectID: product.id, // Required by Meilisearch
					id: product.id,
					title: product.title,
					description: product.description,
					handle: product.handle,
					thumbnail: product.thumbnail,
					images: product.images?.map((img: any) => img.url) || [],
					status: product.status,
					created_at: product.created_at,
					updated_at: product.updated_at,

					// Category data - only what we need
					category_ids: categoryIds, // All category IDs for filtering
					hierarchical_categories: hierarchicalCategories, // For HierarchicalMenu widget

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

				// Sales channel information - consolidated as JSON
				sales_channels: salesChannelsJSON,
				primary_sales_channel: primarySalesChannel,

				// Shipping profile information
				shipping_profile_id: (product as any).shipping_profile?.id || null,
				shipping_profile_name: (product as any).shipping_profile?.name || null,
				shipping_profile_type: (product as any).shipping_profile?.type || null,
				has_extended_delivery:
					(product as any).shipping_profile?.name
						?.toLowerCase()
						.includes('längere lieferzeit') || false,
				estimated_delivery_days: calculateDeliveryDays(
					(product as any).shipping_profile,
				),

				// Search-optimized fields
				searchable_text: [
					product.title,
					product.description,
					// Extract category names from hierarchical_categories for search
					...Object.values(hierarchicalCategories),
					...tagValues,
					...skus,
					product.collection?.title,
				]
					.filter(Boolean)
					.join(' '),
			};
			}),
		);

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
				category_ids: (transformedProducts[0] as any).category_ids,
				hierarchical_categories: (transformedProducts[0] as any)
					.hierarchical_categories,
				sales_channels: (transformedProducts[0] as any).sales_channels,
				primary_sales_channel: (transformedProducts[0] as any)
					.primary_sales_channel,
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
