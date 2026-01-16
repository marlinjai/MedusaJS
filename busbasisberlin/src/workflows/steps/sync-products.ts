import { ProductDTO } from '@medusajs/framework/types';
import { getVariantAvailability } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import { MEILISEARCH_MODULE } from '../../modules/meilisearch';
import MeilisearchModuleService from '../../modules/meilisearch/service';
import { calculateDeliveryDays } from '../../utils/inventory-helper';
import { getDefaultSalesChannelIdFromQuery, getInternalOperationsSalesChannelId } from '../../utils/sales-channel-helper';

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

		// Get internal operations sales channel for filtering
		const internalSalesChannelId = await getInternalOperationsSalesChannelId(query);

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

		// Helper function to generate word parts for substring matching
		// This enables finding "nippel" when searching for products like "schmiernippel"
		const generateWordParts = (text: string): string[] => {
			if (!text) return [];
			const parts: string[] = [];
			const lowerText = text.toLowerCase();

			// Add the full text
			parts.push(text);

			// Split on common separators (space, dash, underscore)
			const separated = text.split(/[\s\-_]+/);
			parts.push(...separated);

			// For German compound words, try splitting at common word boundaries
			// Common prefixes/suffixes in German technical terms (extracted from product data)
			const commonPrefixes = [
				// Materials
				'schmier',
				'dicht',
				'kupfer',
				'stahl',
				'gummi',
				'metall',
				// Parts/components
				'kugel',
				'zylinder',
				'ventil',
				'adapter',
				'nippel',
				'ring',
				'schraube',
				'mutter',
				'scheibe',
				'buchse',
				'stecker',
				'geber',
				'schalter',
				'lager',
				'pumpe',
				// Vehicle parts
				'wasser',
				'öl',
				'bremse',
				'kupplung',
				'feder',
				'blatt',
				'stabilisator',
				'kolben',
				'rad',
				'achse',
				'vorder',
				'hinter',
				'seiten',
				// Actions/descriptions
				'reparatur',
				'end',
				'heck',
				'haupt',
				'nebel',
				'rück',
				'blink',
				'kennzeichen',
				'anlasser',
				'licht',
				'scheinwerfer',
				'streu',
				'reflektor',
				'windschutz',
				'front',
				'kotflügel',
				'spurstange',
				'achsschenkel',
				'radlauf',
				'innenradlauf',
				'ausgleich',
				'druckplatte',
				'stütz',
				'schale',
				'simmering',
				'konus',
				'nieten',
				'gewinde',
				'bohrung',
				'anhänger',
				'blech',
				'leuchte',
				'schlauch',
				'hydraulik',
				'druck',
			];

			for (const prefix of commonPrefixes) {
				if (lowerText.startsWith(prefix) && text.length > prefix.length) {
					parts.push(prefix, text.substring(prefix.length));
				}
				// Also check if the word contains the prefix anywhere
				const index = lowerText.indexOf(prefix);
				if (index > 0 && index < lowerText.length - prefix.length) {
					parts.push(prefix, text.substring(index + prefix.length));
				}
			}

			// Remove duplicates and filter out very short parts
			return [...new Set(parts)].filter(p => p && p.length > 2);
		};

		// Transform products for better search functionality
		const transformedProducts = await Promise.all(
			products.map(async product => {
				// Debug: Log product data for Beleuchtung-related products
				const isRelevantProduct = product.title?.includes('Innenleuchte') ||
					product.categories?.some(cat => cat.name?.includes('Beleuchtung') || cat.name?.includes('leuchte'));

				if (products.indexOf(product) === 0 || isRelevantProduct) {
					console.log('🔍 [PRODUCT-SYNC] Product data:', {
						id: product.id,
						title: product.title,
						categories: product.categories?.map(cat => ({ id: cat.id, name: cat.name })) || [],
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
									console.warn(`[PRODUCT-SYNC] Category ${categoryId} not found in hierarchy fetch`);
									return { names: currentPath, ids: currentIds };
								}

								const categoryData = categoryQuery[0];
								const newPath = [categoryData.name, ...currentPath];
								const newIds = [categoryData.id, ...currentIds];

								// Debug logging for Beleuchtung hierarchy
								if (categoryData.name?.includes('Beleuchtung') || categoryData.name?.includes('leuchte')) {
									console.log(`🔍 [PRODUCT-SYNC] Building hierarchy for ${categoryData.name}:`, {
										categoryId: categoryData.id,
										currentPath: newPath,
										hasParent: !!categoryData.parent_category?.id,
										parentId: categoryData.parent_category?.id,
										parentName: categoryData.parent_category?.name,
									});
								}

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
									`[PRODUCT-SYNC] Error fetching hierarchy for category ${categoryId}:`,
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

						// Debug: Log category hierarchy for Beleuchtung-related products
						const productIndex = products.indexOf(product);
						if (productIndex === 0 || fullPath.includes('Beleuchtung') || category.name.includes('Beleuchtung')) {
							console.log('🔍 [PRODUCT-SYNC] Category hierarchy:', {
								productTitle: product.title,
								categoryName: category.name,
								categoryId: category.id,
								fullPath: fullPath,
								completePath: completePath,
								completeIds: completeIds,
								segments: completePath.length,
								hierarchicalCategories: hierarchicalCategories,
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

				// Check if product is internal-only (belongs only to internal operations sales channel)
				const hasDefaultChannel = salesChannels.some((sc: any) => sc.id === salesChannelId);
				const hasInternalChannel = internalSalesChannelId &&
					salesChannels.some((sc: any) => sc.id === internalSalesChannelId);

				// Product is internal-only if it has internal channel but NO default channel
				const isInternalOnly = hasInternalChannel && !hasDefaultChannel;

				// Generate word parts for substring matching (e.g., "schmiernippel" -> "schmier nippel")
				// This enables finding "nippel" when searching for products like "schmiernippel"
				const titleParts = generateWordParts(product.title || '');
				const descriptionParts = product.description
					? generateWordParts(product.description)
					: [];
				const skuParts = skus.flatMap(sku => generateWordParts(sku));

				// Auto-set thumbnail from first image if not present
				const imageUrls = product.images?.map((img: any) => img.url) || [];
				const thumbnailUrl = product.thumbnail || imageUrls[0] || null;

			return {
				objectID: product.id, // Required by Meilisearch
				id: product.id,
				title: product.title,
				subtitle: product.subtitle || null,
				description: product.description,
				handle: product.handle,
				thumbnail: thumbnailUrl,
				images: imageUrls,
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
				// Favorite status: check metadata first, fallback to collection
				is_favoriten:
					(product as any).metadata?.is_favorite === true ||
					product.collection?.handle === 'favoriten',
				// Favorite rank for ordering favorites (lower = higher priority)
				favorite_rank: (product as any).metadata?.favorite_rank ?? 999,

				// Sales channel information - consolidated as JSON
					sales_channels: salesChannelsJSON,
					primary_sales_channel: primarySalesChannel,

					// Internal operations filtering
					is_internal_only: isInternalOnly,

					// Shipping profile information
					shipping_profile_id: (product as any).shipping_profile?.id || null,
					shipping_profile_name:
						(product as any).shipping_profile?.name || null,
					shipping_profile_type:
						(product as any).shipping_profile?.type || null,
					has_extended_delivery:
						(product as any).shipping_profile?.name
							?.toLowerCase()
							.includes('längere lieferzeit') || false,
					estimated_delivery_days: calculateDeliveryDays(
						(product as any).shipping_profile,
					),

				// Search-optimized fields
				// Include word parts for substring matching (e.g., "schmiernippel" -> "schmier nippel")
				// This enables finding "nippel" when searching for products like "schmiernippel"
				searchable_text: [
					product.title,
					...titleParts,
					product.subtitle,
					product.description,
					...descriptionParts,
					// Extract category names from hierarchical_categories for search
					...Object.values(hierarchicalCategories),
					...tagValues,
					...skus,
					...skuParts,
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

		// Debug: Log sample transformed product and Beleuchtung products
		const sampleProduct = transformedProducts[0];
		const beleuchtungProducts = transformedProducts.filter(p =>
			p.title?.includes('Innenleuchte') ||
			(p as any).category_names?.some((name: string) => name?.includes('Beleuchtung') || name?.includes('leuchte'))
		);

		if (sampleProduct) {
			console.log('🔍 [PRODUCT-SYNC] Sample transformed product:', {
				id: sampleProduct.id,
				title: sampleProduct.title,
				category_ids: (sampleProduct as any).category_ids,
				category_names: (sampleProduct as any).category_names,
				hierarchical_categories: (sampleProduct as any).hierarchical_categories,
			});
		}

		if (beleuchtungProducts.length > 0) {
			console.log(`🔍 [PRODUCT-SYNC] Found ${beleuchtungProducts.length} Beleuchtung-related products`);
			beleuchtungProducts.slice(0, 3).forEach((product, index) => {
				console.log(`🔍 [PRODUCT-SYNC] Beleuchtung product ${index + 1}:`, {
					id: product.id,
					title: product.title,
					category_names: (product as any).category_names,
					hierarchical_categories: (product as any).hierarchical_categories,
				});
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
