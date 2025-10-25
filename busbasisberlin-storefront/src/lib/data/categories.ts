import { sdk } from '@lib/config';
import { HttpTypes } from '@medusajs/types';
import { getCacheOptions } from './cookies';

export const listCategories = async (query?: Record<string, any>) => {
	const next = {
		...(await getCacheOptions('categories')),
	};

	const limit = query?.limit || 100;

	return sdk.client
		.fetch<{ product_categories: HttpTypes.StoreProductCategory[] }>(
			'/store/product-categories',
			{
				query: {
					fields:
						'*category_children, *products, *parent_category, *parent_category.parent_category, *parent_category.parent_category.parent_category, *parent_category.parent_category.parent_category.parent_category, *parent_category.parent_category.parent_category.parent_category.parent_category',
					limit,
					...query,
				},
				next,
				cache: 'force-cache',
			},
		)
		.then(({ product_categories }) => product_categories);
};

export const getCategoryByHandle = async (categoryHandle: string[]) => {
	const handle = `${categoryHandle.join('/')}`;

	const next = {
		...(await getCacheOptions('categories')),
	};

	return sdk.client
		.fetch<HttpTypes.StoreProductCategoryListResponse>(
			`/store/product-categories`,
			{
				query: {
					fields: '*category_children, *products',
					handle,
				},
				next,
				cache: 'force-cache',
			},
		)
		.then(({ product_categories }) => product_categories[0]);
};

/**
 * Get category ID by handle string
 */
export const getCategoryIdByHandle = async (
	handle: string,
): Promise<string | null> => {
	try {
		const next = {
			...(await getCacheOptions('categories')),
		};

		const response =
			await sdk.client.fetch<HttpTypes.StoreProductCategoryListResponse>(
				`/store/product-categories`,
				{
					query: {
						fields: 'id,handle',
						handle,
					},
					next,
					cache: 'force-cache',
				},
			);

		return response.product_categories?.[0]?.id || null;
	} catch (error) {
		console.error('Failed to get category ID by handle:', error);
		return null;
	}
};

/**
 * Get all child category IDs for a given parent category ID
 */
export const getChildCategoryIds = async (
	parentId: string,
): Promise<string[]> => {
	try {
		const next = {
			...(await getCacheOptions('categories')),
		};

		const response =
			await sdk.client.fetch<HttpTypes.StoreProductCategoryListResponse>(
				`/store/product-categories`,
				{
					query: {
						fields: 'id,parent_category_id',
						parent_category_id: parentId,
						limit: 100,
					},
					next,
					cache: 'force-cache',
				},
			);

		const childIds = response.product_categories?.map(cat => cat.id) || [];

		// Recursively get children of children
		const allChildIds: string[] = [...childIds];
		for (const childId of childIds) {
			const grandChildIds = await getChildCategoryIds(childId);
			allChildIds.push(...grandChildIds);
		}

		return allChildIds;
	} catch (error) {
		console.error('Failed to get child category IDs:', error);
		return [];
	}
};

/**
 * Get all categories with basic info
 */
export const getAllCategories = async (): Promise<
	HttpTypes.StoreProductCategory[]
> => {
	try {
		const next = {
			...(await getCacheOptions('categories')),
		};

		const response =
			await sdk.client.fetch<HttpTypes.StoreProductCategoryListResponse>(
				`/store/product-categories`,
				{
					query: {
						fields: 'id,name,handle,parent_category_id',
						limit: 1000, // Get all categories
					},
					next,
					cache: 'force-cache',
				},
			);

		return response.product_categories || [];
	} catch (error) {
		console.error('Failed to get all categories:', error);
		return [];
	}
};
