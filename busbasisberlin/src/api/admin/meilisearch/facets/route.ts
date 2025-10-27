// src/api/admin/meilisearch/facets/route.ts
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { MEILISEARCH_MODULE } from '../../../../modules/meilisearch';
import MeilisearchModuleService from '../../../../modules/meilisearch/service';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
	try {
		const meilisearchService = req.scope.resolve(
			MEILISEARCH_MODULE,
		) as MeilisearchModuleService;

		const { type = 'product' } = req.query;

		if (type === 'category') {
			// Get facet distribution for category attributes
			const categoryFacetResults =
				await meilisearchService.getFacetDistribution(
					['parent_category_id', 'is_active', 'is_internal'],
					'category',
				);

			res.json({
				success: true,
				data: {
					facets: categoryFacetResults.facetDistribution,
					totalCategories: categoryFacetResults.estimatedTotalHits,
					processingTimeMs: categoryFacetResults.processingTimeMs,
				},
			});
		} else {
			// Get facet distribution for product attributes
			const productFacetResults = await meilisearchService.getFacetDistribution(
				[
					'hierarchical_categories.lvl0',
					'hierarchical_categories.lvl1',
					'hierarchical_categories.lvl2',
					'is_available',
					'currencies',
					'tags',
					'collection_title',
					'status',
				],
				'product',
			);

			res.json({
				success: true,
				data: {
					facets: productFacetResults.facetDistribution,
					totalProducts: productFacetResults.estimatedTotalHits,
					processingTimeMs: productFacetResults.processingTimeMs,
				},
			});
		}
	} catch (error) {
		console.error('Meilisearch facets error:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to retrieve facets',
			details: error instanceof Error ? error.message : 'Unknown error',
		});
	}
}
