'use server';

import { sdk } from '@lib/config';
import { sortProducts } from '@lib/util/sort-products';
import { HttpTypes } from '@medusajs/types';
import { SortOptions } from '@modules/store/components/refinement-list/sort-products';
import { getAuthHeaders, getCacheOptions } from './cookies';
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
				cache: 'no-store',
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
 * This will fetch 100 products to the Next.js cache and sort them based on the sortBy parameter.
 * It will then return the paginated products based on the page and limit parameters.
 */
export const listProductsWithSort = async ({
	page = 0,
	queryParams,
	sortBy = 'created_at',
	countryCode,
}: {
	page?: number;
	queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams;
	sortBy?: SortOptions;
	countryCode: string;
}): Promise<{
	response: { products: HttpTypes.StoreProduct[]; count: number };
	nextPage: number | null;
	queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams;
}> => {
	const limit = queryParams?.limit || 12;

	const {
		response: { products, count },
	} = await listProducts({
		pageParam: 0,
		queryParams: {
			...queryParams,
			limit: 100,
		},
		countryCode,
	});

	const sortedProducts = sortProducts(products, sortBy);

	const pageParam = (page - 1) * limit;

	const nextPage = count > pageParam + limit ? pageParam + limit : null;

	const paginatedProducts = sortedProducts.slice(pageParam, pageParam + limit);

	return {
		response: {
			products: paginatedProducts,
			count,
		},
		nextPage,
		queryParams,
	};
};

/**
 * Search products with a query string using Medusa's built-in search functionality
 */
/**
 * Retrieve a single product by handle
 */
export const retrieveProduct = async ({
	handle,
	countryCode,
	regionId,
}: {
	handle: string;
	countryCode?: string;
	regionId?: string;
}): Promise<HttpTypes.StoreProduct | null> => {
	if (!countryCode && !regionId) {
		throw new Error('Country code or region ID is required');
	}

	let region: HttpTypes.StoreRegion | undefined | null;

	if (countryCode) {
		region = await getRegion(countryCode);
	} else {
		region = await retrieveRegion(regionId!);
	}

	if (!region) {
		return null;
	}

	const headers = {
		...(await getAuthHeaders()),
	};

	const next = {
		...(await getCacheOptions('products')),
	};

	try {
		// Fetch products by handle filter
		const { products } = await sdk.client.fetch<{
			products: HttpTypes.StoreProduct[];
			count: number;
		}>(`/store/products`, {
			method: 'GET',
			query: {
				handle,
				region_id: region?.id,
				fields:
					'*variants.calculated_price,+variants.inventory_quantity,+metadata,+tags',
				limit: 1,
			},
			headers,
			next,
			cache: 'no-store',
		});

		// Return the first product or null if not found
		return products.length > 0 ? products[0] : null;
	} catch (error) {
		console.error(`Failed to retrieve product with handle ${handle}:`, error);
		return null;
	}
};

export const searchProducts = async ({
	query,
	page = 1,
	limit = 12,
	countryCode,
	sortBy = 'created_at',
}: {
	query: string;
	page?: number;
	limit?: number;
	countryCode: string;
	sortBy?: SortOptions;
}): Promise<{
	response: { products: HttpTypes.StoreProduct[]; count: number };
	nextPage: number | null;
}> => {
	// Verwende die bestehende listProductsWithSort Funktion mit einem 'q' Parameter
	const queryParams = {
		q: query, // Suchparameter für Medusa API
		limit: 100, // Erhöhe Limit für bessere Sortierung
	};

	const {
		response: { products, count },
	} = await listProductsWithSort({
		page: 1, // Hole alle Ergebnisse für die Sortierung
		queryParams,
		sortBy,
		countryCode,
	});

	// Führe lokale Filterung durch, falls die API keinen 'q' Parameter unterstützt
	const filteredProducts = query.trim()
		? products.filter(
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
		  )
		: products;

	// Paginierung
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
};
