// Debug API to compare products between search modal and store page
import { NextRequest, NextResponse } from 'next/server';

const MEILISEARCH_HOST =
	process.env.NEXT_PUBLIC_MEILISEARCH_HOST ||
	(process.env.NODE_ENV === 'production'
		? 'https://basiscamp-berlin.de/search'
		: 'http://localhost:7700');
const MEILISEARCH_API_KEY = process.env.NEXT_PUBLIC_MEILISEARCH_API_KEY || '';
const INDEX_NAME = process.env.NEXT_PUBLIC_MEILISEARCH_INDEX_NAME || 'products';

export async function GET(req: NextRequest) {
	try {
		// Fetch ALL products (like search modal)
		const allProductsResponse = await fetch(
			`${MEILISEARCH_HOST}/indexes/${INDEX_NAME}/search`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${MEILISEARCH_API_KEY}`,
				},
				body: JSON.stringify({
					q: '',
					filter: 'NOT is_internal_only = true AND min_price > 0',
					limit: 10000,
					attributesToRetrieve: [
						'id',
						'title',
						'hierarchical_categories',
						'is_internal_only',
						'min_price',
						'primary_sales_channel',
					],
				}),
			},
		);

		const allProductsData = await allProductsResponse.json();
		const allProducts = allProductsData.hits || [];

		// Fetch products from FIRST category (like store page after auto-select)
		// First, get the categories to find the first one
		const categoriesResponse = await fetch(
			`${MEILISEARCH_HOST}/indexes/${INDEX_NAME}/search`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${MEILISEARCH_API_KEY}`,
				},
				body: JSON.stringify({
					q: '',
					filter: 'NOT is_internal_only = true AND min_price > 0',
					limit: 1,
					facets: ['hierarchical_categories.lvl0'],
				}),
			},
		);

		const categoriesData = await categoriesResponse.json();
		const firstCategory = Object.keys(
			categoriesData.facetDistribution?.['hierarchical_categories.lvl0'] || {},
		)[0];

		if (!firstCategory) {
			return NextResponse.json({
				error: 'No categories found',
			});
		}

		// Fetch products from first category
		const categoryProductsResponse = await fetch(
			`${MEILISEARCH_HOST}/indexes/${INDEX_NAME}/search`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${MEILISEARCH_API_KEY}`,
				},
				body: JSON.stringify({
					q: '',
					filter: `NOT is_internal_only = true AND min_price > 0 AND hierarchical_categories.lvl0 = "${firstCategory}"`,
					limit: 10000,
					attributesToRetrieve: ['id', 'title'],
				}),
			},
		);

		const categoryProductsData = await categoryProductsResponse.json();
		const categoryProducts = categoryProductsData.hits || [];

		// Find products that are in ALL but not in CATEGORY
		const categoryProductIds = new Set(
			categoryProducts.map((p: any) => p.id),
		);
		const extraProducts = allProducts.filter(
			(p: any) => !categoryProductIds.has(p.id),
		);

		// Get category distribution for extra products
		const extraProductCategories: Record<string, number> = {};
		extraProducts.forEach((p: any) => {
			const cat = p.hierarchical_categories?.lvl0 || 'No Category';
			extraProductCategories[cat] = (extraProductCategories[cat] || 0) + 1;
		});

		return NextResponse.json({
			firstCategory,
			totalInModal: allProducts.length,
			totalInCategoryPage: categoryProducts.length,
			difference: allProducts.length - categoryProducts.length,
			extraProductsCount: extraProducts.length,
			extraProductsPreview: extraProducts.slice(0, 10).map((p: any) => ({
				id: p.id,
				title: p.title,
				category: p.hierarchical_categories?.lvl0 || 'No Category',
				is_internal_only: p.is_internal_only,
				min_price: p.min_price,
				sales_channel: p.primary_sales_channel?.name || 'Unknown',
			})),
			extraProductsByCategory: extraProductCategories,
		});
	} catch (error: any) {
		return NextResponse.json(
			{
				error: error.message,
				stack: error.stack,
			},
			{ status: 500 },
		);
	}
}

