// src/lib/data/products.ts
'use server';

import { sdk } from '@lib/config';
import { HttpTypes } from '@medusajs/types';
import { SortOptions } from '@modules/store/components/refinement-list/sort-products';
import { getCategoryIdByHandle } from './categories';
import { getAuthHeaders, getCacheOptions } from './cookies';
import {
	MeilisearchSearchFilters,
	searchProductsWithMeilisearch,
} from './meilisearch';
import { getRegion, retrieveRegion } from './regions';

export const listProducts = async ({
	pageParam = 1,
	queryParams,
	countryCode,
	regionId,
}: {
	pageParam?: number;
	queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams;
	countryCode?: string;
	regionId?: string;
}): Promise<{
	response: { products: HttpTypes.StoreProduct[]; count: number };
	nextPage: number | null;
	queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams;
}> => {
	if (!countryCode && !regionId) {
		throw new Error('Country code or region ID is required');
	}

	const limit = queryParams?.limit || 12;
	const _pageParam = Math.max(pageParam, 1);
	const offset = _pageParam === 1 ? 0 : (_pageParam - 1) * limit;

	let region: HttpTypes.StoreRegion | undefined | null;

	if (countryCode) {
		region = await getRegion(countryCode);
	} else {
		region = await retrieveRegion(regionId!);
	}

	if (!region) {
		return {
			response: { products: [], count: 0 },
			nextPage: null,
		};
	}

	const headers = {
		...(await getAuthHeaders()),
	};

	const next = {
		...(await getCacheOptions('products')),
	};

	return sdk.client
		.fetch<{ products: HttpTypes.StoreProduct[]; count: number }>(
			`/store/products`,
			{
				method: 'GET',
				query: {
					limit,
					offset,
					region_id: region?.id,
					fields:
						'*variants.calculated_price,+variants.inventory_quantity,+metadata,+tags',
					...queryParams,
				},
				headers,
				next,
				// Use force-cache for better performance
				// Cache is invalidated via tags when products/inventory changes
				cache: 'force-cache',
			},
		)
		.then(({ products, count }) => {
			const nextPage = count > offset + limit ? pageParam + 1 : null;

			return {
				response: {
					products,
					count,
				},
				nextPage: nextPage,
				queryParams,
			};
		});
};

/**
 * Search products with filters using the standard Medusa SDK approach
 * Following official documentation: https://docs.medusajs.com/resources/storefront-development/products/list
 */
/**
 * Search products using Meilisearch for advanced filtering and faceted search
 * This replaces the old searchProducts function with Meilisearch-powered search
 */
