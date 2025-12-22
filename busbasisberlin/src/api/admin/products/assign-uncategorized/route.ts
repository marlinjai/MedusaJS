// busbasisberlin/src/api/admin/products/assign-uncategorized/route.ts
// Admin API route to assign all uncategorized products to the default category

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { assignUncategorizedProductsWorkflow } from '../../../../workflows/assign-uncategorized-products';
import { syncProductsWorkflow } from '../../../../workflows/sync-products';

type AssignUncategorizedBody = {
	dryRun?: boolean;
	syncToMeilisearch?: boolean;
};

export const POST = async (
	req: MedusaRequest<AssignUncategorizedBody>,
	res: MedusaResponse,
): Promise<void> => {
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	try {
		const { dryRun = false, syncToMeilisearch = true } = req.body || {};

		logger.info('[ASSIGN-UNCATEGORIZED-API] Starting workflow...');
		logger.info(`[ASSIGN-UNCATEGORIZED-API] Dry run: ${dryRun}`);
		logger.info(`[ASSIGN-UNCATEGORIZED-API] Sync to Meilisearch: ${syncToMeilisearch}`);

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
				const { result } = await assignUncategorizedProductsWorkflow(req.scope).run({
					input: {
						dryRun,
					},
				});

				logger.info('[ASSIGN-UNCATEGORIZED-API] Workflow completed:', {
					categoryId: result.categoryId,
					categoryName: result.categoryName,
					totalProducts: result.totalProducts,
					updatedProducts: result.updatedProducts,
					dryRun,
				});

				if (!dryRun && syncToMeilisearch && result.updatedProducts > 0) {
					logger.info('[ASSIGN-UNCATEGORIZED-API] Syncing products to Meilisearch...');

					// Sync updated products to Meilisearch
					let offset = 0;
					const limit = 100;
					let hasMore = true;
					let totalSynced = 0;

					while (hasMore) {
						const {
							result: { products, metadata },
						} = await syncProductsWorkflow(req.scope).run({
							input: {
								limit,
								offset,
							},
						});

						totalSynced += products.length;
						hasMore = offset + limit < (metadata?.count ?? 0);
						offset += limit;

						logger.info(
							`[ASSIGN-UNCATEGORIZED-API] Synced ${totalSynced}/${metadata?.count ?? 0} products to Meilisearch`,
						);
					}

					logger.info(
						`[ASSIGN-UNCATEGORIZED-API] ✅ Successfully synced ${totalSynced} products to Meilisearch`,
					);
				}

				logger.info('[ASSIGN-UNCATEGORIZED-API] ✅ Process completed successfully');
			} catch (error: any) {
				logger.error('[ASSIGN-UNCATEGORIZED-API] ❌ Error during background processing:', {
					error: error.message,
					stack: error.stack,
				});
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

		// Find all products
		const allProductsResult = await query.graph({
			entity: 'product',
			fields: ['id', 'title', 'categories.id'],
			pagination: {
				take: 10000,
				skip: 0,
			},
		});

		const allProducts = allProductsResult?.data || [];

		// Filter products that have no categories
		const uncategorizedProducts = allProducts.filter((product: any) => {
			return !product.categories || product.categories.length === 0;
		});

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

