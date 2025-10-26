// src/lib/data/simple-search.ts
// Simplified, direct search implementation that actually works
'use server';

import { sdk } from '@lib/config';
import { HttpTypes } from '@medusajs/types';
import { SortOptions } from '@modules/store/components/refinement-list/sort-products';
import { getAuthHeaders } from './cookies';
import { getRegion } from './regions';

export interface SimpleSearchParams {
	query?: string;
	page?: number;
	limit?: number;
	countryCode: string;
	sortBy?: SortOptions;
	categoryHandle?: string;
	stockFilter?: string;
	collectionHandle?: string;
}

export interface SimpleSearchResult {
	products: HttpTypes.StoreProduct[];
	count: number;
	totalPages: number;
	currentPage: number;
}

/**
 * Direct product search using Medusa's built-in API
 * This bypasses Meilisearch complexity and uses the reliable Medusa API
 */
export const simpleProductSearch = async ({
	query = '',
	page = 1,
	limit = 20,
	countryCode,
	sortBy = 'created_at',
	categoryHandle,
	stockFilter = 'all',
	collectionHandle,
}: SimpleSearchParams): Promise<SimpleSearchResult> => {
	console.log('🔍 simpleProductSearch called:', {
		query,
		page,
		limit,
		countryCode,
		sortBy,
		categoryHandle,
		stockFilter,
		collectionHandle,
	});

	try {
		const region = await getRegion(countryCode);
		if (!region) {
			throw new Error('Region not found');
		}

		const headers = {
			...(await getAuthHeaders()),
		};

		// Build query parameters for Medusa API
		const queryParams: any = {
			limit: 1000, // Get many products for local filtering/sorting
			offset: 0,
			region_id: region.id,
			fields:
				'*variants.calculated_price,+variants.inventory_quantity,+metadata,+tags,+categories',
		};

		// Handle category filtering
		if (categoryHandle) {
			const { getCategoryIdByHandle, getChildCategoryIds } = await import(
				'./categories'
			);
			const parentCategoryId = await getCategoryIdByHandle(categoryHandle);
			if (parentCategoryId) {
				const childIds = await getChildCategoryIds(parentCategoryId);
				queryParams['category_id'] = [parentCategoryId, ...childIds];
				console.log('🔍 Category filter:', { parentCategoryId, childIds });
			}
		}

		// Handle collection filtering
		if (collectionHandle) {
			queryParams['collection_id'] = [collectionHandle];
		}

		// Handle search query
		if (query.trim()) {
			queryParams['q'] = query.trim();
		}

		console.log('🔍 Medusa API query params:', queryParams);

		// Fetch products from Medusa API
		const response = await sdk.client.fetch<{
			products: HttpTypes.StoreProduct[];
			count: number;
		}>(`/store/products`, {
			method: 'GET',
			query: queryParams,
			headers,
			cache: 'no-store', // CRITICAL: No caching for dynamic results
		});

		console.log('🔍 Medusa API response:', {
			productCount: response.products.length,
			totalCount: response.count,
		});

		let filteredProducts = response.products;

		// Apply stock filtering (local)
		if (stockFilter !== 'all') {
			const beforeCount = filteredProducts.length;
			filteredProducts = filteredProducts.filter(product => {
				const hasInventory =
					product.variants?.some(variant =>
						variant.manage_inventory
							? (variant.inventory_quantity || 0) > 0
							: true,
					) || false;

				return stockFilter === 'in_stock' ? hasInventory : !hasInventory;
			});
			console.log(
				`🔍 Stock filter applied: ${beforeCount} → ${filteredProducts.length} products`,
			);
		}

		// Apply additional search filtering if needed (local)
		if (query.trim() && !queryParams['q']) {
			const beforeCount = filteredProducts.length;
			filteredProducts = filteredProducts.filter(
				product =>
					product.title?.toLowerCase().includes(query.toLowerCase()) ||
					product.description?.toLowerCase().includes(query.toLowerCase()) ||
					product.tags?.some(tag =>
						tag.value?.toLowerCase().includes(query.toLowerCase()),
					) ||
					product.variants?.some(
						variant =>
							variant.title?.toLowerCase().includes(query.toLowerCase()) ||
							variant.sku?.toLowerCase().includes(query.toLowerCase()),
					),
			);
			console.log(
				`🔍 Local search applied: ${beforeCount} → ${filteredProducts.length} products`,
			);
		}

		// Apply sorting (local)
		if (sortBy) {
			filteredProducts.sort((a, b) => {
				switch (sortBy) {
					case 'price_asc':
						const priceA =
							a.variants?.[0]?.calculated_price?.calculated_amount || 0;
						const priceB =
							b.variants?.[0]?.calculated_price?.calculated_amount || 0;
						return priceA - priceB;
					case 'price_desc':
						const priceA2 =
							a.variants?.[0]?.calculated_price?.calculated_amount || 0;
						const priceB2 =
							b.variants?.[0]?.calculated_price?.calculated_amount || 0;
						return priceB2 - priceA2;
					case 'created_at':
					default:
						const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
						const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
						return dateB - dateA;
				}
			});
			console.log(`🔍 Sorting applied: ${sortBy}`);
		}

		// Apply pagination (local)
		const totalCount = filteredProducts.length;
		const totalPages = Math.ceil(totalCount / limit);
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

		console.log(
			`🔍 Pagination applied: page ${page}, showing ${
				startIndex + 1
			}-${Math.min(endIndex, totalCount)} of ${totalCount}`,
		);

		return {
			products: paginatedProducts,
			count: totalCount,
			totalPages,
			currentPage: page,
		};
	} catch (error) {
		console.error('🚨 simpleProductSearch failed:', error);
		return {
			products: [],
			count: 0,
			totalPages: 0,
			currentPage: page,
		};
	}
};
