// src/lib/data/catalog.ts
// Catalog data layer for interfacing with /store/catalog API
'use server';

import { sdk } from '@lib/config';
import { HttpTypes } from '@medusajs/types';
import { getAuthHeaders } from './cookies';
import { getRegion } from './regions';

// Type definitions for catalog API
export type CatalogFilters = {
	query?: string;
	categories?: string[];
	availability?: 'all' | 'in_stock' | 'out_of_stock';
	minPrice?: number;
	maxPrice?: number;
	tags?: string[];
	collections?: string[];
	sortBy?:
		| 'created_at'
		| 'price_asc'
		| 'price_desc'
		| 'title_asc'
		| 'title_desc';
	page?: number;
	limit?: number;
};

export type CatalogFacets = {
	category_names: Record<string, number>;
	category_paths: Record<string, number>;
	is_available: Record<string, number>;
	currencies: Record<string, number>;
	tags: Record<string, number>;
	collection_title: Record<string, number>;
	status: Record<string, number>;
};

export type CatalogResponse = {
	products: HttpTypes.StoreProduct[];
	facets: CatalogFacets;
	totalProducts: number;
	appliedFilters: {
		query: string | null;
		categories: string[];
		availability: string;
		priceRange: { min?: number; max?: number } | null;
		tags: string[];
		collections: string[];
		sortBy: string;
	};
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasNextPage: boolean;
		hasPrevPage: boolean;
	};
	processingTimeMs: number;
};

/**
 * Main catalog function - calls /store/catalog endpoint
 */
export const getCatalogData = async (
	filters: CatalogFilters,
	countryCode: string,
): Promise<CatalogResponse> => {
	try {
		const region = await getRegion(countryCode);
		if (!region) {
			throw new Error('Region not found');
		}

		const headers = {
			...(await getAuthHeaders()),
		};

		const response = await sdk.client.fetch<{
			success: boolean;
			data: CatalogResponse;
		}>(`/store/catalog`, {
			method: 'POST',
			body: {
				...filters,
				region_id: region.id,
			},
			headers,
			cache: 'no-store',
		});

		if (response.success) {
			return response.data;
		}

		throw new Error('Catalog request failed');
	} catch (error) {
		console.error('Catalog API error:', error);
		console.error('Catalog API error details:', {
			errorMessage: error instanceof Error ? error.message : 'Unknown error',
			errorStack: error instanceof Error ? error.stack : undefined,
			errorType: typeof error,
			errorKeys: error ? Object.keys(error) : [],
			filters: filters,
			countryCode: countryCode,
		});

		// Return empty fallback
		return {
			products: [],
			facets: {
				category_names: {},
				category_paths: {},
				is_available: {},
				currencies: {},
				tags: {},
				collection_title: {},
				status: {},
			},
			totalProducts: 0,
			appliedFilters: {
				query: filters.query || null,
				categories: filters.categories || [],
				availability: filters.availability || 'all',
				priceRange: null,
				tags: filters.tags || [],
				collections: filters.collections || [],
				sortBy: filters.sortBy || 'created_at',
			},
			pagination: {
				page: filters.page || 1,
				limit: filters.limit || 12,
				total: 0,
				totalPages: 0,
				hasNextPage: false,
				hasPrevPage: false,
			},
			processingTimeMs: 0,
		};
	}
};

/**
 * Get initial catalog data (all products with facets)
 */
export const getInitialCatalogData = async (
	countryCode: string,
	page: number = 1,
	limit: number = 12,
): Promise<CatalogResponse> => {
	return getCatalogData(
		{
			page,
			limit,
			sortBy: 'created_at',
		},
		countryCode,
	);
};

/**
 * Search within categories
 */
export const searchInCategories = async (
	query: string,
	categories: string[],
	countryCode: string,
	additionalFilters: Partial<CatalogFilters> = {},
): Promise<CatalogResponse> => {
	return getCatalogData(
		{
			query: query.trim(),
			categories,
			...additionalFilters,
		},
		countryCode,
	);
};

/**
 * Get categories with product counts from catalog facets (sales channel aware)
 */
export const getCategoriesFromCatalog = async (
	countryCode: string,
): Promise<{ name: string; count: number; path?: string }[]> => {
	try {
		// Get initial catalog data to extract category facets
		const catalogData = await getCatalogData(
			{
				limit: 1, // We only need facets, not products
				page: 1,
			},
			countryCode,
		);

		// Convert facets to category list with counts
		const categories: { name: string; count: number; path?: string }[] = [];

		// Add categories from category_names facet
		Object.entries(catalogData.facets.category_names || {}).forEach(
			([name, count]) => {
				categories.push({
					name,
					count,
				});
			},
		);

		// Add path information if available
		Object.entries(catalogData.facets.category_paths || {}).forEach(
			([path, count]) => {
				const existingCategory = categories.find(cat =>
					path.includes(cat.name),
				);
				if (existingCategory) {
					existingCategory.path = path;
				}
			},
		);

		return categories.sort((a, b) => a.name.localeCompare(b.name));
	} catch (error) {
		console.error('Failed to get categories from catalog:', error);
		return [];
	}
};

/**
 * Get search suggestions using catalog API (context-aware)
 */
export const getCatalogSearchSuggestions = async (
	query: string,
	categories: string[],
	countryCode: string,
	limit: number = 5,
): Promise<string[]> => {
	if (query.length < 2) return [];

	try {
		const result = await getCatalogData(
			{
				query: query.trim(),
				categories,
				limit,
				page: 1,
			},
			countryCode,
		);

		// Extract unique titles as suggestions
		const suggestions = result.products
			.map(product => product.title)
			.filter((title, index, array) => array.indexOf(title) === index)
			.slice(0, limit);

		return suggestions;
	} catch (error) {
		console.error('Failed to get catalog search suggestions:', error);
		return [];
	}
};