export const searchProductsAdvanced = async ({
	query = '',
	page = 1,
	limit = 20,
	categoryId,
	collectionId,
	tags,
	sortBy,
	countryCode,
	stockFilter,
	priceMin,
	priceMax,
}: {
	query?: string;
	page?: number;
	limit?: number;
	categoryId?: string;
	collectionId?: string;
	tags?: string[];
	sortBy?: SortOptions;
	countryCode: string;
	stockFilter?: string;
	priceMin?: number;
	priceMax?: number;
}): Promise<{
	products: HttpTypes.StoreProduct[];
	count: number;
	facets?: { [key: string]: { [value: string]: number } };
}> => {
	const region = await getRegion(countryCode);
	if (!region) {
		return { products: [], count: 0 };
	}

	const offset = (page - 1) * limit;

	// Build Meilisearch filters
	const filters: MeilisearchSearchFilters = {};

	// Category filtering
	if (categoryId) {
		// Check if it's an ID or handle and convert accordingly
		if (categoryId.startsWith('pcat_')) {
			filters.categoryIds = [categoryId];
		} else {
			// It's a handle, convert to ID
			const categoryIdFromHandle = await getCategoryIdByHandle(categoryId);
			if (categoryIdFromHandle) {
				filters.categoryIds = [categoryIdFromHandle];
			}
		}
	}

	// Collection filtering
	if (collectionId) {
		filters.collectionIds = [collectionId];
	}

	// Tags filtering
	if (tags && tags.length > 0) {
		filters.tags = tags;
	}

	// Stock filtering
	if (stockFilter && stockFilter !== 'all') {
		filters.stockStatus = stockFilter as 'in_stock' | 'out_of_stock';
	}

	// Price filtering
	if (priceMin !== undefined) {
		filters.priceMin = priceMin;
	}
	if (priceMax !== undefined) {
		filters.priceMax = priceMax;
	}

	// Sales channel filtering (get current sales channel)
	// TODO: Add sales channel detection based on region/country
	// filters.salesChannelIds = [region.sales_channel_id];

	try {
		const response = await searchProductsWithMeilisearch({
			query,
			limit,
			offset,
			filters,
			regionId: region.id,
			currencyCode: region.currency_code,
			language: 'de', // TODO: Make this dynamic based on country
		});

		return {
			products: response.hits,
			count: response.estimatedTotalHits,
			facets: response.facetDistribution,
		};
	} catch (error) {
		console.error(
			'Meilisearch search error, falling back to standard search:',
			error,
		);
		// Fallback to standard search if Meilisearch fails
		const fallbackResult = await searchProductsFallback({
			query,
			page,
			limit,
			categoryId,
			collectionId,
			tags,
			sortBy,
			countryCode,
			stockFilter,
			priceMin,
			priceMax,
		});

		return {
			products: fallbackResult.response.products,
			count: fallbackResult.response.count,
			facets: {}, // No facets available in fallback
		};
	}
};

/**
 * Fallback search function using standard Medusa API
 * Used when Meilisearch is not available
 */
