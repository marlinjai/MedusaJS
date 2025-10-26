// src/lib/data/search.ts
// Enhanced search functions using Meilisearch

'use server';

import { sdk } from '@lib/config';
import { HttpTypes } from '@medusajs/types';
import { getAuthHeaders } from './cookies';
import { getRegion } from './regions';

export interface MeilisearchSearchParams {
	query: string;
	type?: 'products' | 'categories' | 'all';
	limit?: number;
	offset?: number;
	filters?: string;
	facets?: string;
	sort?: string;
	countryCode: string;
}

export interface SearchResult {
	hits: any[];
	query: string;
	processingTimeMs: number;
	limit: number;
	offset: number;
	estimatedTotalHits: number;
	facetDistribution?: Record<string, Record<string, number>>;
}

export interface MeilisearchResponse {
	success: boolean;
	products: any[];
	facets: Record<string, Record<string, number>>;
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
	sort: string | null;
	query: string;
	filters: Record<string, any>;
}

/**
 * Search products and categories using Meilisearch via store endpoint
 */
export const searchWithMeilisearch = async ({
	query,
	type = 'products',
	limit = 20,
	offset = 0,
	filters,
	facets,
	sort,
	countryCode,
}: MeilisearchSearchParams): Promise<MeilisearchResponse> => {
	try {
		const region = await getRegion(countryCode);
		if (!region) {
			throw new Error('Region not found');
		}

		const headers = {
			...(await getAuthHeaders()),
		};

		const next = {
			revalidate: 0, // Disable caching for search to ensure pagination works
		};

		// Use the new store search endpoint
		const response = await sdk.client.fetch<{
			success: boolean;
			data: {
				hits: any[];
				facetDistribution: Record<string, Record<string, number>>;
				totalHits: number;
				query: string;
				filters: string[];
				processingTimeMs: number;
				pagination: {
					page: number;
					limit: number;
					total: number;
					totalPages: number;
				};
			};
		}>(`/store/search`, {
			method: 'POST',
			body: {
				query,
				type,
				limit,
				offset,
				filters,
				facets,
				sort,
				region_id: region.id,
			},
			headers,
			next,
			cache: 'no-store',
		});

		// Transform response to match expected format
		if (response.success) {
			return {
				success: true,
				products: response.data.hits,
				facets: response.data.facetDistribution,
				pagination: response.data.pagination,
				sort: sort || null,
				query: response.data.query,
				filters: {},
			};
		}

		throw new Error('Search request failed');
	} catch (error) {
		console.error('Meilisearch API error:', error);

		// Return fallback empty results
		return {
			success: false,
			products: [],
			facets: {},
			pagination: {
				page: Math.floor(offset / limit) + 1,
				limit,
				total: 0,
				totalPages: 0,
			},
			sort: sort || null,
			query,
			filters: {},
		};
	}
};

/**
 * Unified search function that handles filters, search, sorting, and pagination together
 *
 * FLOW EXPLANATION:
 * 1. PRIMARY PATH (Meilisearch):
 *    - No "origin set" - Meilisearch is a search engine that returns filtered results directly
 *    - Filters + Search + Sort + Pagination all happen in one Meilisearch query
 *    - Much faster and more accurate
 *
 * 2. FALLBACK PATH (Medusa API):
 *    - Origin set: All products from /store/products endpoint (filtered by region)
 *    - Then applies local filtering, search, sorting, and pagination
 *    - Used only if Meilisearch is unavailable
 */
