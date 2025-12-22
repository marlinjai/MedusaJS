// busbasisberlin/src/workflows/assign-uncategorized-products.ts
// Workflow to assign all uncategorized products to the default "Ohne Kategorie" category

import {
	createWorkflow,
	WorkflowResponse,
	createStep,
	StepResponse,
} from '@medusajs/framework/workflows-sdk';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { updateProductsWorkflow } from '@medusajs/medusa/core-flows';

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

		// Find all products
		const allProductsResult = await query.graph({
			entity: 'product',
			fields: ['id', 'title', 'categories.id'],
			pagination: {
				take: 10000, // Get all products
				skip: 0,
			},
		});

		const allProducts = allProductsResult?.data || [];
		logger.info(`[ASSIGN-UNCATEGORIZED] Found ${allProducts.length} total products`);

		// Filter products that have no categories
		const uncategorizedProducts = allProducts.filter((product: any) => {
			return !product.categories || product.categories.length === 0;
		});

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

		// Process in batches to avoid overwhelming the system
		for (let i = 0; i < input.productIds.length; i += BATCH_SIZE) {
			const batch = input.productIds.slice(i, i + BATCH_SIZE);
			logger.info(
				`[ASSIGN-UNCATEGORIZED] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(input.productIds.length / BATCH_SIZE)}...`,
			);

			// Update each product in the batch
			const updatePromises = batch.map(async (productId: string) => {
				try {
					await updateProductsWorkflow(container).run({
						input: {
							selector: { id: productId },
							update: {
								categories: [{ id: input.categoryId }],
							},
						},
					});
					return true;
				} catch (error: any) {
					logger.error(
						`[ASSIGN-UNCATEGORIZED] Failed to update product ${productId}:`,
						error.message,
					);
					return false;
				}
			});

			const results = await Promise.all(updatePromises);
			const successCount = results.filter(r => r).length;
			updatedCount += successCount;

			logger.info(
				`[ASSIGN-UNCATEGORIZED] Batch complete: ${successCount}/${batch.length} products updated`,
			);
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

