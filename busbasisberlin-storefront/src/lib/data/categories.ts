// src/lib/data/categories.ts
'use server';

import { sdk } from '@lib/config';
import { HttpTypes } from '@medusajs/types';
import { getAuthHeaders, getCacheOptions } from './cookies';
import { getCategoryFacetsWithMeilisearch } from './meilisearch';

export type CategoryTreeNode = {
	id: string;
	handle: string;
	name: string;
	description?: string;
	parent_category_id?: string;
	category_children?: CategoryTreeNode[];
};

/**
 * List product categories using the standard Medusa SDK approach
 * Following official documentation: https://docs.medusajs.com/resources/storefront-development/products/categories/list
 */
export const listCategories = async ({
	limit = 100,
	offset = 0,
	includeDescendantsTree = true,
	parentCategoryId,
}: {
	limit?: number;
	offset?: number;
	includeDescendantsTree?: boolean;
	parentCategoryId?: string | null;
} = {}): Promise<{
	product_categories: HttpTypes.StoreProductCategory[];
	count: number;
}> => {
	const headers = {
		...(await getAuthHeaders()),
	};

	const next = {
		...(await getCacheOptions('categories')),
	};

	// Build query parameters following official documentation
	const queryParams: any = {
		limit,
		offset,
		fields: '*category_children, *parent_category',
	};

	if (includeDescendantsTree) {
		queryParams.include_descendants_tree = true;
	}

	// Only add parent_category_id if explicitly specified
	if (parentCategoryId !== undefined) {
		queryParams.parent_category_id = parentCategoryId;
	}

	return sdk.client.fetch<{
		product_categories: HttpTypes.StoreProductCategory[];
		count: number;
	}>(`/store/product-categories`, {
		method: 'GET',
		query: queryParams,
		headers,
		next,
		cache: 'force-cache',
	});
};

/**
 * Get all categories as a flat list (simple approach)
 */
export const getAllCategories = async (): Promise<
	HttpTypes.StoreProductCategory[]
> => {
	const { product_categories } = await listCategories({
		limit: 200,
		includeDescendantsTree: false,
	});

	return product_categories;
};

/**
 * Get category ID by handle
 */
export const getCategoryIdByHandle = async (
	handle: string,
): Promise<string | null> => {
	const categories = await getAllCategories();
	const category = categories.find(cat => cat.handle === handle);
	return category?.id || null;
};

/**
 * Get category by handle (full category object)
 */
export const getCategoryByHandle = async (
	handle: string,
): Promise<HttpTypes.StoreProductCategory | null> => {
	const categories = await getAllCategories();
	const category = categories.find(cat => cat.handle === handle);
	return category || null;
};

/**
 * Get categories with product counts using Meilisearch facets
 * This provides real-time category counts based on current filters
 */
export const getCategoriesWithProductCounts = async ({
	query = '',
	filters = {},
	regionId,
	currencyCode,
	countryCode = 'de',
}: {
	query?: string;
	filters?: any;
	regionId?: string;
	currencyCode?: string;
	countryCode?: string;
} = {}): Promise<
	Array<{
		category_id: string;
		name: string;
		handle: string;
		count: number;
		parent_category_id?: string;
	}>
> => {
	try {
		// Get category facets from Meilisearch
		const facets = await getCategoryFacetsWithMeilisearch({
			query,
			filters,
			regionId,
			currencyCode,
			language: countryCode === 'de' ? 'de' : 'en',
		});

		// Get all categories to merge with facet data
		const allCategories = await getAllCategories();

		// Merge facet counts with category data
		const categoriesWithCounts = facets
			.map(facet => {
				const category = allCategories.find(
					cat => cat.id === facet.category_id,
				);
				return {
					category_id: facet.category_id,
					name: category?.name || facet.name || 'Unknown',
					handle: category?.handle || facet.handle || 'unknown',
					count: facet.count,
					parent_category_id: category?.parent_category_id,
				};
			})
			.filter(cat => cat.count > 0); // Only show categories with products

		return categoriesWithCounts;
	} catch (error) {
		console.error('Error getting categories with product counts:', error);
		// Fallback to basic categories without counts
		const categories = await getAllCategories();
		return categories.map(cat => ({
			category_id: cat.id,
			name: cat.name,
			handle: cat.handle,
			count: 0, // No count available in fallback
			parent_category_id: cat.parent_category_id,
		}));
	}
};

/**
 * Get categories that actually have products (filtered by sales channel)
 */
export const getCategoriesWithProducts = async (): Promise<
	HttpTypes.StoreProductCategory[]
> => {
	const headers = {
		...(await getAuthHeaders()),
	};

	const next = {
		...(await getCacheOptions('categories')),
	};

	// Get all categories first
	const allCategories = await getAllCategories();

	// Filter to only categories that have products
	const categoriesWithProducts: HttpTypes.StoreProductCategory[] = [];

	for (const category of allCategories) {
		// Test if this category has any products
		const testProducts = await sdk.client.fetch<{
			products: HttpTypes.StoreProduct[];
			count: number;
		}>(`/store/products`, {
			method: 'GET',
			query: {
				limit: 1, // Just check if any products exist
				category_id: [category.id],
				fields: 'id', // Minimal fields for performance
			},
			headers,
			next,
			cache: 'force-cache',
		});

		if (testProducts.count > 0) {
			categoriesWithProducts.push(category);
		}
	}

	return categoriesWithProducts;
};
export const searchCategories = async ({
	query,
	limit = 50,
	offset = 0,
}: {
	query: string;
	limit?: number;
	offset?: number;
}): Promise<{
	product_categories: HttpTypes.StoreProductCategory[];
	count: number;
}> => {
	const headers = {
		...(await getAuthHeaders()),
	};

	const next = {
		...(await getCacheOptions('categories')),
	};

	return sdk.client.fetch<{
		product_categories: HttpTypes.StoreProductCategory[];
		count: number;
	}>(`/store/product-categories`, {
		method: 'GET',
		query: {
			q: query.trim(),
			limit,
			offset,
			fields: '*category_children, *parent_category',
		},
		headers,
		next,
		cache: 'force-cache',
	});
};
