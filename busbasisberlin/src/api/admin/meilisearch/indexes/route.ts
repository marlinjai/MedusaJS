// src/api/admin/meilisearch/indexes/route.ts
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { MEILISEARCH_MODULE } from '../../../../modules/meilisearch';
import MeilisearchModuleService from '../../../../modules/meilisearch/service';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
	try {
		const meilisearchService = req.scope.resolve(
			MEILISEARCH_MODULE,
		) as MeilisearchModuleService;

		const indexes = await meilisearchService.listIndexes();

		res.json({
			success: true,
			data: indexes,
		});
	} catch (error) {
		console.error('Meilisearch indexes error:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to retrieve indexes',
			details: error instanceof Error ? error.message : 'Unknown error',
		});
	}
}
