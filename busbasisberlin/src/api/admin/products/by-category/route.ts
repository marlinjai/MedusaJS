// busbasisberlin/src/api/admin/products/by-category/route.ts
// Admin API route to fetch products filtered by category, collection, sales channel, shipping profile

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

		const queryFilters = hasFilters ? filters : {};

		logger.info(
			`[PRODUCTS-BY-CATEGORY] Querying products with filters: ${JSON.stringify(queryFilters)}, limit: ${limit}, offset: ${offset}, useIndex: ${needsIndexQuery}`,
		);

		// Define fields to retrieve
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
			'variants.id',
			'variants.sku',
			'variants.title',
			'variants.manage_inventory',
			'variants.allow_backorder',
			'variants.prices.amount',
			'variants.prices.currency_code',
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
		if (sku || shippingProfileIds) {
			// For SKU or shipping profile filtering, we need to load and filter client-side
			const countResult = needsIndexQuery
				? await query.index({
						entity: 'product',
						fields: ['id', 'variants.sku', 'shipping_profile.id'],
						filters: queryFilters,
						pagination: {
							take: 10000,
							skip: 0,
						},
					})
				: await query.graph({
						entity: 'product',
						fields: ['id', 'variants.sku', 'shipping_profile.id'],
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

			// Apply SKU filter if provided
			if (sku) {
				const skuFilter = (sku as string).toLowerCase();
				allProducts = allProducts.filter((product: any) =>
					product.variants?.some((variant: any) =>
						variant.sku?.toLowerCase().includes(skuFilter),
					),
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
