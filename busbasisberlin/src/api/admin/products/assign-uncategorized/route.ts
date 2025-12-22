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

				logger.info(
					`[ASSIGN-UNCATEGORIZED-API] Workflow completed - ` +
					`Category: ${result.categoryName} (${result.categoryId}), ` +
					`Total: ${result.totalProducts}, Updated: ${result.updatedProducts}, ` +
					`DryRun: ${dryRun}`
				);

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

					// CRITICAL: Sync the "Ohne Kategorie" category AFTER products are synced
					// This ensures has_public_products is calculated correctly
					logger.info('[ASSIGN-UNCATEGORIZED-API] Syncing category to update has_public_products flag...');
					const { syncCategoriesWorkflow } = await import('../../../../workflows/sync-categories');
					await syncCategoriesWorkflow(req.scope).run({
						input: {
							filters: {
								id: result.categoryId,
							},
							limit: 1,
						},
					});
					logger.info('[ASSIGN-UNCATEGORIZED-API] ✅ Category synced with updated product count');
				}

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
		const knex = req.scope.resolve('db');

		// Use raw SQL to get accurate count (bypasses Medusa caching)
		const uncategorizedQuery = await knex.raw(`
			SELECT COUNT(*) as count
			FROM product p
			LEFT JOIN product_category_product pcp ON p.id = pcp.product_id
			WHERE pcp.product_id IS NULL
		`);

		const uncategorizedCount = parseInt(uncategorizedQuery.rows[0]?.count || '0');

		const totalProductsQuery = await knex.raw(`
			SELECT COUNT(*) as count FROM product
		`);

		const totalProducts = parseInt(totalProductsQuery.rows[0]?.count || '0');

		logger.info(`[ASSIGN-UNCATEGORIZED-API-GET] Database reports ${uncategorizedCount} uncategorized products out of ${totalProducts} total`);

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

		// Get sample uncategorized products if any exist
		let examples = [];
		if (uncategorizedCount > 0) {
			const examplesQuery = await knex.raw(`
				SELECT p.id, p.title
				FROM product p
				LEFT JOIN product_category_product pcp ON p.id = pcp.product_id
				WHERE pcp.product_id IS NULL
				LIMIT 10
			`);
			examples = examplesQuery.rows || [];
		}

		res.json({
			totalProducts,
			uncategorizedCount,
			defaultCategory: defaultCategory
				? {
						id: defaultCategory.id,
						name: defaultCategory.name,
						handle: defaultCategory.handle,
					}
				: null,
			examples: examples.map((p: any) => ({
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

