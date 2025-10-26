// src/api/store/catalog/route.ts
// Store-facing catalog endpoint for browsing products with faceted filtering
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { MEILISEARCH_MODULE } from '../../../modules/meilisearch';
import MeilisearchModuleService from '../../../modules/meilisearch/service';

type CatalogRequestBody = {
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
	region_id?: string;
};

export async function POST(req: MedusaRequest, res: MedusaResponse) {
	const logger = req.scope.resolve('logger');

	// Define filters in function scope for error handling access
	let filters: string[] = [];

	try {
		// Validate Meilisearch service availability
		let meilisearchService: MeilisearchModuleService;
		try {
			meilisearchService = req.scope.resolve(
				MEILISEARCH_MODULE,
			) as MeilisearchModuleService;
		} catch (moduleError) {
			logger.warn('Meilisearch module not available:');
			return res.status(503).json({
				success: false,
				error: 'Catalog service unavailable',
				details: 'Meilisearch module not configured or loaded',
			});
		}

		// Parse request body with defaults for catalog browsing
		const {
			query = '', // Empty query = show all products
			categories = [],
			availability = 'all',
			minPrice,
			maxPrice,
			tags = [],
			collections = [],
			sortBy = 'created_at',
			page = 1,
			limit = 12,
			region_id,
		} = (req.body || {}) as CatalogRequestBody;

		// Validate and parse parameters
		const parsedPage = Math.max(1, Number(page) || 1);
		const parsedLimit = Math.max(1, Math.min(100, Number(limit) || 12));
		const parsedOffset = (parsedPage - 1) * parsedLimit;

		// Build comprehensive filters for catalog browsing
		filters = [];

		// CRITICAL: Filter by Public Store sales channel only
		// This ensures only public e-commerce products are shown, not internal or service products
		filters.push(`(primary_sales_channel_name = "Default Sales Channel")`);

		// Category filtering with hierarchy support
		// When a parent category is selected, show all products in parent AND children
		//
		// IMPORTANT: category_paths is an array of full paths like:
		// ["Mercedes Benz > Motor > Dichtungen", "Mercedes Benz > Karosserie > Bolzen"]
		//
		// To match a parent category like "Mercedes Benz", we need to:
		// 1. Match category_names (products directly in parent)
		// 2. Match category_paths that START with "Parent >" pattern
		//
		// Since Meilisearch doesn't support substring/startsWith on filters,
		// we use an alternative: match exact category_names which includes
		// parents (from backend aggregation)
		if (categories.length > 0) {
			const categoryFilters = categories.map(categoryName => {
				// Escape quotes in category name for filter syntax
				const escapedName = categoryName.replace(/"/g, '\\"');

				// This matches products whose category_names array contains this category
				// The backend ensures category_names includes all categories in the path
				return `category_names = "${escapedName}"`;
			});

			if (categoryFilters.length > 0) {
				filters.push(`(${categoryFilters.join(' OR ')})`);
			}
		}

		// Availability filtering
		if (availability !== 'all') {
			filters.push(`is_available = ${availability === 'in_stock'}`);
		}

		// Price range filtering
		if (minPrice !== undefined && !isNaN(minPrice) && minPrice > 0) {
			filters.push(`min_price >= ${minPrice}`);
		}
		if (maxPrice !== undefined && !isNaN(maxPrice) && maxPrice > 0) {
			filters.push(`max_price <= ${maxPrice}`);
		}

		// Tags filtering
		if (tags.length > 0) {
			const tagFilters = tags.map(tag => `tags = "${tag}"`);
			if (tagFilters.length > 1) {
				filters.push(`(${tagFilters.join(' OR ')})`);
			} else {
				filters.push(tagFilters[0]);
			}
		}

		// Collections filtering
		if (collections.length > 0) {
			const collectionFilters = collections.map(
				collection => `collection_title = "${collection}"`,
			);
			if (collectionFilters.length > 1) {
				filters.push(`(${collectionFilters.join(' OR ')})`);
			} else {
				filters.push(collectionFilters[0]);
			}
		}

		// Convert sort options to Meilisearch format
		const sortOptions: string[] = [];
		switch (sortBy) {
			case 'price_asc':
				sortOptions.push('min_price:asc');
				break;
			case 'price_desc':
				sortOptions.push('min_price:desc');
				break;
			case 'title_asc':
				sortOptions.push('title:asc');
				break;
			case 'title_desc':
				sortOptions.push('title:desc');
				break;
			case 'created_at':
			default:
				sortOptions.push('created_at:desc');
				break;
		}

		// Define comprehensive facets for catalog browsing
		const catalogFacets = [
			'category_names',
			'category_paths',
			'sales_channel_names',
			'is_available',
			'currencies',
			'tags',
			'collection_title',
			'status',
		];

		logger.info(
			`Catalog request: query="${query.substring(0, 50)}", categories=${categories.length}, availability=${availability}, sortBy=${sortBy}, page=${parsedPage}, limit=${parsedLimit}, filters=${filters.length}`,
		);

		// Perform catalog search with comprehensive facets
		const catalogResults = await meilisearchService.searchWithFacets(
			query, // Empty string for "show all" behavior
			{
				filters: filters.length > 0 ? filters : undefined,
				facets: catalogFacets,
				sort: sortOptions,
				limit: parsedLimit,
				offset: parsedOffset,
			},
			'product',
		);

		// Get accurate total count
		// Meilisearch returns totalHits (exact) or estimatedTotalHits (capped at maxTotalHits setting)
		// Priority: totalHits > estimatedTotalHits > hits.length
		const totalCount =
			(catalogResults as any).totalHits ??
			catalogResults.estimatedTotalHits ??
			catalogResults.hits.length;

		// Debug: Log Meilisearch response structure
		logger.info(
			`Meilisearch response fields: totalHits=${(catalogResults as any).totalHits}, estimatedTotalHits=${catalogResults.estimatedTotalHits}, hits=${catalogResults.hits.length}`,
		);

		// Calculate pagination
		const totalPages = Math.ceil(totalCount / parsedLimit);

		// Extract parent categories from category_paths to include in facets
		// This ensures parent categories appear even if they don't have direct products
		const enhancedFacets = { ...catalogResults.facetDistribution };

		if (enhancedFacets.category_paths) {
			const parentCategories: Record<string, number> = {};

			// Extract ALL parent categories from all category paths recursively
			Object.entries(enhancedFacets.category_paths).forEach(([path, count]) => {
				const pathParts = path.split(' > ');

				// Type assertion: count from facetDistribution is always a number
				const productCount = count as number;

				// Add ALL parent categories in the path (not just immediate parent)
				// This handles 2, 3, 4+ level hierarchies
				for (let i = 0; i < pathParts.length - 1; i++) {
					const parentName = pathParts[i];

					// Count products that belong to this parent category
					// Each parent gets the count of all its descendants
					parentCategories[parentName] =
						(parentCategories[parentName] || 0) + productCount;
				}
			});

			// Merge parent categories into category_names facet
			if (enhancedFacets.category_names) {
				Object.entries(parentCategories).forEach(([parentName, count]) => {
					enhancedFacets.category_names[parentName] =
						(enhancedFacets.category_names[parentName] || 0) + count;
				});
			} else {
				enhancedFacets.category_names = parentCategories;
			}
		}

		const response = {
			success: true,
			data: {
				products: catalogResults.hits,
				facets: enhancedFacets,
				totalProducts: totalCount,
				appliedFilters: {
					query: query || null,
					categories,
					availability,
					priceRange:
						minPrice || maxPrice ? { min: minPrice, max: maxPrice } : null,
					tags,
					collections,
					sortBy,
				},
				pagination: {
					page: parsedPage,
					limit: parsedLimit,
					total: totalCount,
					totalPages,
					hasNextPage: parsedPage < totalPages,
					hasPrevPage: parsedPage > 1,
				},
				processingTimeMs: catalogResults.processingTimeMs,
			},
		};

		logger.info(
			`Catalog success: ${catalogResults.hits.length} products, total=${totalCount}, time=${catalogResults.processingTimeMs}ms`,
		);

		res.json(response);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error';
		const errorStack = error instanceof Error ? error.stack : undefined;

		logger.error(
			`Catalog error: ${errorMessage}, filters=${filters.join(', ')}`,
		);

		res.status(500).json({
			success: false,
			error: 'Catalog request failed',
			details: errorMessage,
			stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
			filters: filters, // Include filters in error response for debugging
		});
	}
}
