// busbasisberlin/src/workflows/assign-uncategorized-products.ts
// Workflow to assign all uncategorized products to the default "Ohne Kategorie" category

import {
	createWorkflow,
	WorkflowResponse,
	createStep,
	StepResponse,
} from '@medusajs/framework/workflows-sdk';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

type AssignUncategorizedInput = {
	defaultCategoryId?: string;
	dryRun?: boolean;
};

type AssignUncategorizedOutput = {
	totalProducts: number;
	updatedProducts: number;
	categoryId: string;
	categoryName: string;
	productIds: string[];
};

// Step to find uncategorized products and the default category
const findUncategorizedProductsStep = createStep(
	'find-uncategorized-products',
	async (input: AssignUncategorizedInput, { container }) => {
		const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
		const query = container.resolve('query');

		logger.info('[ASSIGN-UNCATEGORIZED] Finding default category and uncategorized products...');

		// Find or verify the default category
		let categoryId = input.defaultCategoryId;
		let categoryName = 'Ohne Kategorie';

		if (!categoryId) {
			// Find the "Ohne Kategorie" category
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

			if (!categoryResult?.data || categoryResult.data.length === 0) {
				throw new Error(
					'Default category "ohne-kategorie" not found. Please create it first using POST /admin/categories/create-default',
				);
			}

			const category = categoryResult.data[0];
			categoryId = category.id;
			categoryName = category.name;
			logger.info(`[ASSIGN-UNCATEGORIZED] Found category: ${categoryName} (${categoryId})`);
		}

		// Use raw SQL to get truly uncategorized products (bypasses any caching)
		// This is more reliable than query.graph which may return stale data
		const knex = container.resolve('db');

		const uncategorizedProductsQuery = await knex.raw(`
			SELECT p.id, p.title
			FROM product p
			LEFT JOIN product_category_product pcp ON p.id = pcp.product_id
			WHERE pcp.product_id IS NULL
			LIMIT 10000
		`);

		const uncategorizedProducts = uncategorizedProductsQuery.rows || [];

		logger.info(`[ASSIGN-UNCATEGORIZED] Found ${uncategorizedProducts.length} products without categories (using raw SQL)`);

		// Also log the query.graph result for comparison to detect caching issues
		const allProductsResult = await query.graph({
			entity: 'product',
			fields: ['id', 'title', 'categories.id'],
			pagination: {
				take: 10000,
				skip: 0,
			},
		});
		const allProducts = allProductsResult?.data || [];
		const graphUncategorized = allProducts.filter((product: any) => {
			return !product.categories || product.categories.length === 0;
		});
		logger.info(`[ASSIGN-UNCATEGORIZED] query.graph reports ${graphUncategorized.length} uncategorized (may be stale)`);
		logger.info(`[ASSIGN-UNCATEGORIZED] Difference: ${Math.abs(uncategorizedProducts.length - graphUncategorized.length)} products`);

		logger.info(
			`[ASSIGN-UNCATEGORIZED] Found ${uncategorizedProducts.length} products without categories`,
		);

		// Log first 5 uncategorized products as examples
		if (uncategorizedProducts.length > 0) {
			logger.info('[ASSIGN-UNCATEGORIZED] Example uncategorized products:');
			uncategorizedProducts.slice(0, 5).forEach((product: any) => {
				logger.info(`  - ${product.id}: ${product.title}`);
			});
		}

		const productIds = uncategorizedProducts.map((p: any) => p.id);

		return new StepResponse(
			{
				categoryId: categoryId!,
				categoryName,
				productIds,
				totalProducts: uncategorizedProducts.length,
			},
			{
				categoryId: categoryId!,
				productIds,
			},
		);
	},
	async (compensateInput, { container }) => {
		const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
		logger.info('[ASSIGN-UNCATEGORIZED] Compensation: No rollback needed for read operation');
	},
);