export const unifiedProductSearch = async ({
	query = '',
	page = 1,
	limit = 12,
	countryCode,
	sortBy = 'created_at',
	categoryHandle,
	categoryId,
	stockFilter = 'all',
	collectionHandle,
	collectionId,
}: {
	query?: string;
	page?: number;
	limit?: number;
	countryCode: string;
	sortBy?: string;
	categoryHandle?: string;
	categoryId?: string;
	stockFilter?: string;
	collectionHandle?: string;
	collectionId?: string;
}): Promise<{
	response: { products: HttpTypes.StoreProduct[]; count: number };
	nextPage: number | null;
	facets?: Record<string, Record<string, number>>;
}> => {
	const offset = (page - 1) * limit;

	console.log('🔍 unifiedProductSearch called with:', {
		query,
		page,
		limit,
		offset,
		countryCode,
		sortBy,
		categoryHandle,
		categoryId,
		stockFilter,
		collectionHandle,
		collectionId,
	});

	try {
		// PRIMARY PATH: Use Meilisearch (search engine - no origin set needed)
		const filters: string[] = [];

		// Build category filters
		if (categoryHandle || categoryId) {
			const { getCategoryIdByHandle, getChildCategoryIds } = await import(
				'./categories'
			);
			let resolvedCategoryIds: string[] = [];

			if (categoryHandle && !categoryId) {
				const parentCategoryId = await getCategoryIdByHandle(categoryHandle);
				if (parentCategoryId) {
					const childIds = await getChildCategoryIds(parentCategoryId);
					resolvedCategoryIds = [parentCategoryId, ...childIds];
				}
			} else if (categoryId) {
				const childIds = await getChildCategoryIds(categoryId);
				resolvedCategoryIds = [categoryId, ...childIds];
			}

			if (resolvedCategoryIds.length > 0) {
				// Try both category_ids and category_names for better compatibility
				const categoryIdFilters = resolvedCategoryIds.map(
					id => `category_ids = "${id}"`,
				);

				// Also get category names for better filtering
				const { getAllCategories } = await import('./categories');
				const allCategories = await getAllCategories();
				const categoryNames = resolvedCategoryIds
					.map(
						id =>
							allCategories.find(
								(cat: HttpTypes.StoreProductCategory) => cat.id === id,
							)?.name,
					)
					.filter(Boolean);

				const categoryNameFilters = categoryNames.map(
					name => `category_names = "${name}"`,
				);

				// Combine both ID and name filters
				const allCategoryFilters = [
					...categoryIdFilters,
					...categoryNameFilters,
				];

				if (allCategoryFilters.length > 1) {
					filters.push(`(${allCategoryFilters.join(' OR ')})`);
				} else {
					filters.push(allCategoryFilters[0]);
				}
			}
		}

		// Build other filters
		if (stockFilter !== 'all') {
			filters.push(`is_available = ${stockFilter === 'in_stock'}`);
		}

		if (collectionHandle || collectionId) {
			filters.push(`collection_handle = "${collectionHandle || collectionId}"`);
		}

		// Convert sort options to Meilisearch format
		let sortOptions: string[] = [];
		switch (sortBy) {
			case 'price_asc':
				sortOptions = ['min_price:asc'];
				break;
			case 'price_desc':
				sortOptions = ['min_price:desc'];
				break;
			case 'title_asc':
				sortOptions = ['title:asc'];
				break;
			case 'title_desc':
				sortOptions = ['title:desc'];
				break;
			case 'created_at':
			default:
				sortOptions = ['created_at:desc'];
				break;
		}

		// Single Meilisearch query handles everything
		const meilisearchResult = await searchWithMeilisearch({
			query,
			type: 'products',
			limit,
			offset,
			filters: filters.length > 0 ? filters.join(' AND ') : undefined,
			facets: 'category_names,tags,is_available,collection_title',
			sort: sortOptions.join(','),
			countryCode,
		});

		if (meilisearchResult.success && meilisearchResult.products) {
			const nextPage =
				meilisearchResult.pagination.total > offset + limit ? page + 1 : null;

			return {
				response: {
					products: meilisearchResult.products,
					count: meilisearchResult.pagination.total,
				},
				nextPage,
				facets: meilisearchResult.facets,
			};
		}
	} catch (error) {
		console.error(
			'Meilisearch search failed, falling back to Medusa API:',
			error,
		);
	}

	// FALLBACK PATH: Use Medusa API (origin set: all products in region)
	try {
		const { listProductsWithSort } = await import('./products');
		const { getCategoryIdByHandle, getChildCategoryIds } = await import(
			'./categories'
		);

		// ORIGIN SET: Get all products from Medusa API (filtered by region)
		const queryParams: any = {
			limit: 1000, // Get all products for proper filtering and pagination
		};

		// Handle category filtering in API call
		let resolvedCategoryIds: string[] = [];
		if (categoryHandle && !categoryId) {
			const parentCategoryId = await getCategoryIdByHandle(categoryHandle);
			if (parentCategoryId) {
				const childIds = await getChildCategoryIds(parentCategoryId);
				resolvedCategoryIds = [parentCategoryId, ...childIds];
			}
		} else if (categoryId) {
			const childIds = await getChildCategoryIds(categoryId);
			resolvedCategoryIds = [categoryId, ...childIds];
		}

		if (resolvedCategoryIds.length > 0) {
			queryParams['category_id'] = resolvedCategoryIds;
		}

		if (collectionHandle || collectionId) {
			queryParams['collection_id'] = [collectionHandle || collectionId];
		}

		if (query.trim()) {
			queryParams['q'] = query.trim();
		}

		// Get origin set from Medusa API
		const {
			response: { products, count },
		} = await listProductsWithSort({
			page: 1, // Get all results for local filtering
			queryParams,
			sortBy: sortBy as any,
			countryCode,
		});

		// Apply local filtering for stock (not supported by Medusa API)
		let filteredProducts = products;
		if (stockFilter !== 'all') {
			filteredProducts = products.filter(product => {
				const hasInventory =
					product.variants?.some(variant =>
						variant.manage_inventory
							? (variant.inventory_quantity || 0) > 0
							: true,
					) || false;

				return stockFilter === 'in_stock' ? hasInventory : !hasInventory;
			});
		}

		// Apply local search if no API search was used
		if (!query.trim() || !queryParams['q']) {
			// No search query, just return filtered results
		} else {
			// Apply local search filtering
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
		}

		// Paginate results
		const startIndex = (page - 1) * limit;
		const endIndex = page * limit;
		const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
		const nextPage = filteredProducts.length > endIndex ? page + 1 : null;

		return {
			response: {
				products: paginatedProducts,
				count: filteredProducts.length,
			},
			nextPage,
		};
	} catch (fallbackError) {
		console.error('Medusa API fallback also failed:', fallbackError);
		return {
			response: { products: [], count: 0 },
			nextPage: null,
		};
	}
};

