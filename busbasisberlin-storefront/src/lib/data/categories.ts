// src/lib/data/categories.ts
'use server';

import { sdk } from '@lib/config';
import { HttpTypes } from '@medusajs/types';
import { getAuthHeaders, getCacheOptions } from './cookies';

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
 * Search categories by query
 */
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
