// src/api/admin/meilisearch/search/route.ts
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { MEILISEARCH_MODULE } from '../../../../modules/meilisearch';
import MeilisearchModuleService from '../../../../modules/meilisearch/service';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
	try {
		const meilisearchService = req.scope.resolve(
			MEILISEARCH_MODULE,
		) as MeilisearchModuleService;

		const {
			q = '',
			categories,
			available,
			min_price,
			max_price,
			currency,
			tags,
			collection,
			sort,
			limit = 20,
			offset = 0,
		} = req.query;

		// Build filters based on query parameters
		const filters: string[] = [];

		if (categories) {
			const categoryList = Array.isArray(categories)
				? categories
				: [categories];
			const categoryFilters = categoryList.map(
				cat => `category_names = "${cat}"`,
			);
			if (categoryFilters.length > 1) {
				filters.push(`(${categoryFilters.join(' OR ')})`);
			} else {
				filters.push(categoryFilters[0]);
			}
		}

		if (available !== undefined) {
			filters.push(`is_available = ${available === 'true'}`);
		}

		if (min_price) {
			filters.push(`min_price >= ${min_price}`);
		}

		if (max_price) {
			filters.push(`max_price <= ${max_price}`);
		}

		if (currency) {
			filters.push(`currencies = "${currency}"`);
		}

		if (tags) {
			const tagList = Array.isArray(tags) ? tags : [tags];
			const tagFilters = tagList.map(tag => `tags = "${tag}"`);
			if (tagFilters.length > 1) {
				filters.push(`(${tagFilters.join(' OR ')})`);
			} else {
				filters.push(tagFilters[0]);
			}
		}

		if (collection) {
			filters.push(`collection_handle = "${collection}"`);
		}

		// Build sort options
		const sortOptions: string[] = [];
		if (sort) {
			const sortList = Array.isArray(sort) ? sort : [sort];
			sortOptions.push(...(sortList as string[]));
		}

		// Perform search with facets
		const searchResults = await meilisearchService.searchWithFacets(
			q as string,
			{
				filters: filters.length > 0 ? filters : undefined,
				sort: sortOptions.length > 0 ? sortOptions : undefined,
				limit: parseInt(limit as string),
				offset: parseInt(offset as string),
			},
		);

		res.json({
			success: true,
			data: {
				hits: searchResults.hits,
				facetDistribution: searchResults.facetDistribution,
				totalHits: searchResults.estimatedTotalHits,
				query: q,
				filters: filters,
				processingTimeMs: searchResults.processingTimeMs,
			},
		});
	} catch (error) {
		console.error('Meilisearch search error:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to perform search',
			details: error instanceof Error ? error.message : 'Unknown error',
		});
	}
}
