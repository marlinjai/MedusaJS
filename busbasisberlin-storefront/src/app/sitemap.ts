import { MetadataRoute } from 'next';
import { getBaseURL } from '@lib/util/env';
import { listCategories } from '@lib/data/categories';
import { listProducts } from '@lib/data/products';
import { listCollections } from '@lib/data/collections';

const PRODUCTS_PER_SITEMAP = 500;
const countryCode = 'de';

// Generate sitemap index with multiple sitemaps
// Sitemap 0: Static pages, categories, collections
// Sitemaps 1+: Products (500 per sitemap)
export async function generateSitemaps() {
	try {
		// Get total product count to calculate number of product sitemaps
		const { response } = await listProducts({
			pageParam: 1,
			queryParams: { limit: 1 },
			countryCode,
		});

		const totalProducts = response.count || 0;
		const productSitemapCount = Math.ceil(totalProducts / PRODUCTS_PER_SITEMAP);

		// Sitemap 0 = static/categories/collections, Sitemaps 1+ = products
		const sitemaps = [{ id: 0 }];
		for (let i = 1; i <= productSitemapCount; i++) {
			sitemaps.push({ id: i });
		}

		return sitemaps;
	} catch (error) {
		console.error('Error generating sitemap index:', error);
		// Return at least the static sitemap
		return [{ id: 0 }];
	}
}

export default async function sitemap({
	id,
}: {
	id: number;
}): Promise<MetadataRoute.Sitemap> {
	const baseUrl = getBaseURL();

	// Sitemap 0: Static pages, categories, and collections
	if (id === 0) {
		return generateStaticSitemap(baseUrl);
	}

	// Sitemaps 1+: Products (paginated)
	return generateProductSitemap(baseUrl, id);
}

async function generateStaticSitemap(
	baseUrl: string
): Promise<MetadataRoute.Sitemap> {
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
		const [categories, collectionsData] = await Promise.all([
			listCategories(),
			listCollections({}),
		]);

		// Category URLs
		const categoryUrls: MetadataRoute.Sitemap = (categories || []).map(
			(category) => ({
				url: `${baseUrl}/${countryCode}/categories/${category.handle}`,
				lastModified: new Date(),
				changeFrequency: 'weekly' as const,
				priority: 0.7,
			})
		);

		// Collection URLs
		const collectionUrls: MetadataRoute.Sitemap = (
			collectionsData?.collections || []
		).map((collection) => ({
			url: `${baseUrl}/${countryCode}/collections/${collection.handle}`,
			lastModified: new Date(),
			changeFrequency: 'weekly' as const,
			priority: 0.7,
		}));

		return [...staticPages, ...categoryUrls, ...collectionUrls];
	} catch (error) {
		console.error('Error generating static sitemap:', error);
		return staticPages;
	}
}

async function generateProductSitemap(
	baseUrl: string,
	sitemapId: number
): Promise<MetadataRoute.Sitemap> {
	try {
		// Use pageParam for proper pagination (sitemapId 1 = page 1, etc.)
		// The listProducts function calculates offset internally based on pageParam
		const { response } = await listProducts({
			pageParam: sitemapId,
			queryParams: {
				limit: PRODUCTS_PER_SITEMAP,
			},
			countryCode,
		});

		return (response.products || []).map((product) => ({
			url: `${baseUrl}/${countryCode}/products/${product.handle}`,
			lastModified: product.updated_at
				? new Date(product.updated_at)
				: new Date(),
			changeFrequency: 'weekly' as const,
			priority: 0.8,
		}));
	} catch (error) {
		console.error(`Error generating product sitemap ${sitemapId}:`, error);
		return [];
	}
}
