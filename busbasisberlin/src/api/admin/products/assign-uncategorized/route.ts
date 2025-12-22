// busbasisberlin/src/api/admin/products/assign-uncategorized/route.ts
// Admin API route to assign all uncategorized products to the default category

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { assignUncategorizedProductsWorkflow } from '../../../../workflows/assign-uncategorized-products';

type AssignUncategorizedBody = {
	dryRun?: boolean;
};

export const POST = async (
	req: MedusaRequest<AssignUncategorizedBody>,
	res: MedusaResponse,
): Promise<void> => {
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	try {
		const { dryRun = false } = req.body || {};

		logger.info('[ASSIGN-UNCATEGORIZED-API] Starting workflow...');
		logger.info(`[ASSIGN-UNCATEGORIZED-API] Dry run: ${dryRun}`);

		// Send immediate response that process has started
		res.status(202).json({
			message: dryRun
				? 'Dry run started - checking uncategorized products'
				: 'Product assignment started in background',
			status: 'processing',
		});

		// Run workflow in background
		(async () => {
			try {
				// Run the assignment workflow
				// Using batchLinkProductsToCategoryWorkflow automatically:
				// - Emits product.updated events
				// - Triggers Meilisearch sync via subscribers
				// - Invalidates cache
				// - No manual sync needed!
				const { result } = await assignUncategorizedProductsWorkflow(req.scope).run({
					input: {
						dryRun,
					},
				});

				logger.info(
					`[ASSIGN-UNCATEGORIZED-API] Workflow completed - ` +
					`Category: ${result.categoryName} (${result.categoryId}), ` +
					`Total: ${result.totalProducts}, Updated: ${result.updatedProducts}, ` +
					`DryRun: ${dryRun}`
				);

				logger.info('[ASSIGN-UNCATEGORIZED-API] ✅ Products will auto-sync to Meilisearch via event system');
				logger.info('[ASSIGN-UNCATEGORIZED-API] ✅ Process completed successfully');
			} catch (error: any) {
				logger.error(`[ASSIGN-UNCATEGORIZED-API] ❌ Error during background processing: ${error.message}`);
				if (error.stack) {
					logger.error(`[ASSIGN-UNCATEGORIZED-API] Stack trace: ${error.stack}`);
				}
			}
		})();
	} catch (error: any) {
		logger.error('[ASSIGN-UNCATEGORIZED-API] Error starting workflow:', error);
		res.status(500).json({
			error: 'Failed to start workflow',
			message: error.message,
		});
	}
};

// GET endpoint to check status and get info about uncategorized products
export const GET = async (
	req: MedusaRequest,
	res: MedusaResponse,
): Promise<void> => {
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	try {
		const query = req.scope.resolve('query');

		// Use query.graph with caching DISABLED for accurate real-time count
		// Per Medusa docs: cache.enable: false prevents stale data
		// https://docs.medusajs.com/resources/medusa-container-resources/query#cache-query
		const allProductsResult = await query.graph(
			{
				entity: 'product',
				fields: ['id', 'title', 'categories.id'],
				pagination: {
					take: 10000,
					skip: 0,
				},
			},
			{
				cache: {
					enable: false, // Disable cache for accurate count
				},
			},
		);

		const allProducts = allProductsResult?.data || [];

		// Filter products that have no categories
		const uncategorizedProducts = allProducts.filter((product: any) => {
			return !product.categories || product.categories.length === 0;
		});

		logger.info(
			`[ASSIGN-UNCATEGORIZED-API-GET] Found ${uncategorizedProducts.length} uncategorized out of ${allProducts.length} total products`,
		);

		// Check if default category exists
		const categoryResult = await query.graph({
			entity: 'product_category',
			fields: ['id', 'name', 'handle'],
			filters: {
				handle: 'ohne-kategorie',
			},
			pagination: {
				take: 1,
			},
		});

		const defaultCategory = categoryResult?.data?.[0] || null;

		res.json({
			totalProducts: allProducts.length,
			uncategorizedCount: uncategorizedProducts.length,
			defaultCategory: defaultCategory
				? {
						id: defaultCategory.id,
						name: defaultCategory.name,
						handle: defaultCategory.handle,
					}
				: null,
			examples: uncategorizedProducts.slice(0, 10).map((p: any) => ({
				id: p.id,
				title: p.title,
			})),
		});
	} catch (error: any) {
		logger.error('[ASSIGN-UNCATEGORIZED-API] Error fetching info:', error);
		res.status(500).json({
			error: 'Failed to fetch uncategorized products info',
			message: error.message,
		});
	}
};

