// src/api/admin/meilisearch/categories/route.ts
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
			parent_category_id,
			is_active,
			limit = 20,
			offset = 0,
		} = req.query;

		// Build filters based on query parameters
		const filters: string[] = [];

		if (parent_category_id) {
			if (parent_category_id === 'null' || parent_category_id === 'root') {
				filters.push('parent_category_id IS NULL');
			} else {
				filters.push(`parent_category_id = "${parent_category_id}"`);
			}
		}

		if (is_active !== undefined) {
			filters.push(`is_active = ${is_active === 'true'}`);
		}

		// Perform search with facets
		const searchResults = await meilisearchService.searchWithFacets(
			q as string,
			{
				filters: filters.length > 0 ? filters : undefined,
				facets: ['parent_category_id', 'is_active', 'is_internal'],
				sort: ['rank:asc', 'name:asc'],
				limit: parseInt(limit as string),
				offset: parseInt(offset as string),
			},
			'category',
		);

		res.json({
			success: true,
			data: {
				categories: searchResults.hits,
				facetDistribution: searchResults.facetDistribution,
				totalHits: searchResults.estimatedTotalHits,
				query: q,
				filters: filters,
				processingTimeMs: searchResults.processingTimeMs,
			},
		});
	} catch (error) {
		console.error('Meilisearch category search error:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to search categories',
			details: error instanceof Error ? error.message : 'Unknown error',
		});
	}
}
