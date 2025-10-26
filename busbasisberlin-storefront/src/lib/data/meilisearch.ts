// src/lib/data/meilisearch.ts
'use server';

import { sdk } from '@lib/config';
import { getAuthHeaders } from './cookies';

/**
 * Meilisearch integration using @rokmohar/medusa-plugin-meilisearch
 * Frontend uses Medusa API endpoints (/store/meilisearch/*) provided by the plugin
 * Backend connects directly to Meilisearch server
 */

export type CategoryFacet = {
	category_id: string;
	name: string;
	handle: string;
	count: number;
};

export type ProductSearchResult = {
	id: string;
	title: string;
	handle: string;
	description?: string;
	thumbnail?: string;
	category_id?: string;
	collection_id?: string;
	variants?: any[];
	images?: any[];
	tags?: any[];
	type?: any;
	status: string;
	created_at: string;
	updated_at: string;
};

export type SearchResponse = {
	hits: ProductSearchResult[];
	query: string;
	processingTimeMs: number;
	limit: number;
	offset: number;
	estimatedTotalHits: number;
	facetDistribution?: Record<string, Record<string, number>>;
};

/**
 * Get category facets with product counts using Meilisearch
 * Uses the /store/meilisearch/products-hits endpoint from the plugin
 */
export const getCategoryFacetsWithMeilisearch = async ({
	query = '',
	filters = {},
	regionId,
	currencyCode,
	language = 'en',
}: {
	query?: string;
	filters?: any;
	regionId?: string;
	currencyCode?: string;
	language?: string;
}): Promise<CategoryFacet[]> => {
	try {
		const headers = {
			...(await getAuthHeaders()),
		};

		// Build query parameters for the Meilisearch plugin
		const searchParams = new URLSearchParams();
		searchParams.append('query', query);
		searchParams.append('limit', '0'); // We only want facets, not actual results
		searchParams.append('language', language);

		if (regionId) {
			searchParams.append('region_id', regionId);
		}
		if (currencyCode) {
			searchParams.append('currency_code', currencyCode);
		}

		// Add filters if provided
		Object.entries(filters).forEach(([key, value]) => {
			if (Array.isArray(value)) {
				value.forEach(v => searchParams.append(`${key}[]`, String(v)));
			} else {
				searchParams.append(key, String(value));
			}
		});

		// Use the plugin's search endpoint to get faceted results
		const response = await sdk.client.fetch<SearchResponse>(
			`/store/meilisearch/products-hits?${searchParams.toString()}`,
			{
				method: 'GET',
				headers,
			},
		);

		// Extract category facets from the response
		const categoryFacets: CategoryFacet[] = [];

		if (response.facetDistribution?.category_id) {
			Object.entries(response.facetDistribution.category_id).forEach(
				([categoryId, count]) => {
					categoryFacets.push({
						category_id: categoryId,
						name: '', // Will be filled by the calling function
						handle: '', // Will be filled by the calling function
						count: count,
					});
				},
			);
		}

		return categoryFacets;
	} catch (error) {
		console.error('Error fetching category facets from Meilisearch:', error);
		return [];
	}
};

/**
 * Search products using Meilisearch
 * Uses the /store/meilisearch/products endpoint from the plugin
 */
export const searchProductsWithMeilisearch = async ({
	query = '',
	filters = {},
	limit = 20,
	offset = 0,
	regionId,
	currencyCode,
	language = 'en',
	fields,
}: {
	query?: string;
	filters?: any;
	limit?: number;
	offset?: number;
	regionId?: string;
	currencyCode?: string;
	language?: string;
	fields?: string;
}) => {
	try {
		const headers = {
			...(await getAuthHeaders()),
		};

		// Build query parameters
		const searchParams = new URLSearchParams();
		searchParams.append('query', query);
		searchParams.append('limit', limit.toString());
		searchParams.append('offset', offset.toString());
		searchParams.append('language', language);

		if (regionId) {
			searchParams.append('region_id', regionId);
		}
		if (currencyCode) {
			searchParams.append('currency_code', currencyCode);
		}
		if (fields) {
			searchParams.append('fields', fields);
		}

		// Add filters
		Object.entries(filters).forEach(([key, value]) => {
			if (Array.isArray(value)) {
				value.forEach(v => searchParams.append(`${key}[]`, String(v)));
			} else {
				searchParams.append(key, String(value));
			}
		});

		const response = await sdk.client.fetch(
			`/store/meilisearch/products?${searchParams.toString()}`,
			{
				method: 'GET',
				headers,
			},
		);

		return response;
	} catch (error) {
		console.error('Error searching products with Meilisearch:', error);
		return {
			products: [],
			facets: {},
			total: 0,
		};
	}
};

/**
 * Search categories using Meilisearch
 * Uses the /store/meilisearch/categories endpoint from the plugin
 */
export const searchCategoriesWithMeilisearch = async ({
	query = '',
	limit = 20,
	offset = 0,
	language = 'en',
	fields,
}: {
	query?: string;
	limit?: number;
	offset?: number;
	language?: string;
	fields?: string;
}) => {
	try {
		const headers = {
			...(await getAuthHeaders()),
		};

		const searchParams = new URLSearchParams();
		searchParams.append('query', query);
		searchParams.append('limit', limit.toString());
		searchParams.append('offset', offset.toString());
		searchParams.append('language', language);

		if (fields) {
			searchParams.append('fields', fields);
		}

		const response = await sdk.client.fetch(
			`/store/meilisearch/categories?${searchParams.toString()}`,
			{
				method: 'GET',
				headers,
			},
		);

		return response;
	} catch (error) {
		console.error('Error searching categories with Meilisearch:', error);
		return {
			categories: [],
			facets: {},
			total: 0,
		};
	}
};
