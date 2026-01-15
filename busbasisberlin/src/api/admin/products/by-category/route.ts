// busbasisberlin/src/api/admin/products/by-category/route.ts
// Admin API route to fetch products filtered by category, collection, sales channel, shipping profile

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import {
	ContainerRegistrationKeys,
	getVariantAvailability,
} from '@medusajs/framework/utils';
import { getDefaultSalesChannelIdFromQuery } from '../../../../utils/sales-channel-helper';
import {
	getAllDescendantCategoryIds,
	type CategoryNode,
} from '../../product-categories/utils';

export const GET = async (
	req: MedusaRequest,
	res: MedusaResponse,
): Promise<void> => {
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	try {
		const {
			category_id,
			collection_id,
			sales_channel_id,
			shipping_profile_id,
			sku,
			q,
			limit = '50',
			offset = '0',
			status,
		} = req.query;

		// Get query module
		const query = req.scope.resolve('query');

		// Build filters
		const filters: any = {};
		let hasFilters = false;
		// Track if we need to use query.index() for linked entity filtering
		let needsIndexQuery = false;

		// Category filter - expand to include all descendants
		if (category_id) {
			hasFilters = true;
			// Fetch category tree to get descendants
			const categoriesResult = await query.graph({
				entity: 'product_category',
				fields: ['id', 'name', 'handle', 'parent_category_id'],
				pagination: {
					take: 10000,
					skip: 0,
				},
			});

			const categories = categoriesResult?.data || [];

			// Build tree structure
			const categoryMap = new Map<string, CategoryNode>();
			const rootCategories: CategoryNode[] = [];

			// First pass: create all nodes
			categories.forEach((cat: any) => {
				categoryMap.set(cat.id, {
					id: cat.id,
					name: cat.name,
					handle: cat.handle,
					parent_category_id: cat.parent_category_id || null,
					children: [],
				});
			});

			// Second pass: build parent-child relationships
			categories.forEach((cat: any) => {
				const node = categoryMap.get(cat.id);
				if (!node) return;

				if (cat.parent_category_id) {
					const parent = categoryMap.get(cat.parent_category_id);
					if (parent) {
						parent.children.push(node);
					} else {
						rootCategories.push(node);
					}
				} else {
					rootCategories.push(node);
				}
			});

			// Expand category IDs to include all descendants
			const categoryIds = Array.isArray(category_id)
				? (category_id as string[])
				: [category_id as string];

			logger.info(
				`[PRODUCTS-BY-CATEGORY] Selected category IDs: ${JSON.stringify(categoryIds)}`,
			);

			const expandedCategoryIds = new Set<string>();
			categoryIds.forEach(id => {
				const descendants = getAllDescendantCategoryIds(id, rootCategories);
				logger.info(
					`[PRODUCTS-BY-CATEGORY] Category ${id} descendants: ${JSON.stringify(descendants)}`,
				);
				descendants.forEach(descId => expandedCategoryIds.add(descId));
			});

			const finalCategoryIds = Array.from(expandedCategoryIds);
			logger.info(
				`[PRODUCTS-BY-CATEGORY] Final expanded category IDs: ${JSON.stringify(finalCategoryIds)}`,
			);

			filters.categories = {
				id: finalCategoryIds,
			};
		}

		// Collection filter
		if (collection_id) {
			hasFilters = true;
			filters.collection_id = Array.isArray(collection_id)
				? (collection_id as string[])
				: collection_id;
		}

		// Shipping profile filter - use client-side filtering since it's not indexed
		// We'll filter after fetching the products
		const shippingProfileIds = shipping_profile_id
			? Array.isArray(shipping_profile_id)
				? (shipping_profile_id as string[])
				: [shipping_profile_id as string]
			: null;

		// Sales channel filter - requires Index Module (query.index)
		if (sales_channel_id) {
			hasFilters = true;
			needsIndexQuery = true;
			const channelIds = Array.isArray(sales_channel_id)
				? (sales_channel_id as string[])
				: [sales_channel_id as string];
			filters.sales_channels = {
				id: channelIds,
			};
		}

		// Status filter
		if (status) {
			hasFilters = true;
			filters.status = status as string;
		}

		// Text search (for title, handle, etc.)
		if (q) {
			hasFilters = true;
			filters.q = q as string;
		}

		// SKU filter - pre-query variants to get product IDs BEFORE pagination
		// This ensures SKU search works across ALL products, not just the paginated subset
		let skuMatchedProductIds: string[] | null = null;
		if (sku) {
			hasFilters = true;
			const skuFilter = (sku as string).toLowerCase();
			logger.info(
				`[PRODUCTS-BY-CATEGORY] Pre-querying variants for SKU filter: "${skuFilter}"`,
			);

			// Query all variants to find those matching the SKU pattern
			const variantsResult = await query.graph({
				entity: 'product_variant',
				fields: ['id', 'product_id', 'sku'],
				filters: {},
				pagination: {
					take: 10000,
					skip: 0,
				},
			});

			const allVariants = variantsResult?.data || [];
			logger.info(
				`[PRODUCTS-BY-CATEGORY] Found ${allVariants.length} total variants`,
			);

			// Filter variants by SKU pattern (case-insensitive partial match)
			const matchingVariants = allVariants.filter((v: any) =>
				v.sku?.toLowerCase().includes(skuFilter),
			);
			logger.info(
				`[PRODUCTS-BY-CATEGORY] Found ${matchingVariants.length} variants matching SKU "${skuFilter}"`,
			);

			// Extract unique product IDs from matching variants
			skuMatchedProductIds = [
				...new Set(matchingVariants.map((v: any) => v.product_id)),
			] as string[];
			logger.info(
				`[PRODUCTS-BY-CATEGORY] SKU filter matched ${skuMatchedProductIds.length} products`,
			);

			// If no products match the SKU, return empty result early
			if (skuMatchedProductIds.length === 0) {
				logger.info(
					`[PRODUCTS-BY-CATEGORY] No products match SKU filter, returning empty`,
				);
				res.json({
					products: [],
					count: 0,
					total: 0,
				});
				return;
			}

			// Add product IDs to filters so they're included in the main query
			filters.id = skuMatchedProductIds;
		}

		const queryFilters = hasFilters ? filters : {};

		logger.info(
			`[PRODUCTS-BY-CATEGORY] Querying products with filters: ${JSON.stringify(queryFilters)}, limit: ${limit}, offset: ${offset}, useIndex: ${needsIndexQuery}`,
		);

		// Define fields to retrieve
		// NOTE: Use wildcards for variants and prices to properly load nested relations
		// Specific fields like 'variants.prices.amount' don't work in Medusa V2
		const productFields = [
			'id',
			'title',
			'handle',
			'status',
			'created_at',
			'updated_at',
			'thumbnail',
			'images.id',
			'images.url',
			'categories.id',
			'categories.name',
			'collection.id',
			'collection.title',
			'shipping_profile.id',
			'shipping_profile.name',
			'shipping_profile.type',
			'sales_channels.id',
			'sales_channels.name',
			'variants.*', // Use wildcard for all variant fields including prices relation
			'variants.prices.*', // Expand price objects within variants
			'tags.id',
			'tags.value',
		];

		let productsResult: any;

		// Use query.index() for linked entity filtering (sales_channels, shipping_profile)
		// Use query.graph() for simple queries without linked entity filters
		if (needsIndexQuery) {
			// Index Module enables filtering by linked entities
			productsResult = await query.index({
				entity: 'product',
				fields: productFields,
				filters: queryFilters,
				pagination: {
					take: parseInt(limit as string),
					skip: parseInt(offset as string),
				},
			});
		} else {
			// Standard query for non-linked entity filters
			productsResult = await query.graph({
				entity: 'product',
				fields: productFields,
				filters: queryFilters,
				pagination: {
					take: parseInt(limit as string),
					skip: parseInt(offset as string),
				},
			});
		}

		let products = productsResult?.data || [];

		// Filter by shipping profile if provided (client-side filter since not indexed)
		if (shippingProfileIds && shippingProfileIds.length > 0) {
			logger.info(
				`[PRODUCTS-BY-CATEGORY] Client-side filtering by shipping profile: ${JSON.stringify(shippingProfileIds)}`,
			);
			products = products.filter((product: any) =>
				shippingProfileIds.includes(product.shipping_profile?.id),
			);
		}

		// NOTE: SKU filtering is now done BEFORE the main query via pre-querying variants
		// The matching product IDs are added to filters.id, so no client-side filtering needed here

		// Log price data for first product to debug
		if (products.length > 0 && products[0].variants?.length > 0) {
			const firstVariant = products[0].variants[0];
			logger.info(
				`[PRODUCTS-BY-CATEGORY] Price debug - Product: ${products[0].title}, Variant: ${firstVariant.title}, SKU: ${firstVariant.sku}`,
			);
			logger.info(
				`[PRODUCTS-BY-CATEGORY] Price debug - Prices array: ${JSON.stringify(firstVariant.prices)}`,
			);
			logger.info(
				`[PRODUCTS-BY-CATEGORY] Price debug - Prices count: ${firstVariant.prices?.length || 0}`,
			);
		}

		// Fetch inventory data for all variants
		const allVariantIds = products.flatMap((p: any) =>
			p.variants ? p.variants.map((v: any) => v.id) : [],
		);
		let inventoryMap: Record<string, number> = {};

		if (allVariantIds.length > 0) {
			try {
				// Use sales_channel_id if provided, otherwise get default
				let channelId = sales_channel_id as string | undefined;
				if (!channelId) {
					channelId = await getDefaultSalesChannelIdFromQuery(query);
					logger.info(
						`[PRODUCTS-BY-CATEGORY] Using default sales channel: ${channelId}`,
					);
				}

				// @ts-ignore - Type conflict between @medusajs/types versions
				const availability = await getVariantAvailability(query, {
					variant_ids: allVariantIds,
					sales_channel_id: channelId,
				});

				inventoryMap = Object.fromEntries(
					Object.entries(availability).map(
						([variantId, data]: [string, any]) => [
							variantId,
							data.availability || 0,
						],
					),
				);

				logger.info(
					`[PRODUCTS-BY-CATEGORY] Fetched inventory for ${allVariantIds.length} variants`,
				);
			} catch (error) {
				logger.error(
					`[PRODUCTS-BY-CATEGORY] Error getting variant availability: ${error instanceof Error ? error.message : String(error)}`,
				);
				// Fallback: set all variants to 0 inventory
				allVariantIds.forEach((variantId: string) => {
					inventoryMap[variantId] = 0;
				});
			}
		}

		// Add inventory_quantity to each variant
		products = products.map((product: any) => ({
			...product,
			variants: product.variants?.map((variant: any) => ({
				...variant,
				inventory_quantity: inventoryMap[variant.id] ?? 0,
			})),
		}));

		// Get total count for pagination
		let total: number;
		if (skuMatchedProductIds) {
			// SKU filter: we already know the total from pre-querying variants
			// The skuMatchedProductIds array contains all matching product IDs
			total = skuMatchedProductIds.length;
			logger.info(`[PRODUCTS-BY-CATEGORY] Total from SKU pre-query: ${total}`);
		} else if (shippingProfileIds) {
			// For shipping profile filtering, we still need to load and filter client-side
			const countResult = needsIndexQuery
				? await query.index({
						entity: 'product',
						fields: ['id', 'shipping_profile.id'],
						filters: queryFilters,
						pagination: {
							take: 10000,
							skip: 0,
						},
					})
				: await query.graph({
						entity: 'product',
						fields: ['id', 'shipping_profile.id'],
						filters: queryFilters,
						pagination: {
							take: 10000,
							skip: 0,
						},
					});

			let allProducts = countResult?.data || [];

			// Apply shipping profile filter if provided
			if (shippingProfileIds && shippingProfileIds.length > 0) {
				allProducts = allProducts.filter((product: any) =>
					shippingProfileIds.includes(product.shipping_profile?.id),
				) as any;
			}

			total = allProducts.length;
		} else {
			// Use estimate_count from index query if available, otherwise count manually
			if (needsIndexQuery && productsResult?.metadata?.estimate_count != null) {
				total = productsResult.metadata.estimate_count;
			} else {
				const totalCountResult = needsIndexQuery
					? await query.index({
							entity: 'product',
							fields: ['id'],
							filters: queryFilters,
						})
					: await query.graph({
							entity: 'product',
							fields: ['id'],
							filters: queryFilters,
						});
				const totalCount = totalCountResult?.data || [];
				total = Array.isArray(totalCount) ? totalCount.length : 0;
			}
		}

		logger.info(
			`[PRODUCTS-BY-CATEGORY] Found ${products.length} products, total: ${total}`,
		);

		res.json({
			products: products,
			count: products.length,
			total: total,
		});
	} catch (error) {
		logger.error('[PRODUCTS-BY-CATEGORY] Error fetching products:');
		logger.error(error instanceof Error ? error.message : String(error));
		res.status(500).json({
			error: 'Failed to fetch products',
			message: error instanceof Error ? error.message : 'Unknown error',
		});
	}
};
