// src/api/admin/meilisearch/configure/route.ts
// Admin endpoint to reconfigure Meilisearch index settings without resyncing data
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { MEILISEARCH_MODULE } from '../../../../modules/meilisearch';
import MeilisearchModuleService from '../../../../modules/meilisearch/service';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
	const logger = req.scope.resolve('logger');

	try {
		logger.info('⚙️ Reconfiguring Meilisearch index settings...');

		const meilisearchService = req.scope.resolve(
			MEILISEARCH_MODULE,
		) as MeilisearchModuleService;

		// Reconfigure product index (applies maxTotalHits: 10000)
		await meilisearchService.ensureIndexConfiguration('product');
		logger.info('✅ Product index configuration completed');

		// Reconfigure category index
		await meilisearchService.ensureIndexConfiguration('category');
		logger.info('✅ Category index configuration completed');

		res.json({
			success: true,
			message:
				'Meilisearch indexes reconfigured successfully (maxTotalHits: 10000 applied)',
		});
	} catch (error) {
		logger.error('❌ Failed to reconfigure Meilisearch indexes:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to reconfigure indexes',
			details: error instanceof Error ? error.message : 'Unknown error',
		});
	}
}
