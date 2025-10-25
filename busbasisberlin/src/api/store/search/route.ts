// src/api/store/search/route.ts
// Store-facing search endpoint for text-based product search
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { MEILISEARCH_MODULE } from '../../../modules/meilisearch';
import MeilisearchModuleService from '../../../modules/meilisearch/service';

type SearchRequestBody = {
	query?: string;
	type?: 'products' | 'categories';
	limit?: number;
	offset?: number;
	filters?: string | string[];
	facets?: string | string[];
	sort?: string | string[];
	region_id?: string;
};

export async function POST(req: MedusaRequest, res: MedusaResponse) {
	const logger = req.scope.resolve('logger');

	try {
		// Validate Meilisearch service availability
		let meilisearchService: MeilisearchModuleService;
		try {
			meilisearchService = req.scope.resolve(
				MEILISEARCH_MODULE,
			) as MeilisearchModuleService;
		} catch (moduleError) {
			logger.warn(`Meilisearch module not available: ${moduleError}`);
			return res.status(503).json({
				success: false,
				error: 'Search service unavailable',
				details: 'Meilisearch module not configured or loaded',
			});
		}

		// Parse and validate request body
		const {
			query = '',
			type = 'products',
			limit = 20,
			offset = 0,
			filters,
			facets,
			sort,
			region_id,
		} = (req.body || {}) as SearchRequestBody;

		// Validate required parameters
		if (typeof query !== 'string') {
			return res.status(400).json({
				success: false,
				error: 'Invalid query parameter',
				details: 'Query must be a string',
			});
		}

		if (!['products', 'categories'].includes(type)) {
			return res.status(400).json({
				success: false,
				error: 'Invalid type parameter',
				details: 'Type must be "products" or "categories"',
			});
		}

		// Convert plural to singular for Meilisearch service
		const meilisearchType = type === 'products' ? 'product' : 'category';

		// Safely parse numeric parameters
		const parsedLimit = Math.max(1, Math.min(100, Number(limit) || 20));
		const parsedOffset = Math.max(0, Number(offset) || 0);

		// Convert parameters to proper arrays
		const filterArray = filters
			? Array.isArray(filters)
				? filters.filter(f => typeof f === 'string' && f.trim())
				: typeof filters === 'string' && filters.trim()
					? [filters.trim()]
					: undefined
			: undefined;

		const sortArray = sort
			? Array.isArray(sort)
				? sort.filter(s => typeof s === 'string' && s.trim())
				: typeof sort === 'string' && sort.trim()
					? sort
							.split(',')
							.map(s => s.trim())
							.filter(Boolean)
					: undefined
			: undefined;

		const facetsArray = facets
			? Array.isArray(facets)
				? facets.filter(f => typeof f === 'string' && f.trim())
				: typeof facets === 'string' && facets.trim()
					? facets
							.split(',')
							.map(f => f.trim())
							.filter(Boolean)
					: undefined
			: undefined;

		logger.info(`Store search request: query="${query.substring(0, 50)}" type=${type} limit=${parsedLimit} offset=${parsedOffset} filters=${filterArray?.length || 0} facets=${facetsArray?.length || 0} sort=${sortArray?.length || 0}`);

		// Perform search with facets
		const searchResults = await meilisearchService.searchWithFacets(
			query,
			{
				filters: filterArray,
				facets: facetsArray,
				sort: sortArray,
				limit: parsedLimit,
				offset: parsedOffset,
			},
			meilisearchType,
		);

		// Calculate pagination
		const page = Math.floor(parsedOffset / parsedLimit) + 1;
		const totalPages = Math.ceil(
			searchResults.estimatedTotalHits / parsedLimit,
		);

		const response = {
			success: true,
			data: {
				hits: searchResults.hits,
				facetDistribution: searchResults.facetDistribution,
				totalHits: searchResults.estimatedTotalHits,
				query,
				filters: filterArray || [],
				processingTimeMs: searchResults.processingTimeMs,
				pagination: {
					page,
					limit: parsedLimit,
					total: searchResults.estimatedTotalHits,
					totalPages,
				},
			},
		};

		logger.info(`Store search success: ${searchResults.hits.length} hits, ${searchResults.estimatedTotalHits} total, ${searchResults.processingTimeMs}ms`);

		res.json(response);
	} catch (error) {
		logger.error(`Store search error: ${error}`);
		res.status(500).json({
			success: false,
			error: 'Search failed',
			details: error instanceof Error ? error.message : 'Unknown error',
			stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
		});
	}
}