// Step to assign products to category
const assignProductsToCategoryStep = createStep(
	'assign-products-to-category',
	async (
		input: {
			categoryId: string;
			categoryName: string;
			productIds: string[];
			totalProducts: number;
			dryRun?: boolean;
		},
		{ container },
	) => {
		const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

		if (input.dryRun) {
			logger.info('[ASSIGN-UNCATEGORIZED] DRY RUN MODE - No products will be updated');
			logger.info(`[ASSIGN-UNCATEGORIZED] Would assign ${input.totalProducts} products to category ${input.categoryName}`);
			return new StepResponse({
				updatedCount: 0,
				dryRun: true,
			});
		}

		if (input.productIds.length === 0) {
			logger.info('[ASSIGN-UNCATEGORIZED] No products to update');
			return new StepResponse({ updatedCount: 0 });
		}

		logger.info(
			`[ASSIGN-UNCATEGORIZED] Assigning ${input.productIds.length} products to category ${input.categoryName}...`,
		);

		let updatedCount = 0;
		const BATCH_SIZE = 50;
		
		// Get database connection for direct SQL operations (more reliable than workflows)
		const knex = container.resolve('db');
		
		// Get event bus to emit product.updated events (triggers Meilisearch auto-sync)
		const eventBusService = container.resolve('eventBusService');
		const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

		// Process in batches to avoid overwhelming the system
		for (let i = 0; i < input.productIds.length; i += BATCH_SIZE) {
			const batch = input.productIds.slice(i, i + BATCH_SIZE);
			logger.info(
				`[ASSIGN-UNCATEGORIZED] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(input.productIds.length / BATCH_SIZE)} (${batch.length} products)...`,
			);

			try {
				// Use raw SQL INSERT to assign products - more reliable than updateProductsWorkflow
				// ON CONFLICT DO NOTHING prevents errors if product is already in category
				const values = batch.map(productId => `('${productId}', '${input.categoryId}')`).join(', ');
				
				await knex.raw(`
					INSERT INTO product_category_product (product_id, product_category_id)
					VALUES ${values}
					ON CONFLICT DO NOTHING
				`);
				
				updatedCount += batch.length;
				
				logger.info(
					`[ASSIGN-UNCATEGORIZED] ✓ Batch ${Math.floor(i / BATCH_SIZE) + 1} complete: ${batch.length} products assigned`,
				);
				
				// Emit product.updated events for Meilisearch auto-sync and other subscribers
				// This ensures category changes are reflected in search index automatically
				logger.info(
					`[ASSIGN-UNCATEGORIZED] Emitting product.updated events for ${batch.length} products...`,
				);
				
				for (const productId of batch) {
					try {
						await eventBusService.emit('product.updated', {
							id: productId,
							// Include metadata about what changed
							metadata: {
								source: 'assign-uncategorized-workflow',
								categoryId: input.categoryId,
								categoryName: input.categoryName,
							},
						});
					} catch (eventError: any) {
						// Log but don't fail the whole batch if event emission fails
						logger.warn(
							`[ASSIGN-UNCATEGORIZED] Failed to emit event for product ${productId}:`,
							eventError.message,
						);
					}
				}
				
				logger.info(
					`[ASSIGN-UNCATEGORIZED] ✓ Events emitted for batch ${Math.floor(i / BATCH_SIZE) + 1}`,
				);
			} catch (error: any) {
				logger.error(
					`[ASSIGN-UNCATEGORIZED] ✗ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`,
					error.message,
				);
				logger.error(`[ASSIGN-UNCATEGORIZED] Failed product IDs:`, batch.join(', '));
				// Continue with next batch even if this one fails
			}
		}

		logger.info(`[ASSIGN-UNCATEGORIZED] Successfully updated ${updatedCount} products`);

		return new StepResponse({
			updatedCount,
		});
	},
	async (compensateInput, { container }) => {
		const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
		logger.info('[ASSIGN-UNCATEGORIZED] Compensation: Products were assigned to category (manual rollback required if needed)');
	},
);

export const assignUncategorizedProductsWorkflow = createWorkflow(
	'assign-uncategorized-products',
	(input: AssignUncategorizedInput) => {
		const { categoryId, categoryName, productIds, totalProducts } =
			findUncategorizedProductsStep(input);

		const { updatedCount } = assignProductsToCategoryStep({
			categoryId,
			categoryName,
			productIds,
			totalProducts,
			dryRun: input.dryRun,
		});

		return new WorkflowResponse({
			categoryId,
			categoryName,
			totalProducts,
			updatedProducts: updatedCount,
			productIds,
		});
	},
);