/**
 * Simple search products function for compatibility
 */
export const searchProducts = async ({
	query,
	page = 1,
	limit = 12,
	countryCode,
	sort = 'created_at',
}: {
	query: string;
	page?: number;
	limit?: number;
	countryCode: string;
	sort?: string;
}): Promise<{
	response: { products: HttpTypes.StoreProduct[]; count: number };
	nextPage: number | null;
}> => {
	// Use the unified search function
	const result = await unifiedProductSearch({
		query,
		page,
		limit,
		countryCode,
		sortBy: sort,
	});

	return {
		response: result.response,
		nextPage: result.nextPage,
	};
};

/**
 * Get search suggestions/autocomplete
 */
export const getSearchSuggestions = async ({
	query,
	countryCode,
	limit = 5,
}: {
	query: string;
	countryCode: string;
	limit?: number;
}): Promise<string[]> => {
	if (query.length < 2) return [];

	try {
		const result = await searchWithMeilisearch({
			query,
			type: 'products',
			limit,
			offset: 0,
			countryCode,
		});

		if (result.success && result.products) {
			// Extract unique titles as suggestions
			const suggestions = result.products
				.map((product: any) => product.title)
				.filter(
					(title: string, index: number, array: string[]) =>
						array.indexOf(title) === index,
				)
				.slice(0, limit);

			return suggestions;
		}
	} catch (error) {
		console.error('Failed to get search suggestions:', error);
	}

	return [];
};

/**
 * Get category counts for faceted search
 */
export const getCategoryFacets = async ({
	query = '',
	countryCode,
}: {
	query?: string;
	countryCode: string;
}): Promise<Record<string, number>> => {
	try {
		const result = await searchWithMeilisearch({
			query,
			type: 'products',
			limit: 0, // We only want facets
			offset: 0,
			facets: 'categories',
			countryCode,
		});

		if (result.success && result.facets) {
			return result.facets.categories || {};
		}
	} catch (error) {
		console.error('Failed to get category facets:', error);
	}

	return {};
};