export const searchProductsFallback = async ({
	query,
	page = 1,
	limit = 12,
	countryCode,
	sortBy = 'created_at',
	categoryId,
	collectionId,
	priceMin,
	priceMax,
	tags,
	stockFilter,
}: {
	query?: string;
	page?: number;
	limit?: number;
	countryCode: string;
	sortBy?: SortOptions;
	categoryId?: string;
	collectionId?: string;
	priceMin?: number;
	priceMax?: number;
	tags?: string[];
	stockFilter?: string;
}): Promise<{
	response: { products: HttpTypes.StoreProduct[]; count: number };
	nextPage: number | null;
}> => {
	// Calculate offset for pagination
	const offset = (page - 1) * limit;

	// Get region for pricing context
	const region = await getRegion(countryCode);
	if (!region) {
		return {
			response: { products: [], count: 0 },
			nextPage: null,
		};
	}

	// Build query parameters following official Medusa SDK documentation
	const queryParams: any = {
		limit,
		offset,
		region_id: region.id,
		fields:
			'*variants.calculated_price,+variants.inventory_quantity,+metadata,+tags',
	};

	// Add search query filter
	if (query && query.trim()) {
		queryParams.q = query.trim();
	}

	// Add category filter - convert handle to ID if needed
	if (categoryId) {
		// Check if it looks like an ID (starts with pcat_) or a handle
		if (categoryId.startsWith('pcat_')) {
			queryParams.category_id = [categoryId];
		} else {
			// It's a handle, convert to ID
			const categoryIdFromHandle = await getCategoryIdByHandle(categoryId);
			if (categoryIdFromHandle) {
				queryParams.category_id = [categoryIdFromHandle];
			}
		}
	}

	// Add collection filter
	if (collectionId) {
		queryParams.collection_id = [collectionId];
	}

	// Add tags filter
	if (tags && tags.length > 0) {
		queryParams.tag_id = tags;
	}

	// Add sorting - following official documentation
	if (sortBy) {
		switch (sortBy) {
			case 'price_asc':
				// Price sorting needs to be done client-side as calculated_price.amount is not sortable
				queryParams.order = 'title'; // Fallback to title sorting
				break;
			case 'price_desc':
				// Price sorting needs to be done client-side as calculated_price.amount is not sortable
				queryParams.order = '-title'; // Fallback to title sorting
				break;
			case 'title_asc':
				queryParams.order = 'title';
				break;
			case 'title_desc':
				queryParams.order = '-title';
				break;
			case 'created_at':
			default:
				queryParams.order = '-created_at';
				break;
		}
	}

	const headers = {
		...(await getAuthHeaders()),
	};

	const next = {
		...(await getCacheOptions('products')),
	};

	// Use standard SDK approach as documented
	const { products, count } = await sdk.client.fetch<{
		products: HttpTypes.StoreProduct[];
		count: number;
	}>(`/store/products`, {
		method: 'GET',
		query: queryParams,
		headers,
		next,
		cache: 'force-cache',
	});

	// Apply client-side filters for features not supported by the API
	let filteredProducts = products;

	// Note: Stock filtering disabled temporarily - inventory_quantity not available in API response
	// TODO: Fix inventory data fetching or use different approach for stock filtering
	/*
	// Apply stock filter if specified
	if (stockFilter && stockFilter !== 'all') {
		filteredProducts = products.filter(product => {
			if (!product.variants || product.variants.length === 0) return false;

			const hasStock = product.variants.some(variant => {
				const qty = variant.inventory_quantity;
				return qty !== null && qty !== undefined && qty > 0;
			});

			return stockFilter === 'in_stock' ? hasStock : !hasStock;
		});
	}
	*/

	// Apply price range filter if specified (client-side for now)
	if (priceMin !== undefined || priceMax !== undefined) {
		filteredProducts = filteredProducts.filter(product => {
			if (!product.variants || product.variants.length === 0) return false;

			return product.variants.some(variant => {
				if (!variant.calculated_price) return false;

				const price = variant.calculated_price.calculated_amount;
				if (price === null || price === undefined) return false;
				if (priceMin !== undefined && price < priceMin) return false;
				if (priceMax !== undefined && price > priceMax) return false;

				return true;
			});
		});
	}

	// Apply client-side price sorting if needed
	if (sortBy === 'price_asc' || sortBy === 'price_desc') {
		filteredProducts.sort((a, b) => {
			const priceA = a.variants?.[0]?.calculated_price?.calculated_amount || 0;
			const priceB = b.variants?.[0]?.calculated_price?.calculated_amount || 0;

			return sortBy === 'price_asc' ? priceA - priceB : priceB - priceA;
		});
	}

	const filteredCount = filteredProducts.length;
	const nextPage = count > offset + limit ? page + 1 : null;

	return {
		response: {
			products: filteredProducts,
			count: filteredCount,
		},
		nextPage,
	};
};

/**
 * Main search function - uses Meilisearch for advanced search and filtering
 * This is the primary function used by the frontend components
 */
export const searchProducts = async ({
	query,
	page = 1,
	limit = 12,
	countryCode,
	sortBy = 'created_at',
	categoryId,
	collectionId,
	tags,
	stockFilter,
	priceMin,
	priceMax,
}: {
	query?: string;
	page?: number;
	limit?: number;
	countryCode: string;
	sortBy?: SortOptions;
	categoryId?: string;
	collectionId?: string;
	tags?: string[];
	stockFilter?: string;
	priceMin?: number;
	priceMax?: number;
}): Promise<{
	response: { products: HttpTypes.StoreProduct[]; count: number };
	nextPage: number | null;
	queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams;
}> => {
	// Use Meilisearch-powered search for better performance and faceted search
	const searchResult = await searchProductsAdvanced({
		query,
		page,
		limit,
		categoryId,
		collectionId,
		tags,
		sortBy,
		countryCode,
		stockFilter,
		priceMin,
		priceMax,
	});

	const nextPage = searchResult.count > page * limit ? page + 1 : null;

	return {
		response: {
			products: searchResult.products,
			count: searchResult.count,
		},
		nextPage,
		queryParams: {}, // Not needed for Meilisearch
	};
};
