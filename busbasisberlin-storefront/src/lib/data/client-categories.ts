// src/lib/data/client-categories.ts
// Client-safe category functions without server-only imports
'use client';

import { sdk } from '@lib/config';
import { HttpTypes } from '@medusajs/types';

export const listCategoriesClient = async (query?: Record<string, any>) => {
	const limit = query?.limit || 100;

	return sdk.client
		.fetch<{ product_categories: HttpTypes.StoreProductCategory[] }>(
			'/store/product-categories',
			{
				query: {
					fields:
						'*category_children, *products, *parent_category, *parent_category.parent_category',
					limit,
					...query,
				},
				cache: 'no-store', // Client-side, no caching
			},
		)
		.then(({ product_categories }) => product_categories);
};

/**
 * Get all categories with basic info (client-safe)
 */
export const getAllCategoriesClient = async (): Promise<
	HttpTypes.StoreProductCategory[]
> => {
	try {
		const response =
			await sdk.client.fetch<HttpTypes.StoreProductCategoryListResponse>(
				`/store/product-categories`,
				{
					query: {
						fields: 'id,name,handle,parent_category_id',
						limit: 1000, // Get all categories
					},
					cache: 'no-store',
				},
			);

		return response.product_categories || [];
	} catch (error) {
		console.error('Failed to get all categories:', error);
		return [];
	}
};
