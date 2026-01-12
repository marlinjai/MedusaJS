import { MetadataRoute } from 'next';
import { getBaseURL } from '@lib/util/env';
import { listCategories } from '@lib/data/categories';
import { listProducts } from '@lib/data/products';
import { listCollections } from '@lib/data/collections';
import { HttpTypes } from '@medusajs/types';

async function fetchAllProducts(
	countryCode: string
): Promise<HttpTypes.StoreProduct[]> {
	const allProducts: HttpTypes.StoreProduct[] = [];
	let page = 1;
	const limit = 100;

	while (true) {
		const { response } = await listProducts({
			pageParam: page,
			queryParams: { limit },
			countryCode,
		});

		allProducts.push(...response.products);

		if (response.products.length < limit) break;
		page++;
	}

	return allProducts;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const baseUrl = getBaseURL();
	const countryCode = 'de';

	// Static pages
	const staticPages: MetadataRoute.Sitemap = [
		{
			url: `${baseUrl}/${countryCode}`,
			lastModified: new Date(),
			changeFrequency: 'weekly',
			priority: 1.0,
		},
		{
			url: `${baseUrl}/${countryCode}/store`,
			lastModified: new Date(),
			changeFrequency: 'daily',
			priority: 0.9,
		},
		{
			url: `${baseUrl}/${countryCode}/privacy`,
			lastModified: new Date(),
			changeFrequency: 'monthly',
			priority: 0.3,
		},
		{
			url: `${baseUrl}/${countryCode}/terms`,
			lastModified: new Date(),
			changeFrequency: 'monthly',
			priority: 0.3,
		},
	];

	try {
		// Fetch dynamic content in parallel
		const [products, categories, collectionsData] = await Promise.all([
			fetchAllProducts(countryCode),
			listCategories(),
			listCollections({}),
		]);

		// Product URLs
		const productUrls: MetadataRoute.Sitemap = products.map((product) => ({
			url: `${baseUrl}/${countryCode}/products/${product.handle}`,
			lastModified: product.updated_at
				? new Date(product.updated_at)
				: new Date(),
			changeFrequency: 'weekly',
			priority: 0.8,
		}));

		// Category URLs
		const categoryUrls: MetadataRoute.Sitemap = (categories || []).map(
			(category) => ({
				url: `${baseUrl}/${countryCode}/categories/${category.handle}`,
				lastModified: new Date(),
				changeFrequency: 'weekly',
				priority: 0.7,
			})
		);

		// Collection URLs
		const collectionUrls: MetadataRoute.Sitemap = (
			collectionsData?.collections || []
		).map((collection) => ({
			url: `${baseUrl}/${countryCode}/collections/${collection.handle}`,
			lastModified: new Date(),
			changeFrequency: 'weekly',
			priority: 0.7,
		}));

		return [...staticPages, ...productUrls, ...categoryUrls, ...collectionUrls];
	} catch (error) {
		console.error('Error generating sitemap:', error);
		// Return at least static pages if API fails
		return staticPages;
	}
}
