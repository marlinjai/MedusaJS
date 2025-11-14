// busbasisberlin/src/api/admin/products/by-category/route.ts
// Admin API route to fetch products filtered by category

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
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

		// Category filter - expand to include all descendants
		if (category_id) {
			hasFilters = true;
			// Fetch category tree to get descendants
			const categoriesResult = await query.graph({
				entity: 'product_category',
				fields: [
					'id',
					'name',
					'handle',
					'parent_category_id',
				],
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

		// Sales channel filter - query from sales_channel entity side (as per Medusa docs)
		let salesChannelIds: string[] | null = null;
		let productIdsFromSalesChannels: string[] | null = null;
		if (sales_channel_id) {
			hasFilters = true;
			salesChannelIds = Array.isArray(sales_channel_id)
				? (sales_channel_id as string[])
				: [sales_channel_id as string];

			// Query products from sales channel entity side (correct approach per Medusa docs)
			const salesChannelResults = await Promise.all(
				salesChannelIds.map(channelId =>
					query.graph({
						entity: 'sales_channel',
						fields: ['id', 'products.id'],
						filters: { id: channelId },
					}),
				),
			);

			// Collect all product IDs from all selected sales channels
			const allProductIds = new Set<string>();
			salesChannelResults.forEach(result => {
				const channels = result?.data || [];
				channels.forEach((channel: any) => {
					if (channel.products) {
						channel.products.forEach((product: any) => {
							if (product.id) {
								allProductIds.add(product.id);
							}
						});
					}
				});
			});

			productIdsFromSalesChannels = Array.from(allProductIds);
			logger.info(
				`[PRODUCTS-BY-CATEGORY] Found ${productIdsFromSalesChannels.length} products in sales channels: ${JSON.stringify(salesChannelIds)}`,
			);
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

		// Query products with categories, collections, sales channels, and variants
		// If filtering by sales channel, add product IDs to filters
		const queryFilters = hasFilters ? filters : {};

		// Add product IDs filter if we have products from sales channels
		if (productIdsFromSalesChannels && productIdsFromSalesChannels.length > 0) {
			// If we already have category/collection filters, we need to intersect
			// For now, we'll filter by product IDs from sales channels
			if (queryFilters.categories || queryFilters.collection_id) {
				// We have other filters, so we'll need to filter after querying
				// But first, let's add the product IDs to the filter
				queryFilters.id = productIdsFromSalesChannels;
			} else {
				// No other filters, just filter by product IDs
				queryFilters.id = productIdsFromSalesChannels;
			}
		}

		logger.info(
			`[PRODUCTS-BY-CATEGORY] Querying products with filters: ${JSON.stringify(queryFilters)}, limit: ${limit}, offset: ${offset}`,
		);

		const productsResult = await query.graph({
			entity: 'product',
			fields: [
				'id',
				'title',
				'handle',
				'status',
				'created_at',
				'updated_at',
				'categories.id',
				'categories.name',
				'collection.id',
				'collection.title',
				'sales_channels.id',
				'sales_channels.name',
				'variants.id',
				'variants.sku',
			],
			filters: queryFilters,
			pagination: {
				take: parseInt(limit as string),
				skip: parseInt(offset as string),
			},
		});

		let products = productsResult?.data || [];

		// If we have both sales channel filter and category/collection filters,
		// we need to ensure products match both (already handled by query filters)

		// Filter by SKU if provided (client-side filter since SKU is in variants)
		if (sku) {
			const skuFilter = (sku as string).toLowerCase();
			products = products.filter((product: any) =>
				product.variants?.some((variant: any) =>
					variant.sku?.toLowerCase().includes(skuFilter),
				),
			);
			// Re-apply pagination after SKU filtering
			const actualLimit = parseInt(limit as string);
			const actualOffset = parseInt(offset as string);
			products = products.slice(actualOffset, actualOffset + actualLimit);
		}

		// Get total count for pagination
		let total: number;
		if (sku) {
			// For SKU filtering, we need to load and filter client-side
			const countResult = await query.graph({
				entity: 'product',
				fields: ['id', 'variants.sku'],
				filters: productIdsFromSalesChannels
					? { ...queryFilters, id: productIdsFromSalesChannels }
					: queryFilters,
				pagination: {
					take: 10000, // Large limit to get accurate count
					skip: 0,
				},
			});

			const skuFilter = (sku as string).toLowerCase();
			const allProducts = (countResult?.data || []).filter((product: any) =>
				product.variants?.some((variant: any) =>
					variant.sku?.toLowerCase().includes(skuFilter),
				),
			);

			total = allProducts.length;
		} else {
			// Use query filters (which already include product IDs from sales channels if applicable)
			const totalCountResult = await query.graph({
				entity: 'product',
				fields: ['id'],
				filters: queryFilters,
			});
			const totalCount = totalCountResult?.data || [];
			total = Array.isArray(totalCount) ? totalCount.length : 0;
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
		logger.error('[PRODUCTS-BY-CATEGORY] Error fetching products:', error);
		res.status(500).json({
			error: 'Failed to fetch products',
			message: error instanceof Error ? error.message : 'Unknown error',
		});
	}
};
