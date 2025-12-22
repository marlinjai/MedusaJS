// busbasisberlin/src/workflows/assign-uncategorized-products.ts
// Workflow to assign all uncategorized products to the default "Ohne Kategorie" category
// Following Medusa best practices: uses workflows instead of direct SQL

import {
	createWorkflow,
	WorkflowResponse,
	createStep,
	StepResponse,
} from '@medusajs/framework/workflows-sdk';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { batchLinkProductsToCategoryWorkflow } from '@medusajs/medusa/core-flows';

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

		// Use query.graph with caching DISABLED for accurate real-time data
		// Per Medusa docs: cache.enable: false ensures fresh data from database
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
				// Disable caching to get accurate uncategorized count
				// https://docs.medusajs.com/resources/medusa-container-resources/query#cache-query
				cache: {
					enable: false,
				},
			},
		);

		const allProducts = allProductsResult?.data || [];
		logger.info(`[ASSIGN-UNCATEGORIZED] Found ${allProducts.length} total products (cache disabled)`);

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

		// #region agent log
		fetch('http://127.0.0.1:7242/ingest/8dec15ee-be69-4a0f-a1bf-ccc71cc82934',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'assign-uncategorized-products.ts:ENTRY',message:'Step entry',data:{categoryId:input.categoryId,categoryName:input.categoryName,productCount:input.productIds.length,firstFiveProducts:input.productIds.slice(0,5)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
		// #endregion

		logger.info(
			`[ASSIGN-UNCATEGORIZED] Assigning ${input.productIds.length} products to category ${input.categoryName}...`,
		);

		if (input.productIds.length === 0) {
			logger.info('[ASSIGN-UNCATEGORIZED] No products to update');
			return new StepResponse({ updatedCount: 0 });
		}

		const BATCH_SIZE = 100; // Medusa workflows can handle larger batches
		let updatedCount = 0;
		let actuallyLinkedCount = 0; // Track real success vs assumed success

		// Use Medusa's official batchLinkProductsToCategoryWorkflow
		// This ensures: events are emitted, cache is invalidated, Meilisearch syncs
		// https://docs.medusajs.com/resources/commerce-modules/product/workflows

		for (let i = 0; i < input.productIds.length; i += BATCH_SIZE) {
			const batch = input.productIds.slice(i, i + BATCH_SIZE);
			logger.info(
				`[ASSIGN-UNCATEGORIZED] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(input.productIds.length / BATCH_SIZE)} (${batch.length} products)...`,
			);

			// #region agent log
			fetch('http://127.0.0.1:7242/ingest/8dec15ee-be69-4a0f-a1bf-ccc71cc82934',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'assign-uncategorized-products.ts:BEFORE_BATCH',message:'Before batch workflow call',data:{batchNumber:Math.floor(i/BATCH_SIZE)+1,batchSize:batch.length,categoryId:input.categoryId,sampleProductIds:batch.slice(0,3),workflowInput:{id:input.categoryId,add:batch}},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
			// #endregion

			try {
				// Use official Medusa workflow for category linking
				// This automatically handles: events, cache, Meilisearch sync, compensation
				const result = await batchLinkProductsToCategoryWorkflow(container).run({
					input: {
						id: input.categoryId,
						add: batch, // Correct property name per Medusa API
					},
				});

				// #region agent log
				fetch('http://127.0.0.1:7242/ingest/8dec15ee-be69-4a0f-a1bf-ccc71cc82934',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'assign-uncategorized-products.ts:AFTER_BATCH_SUCCESS',message:'Batch workflow completed',data:{batchNumber:Math.floor(i/BATCH_SIZE)+1,workflowResult:result,resultType:typeof result,hasResult:!!result,resultKeys:result?Object.keys(result):null},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
				// #endregion

				updatedCount += batch.length;
				actuallyLinkedCount += batch.length; // Assume success if no error

				logger.info(
					`[ASSIGN-UNCATEGORIZED] ✓ Batch ${Math.floor(i / BATCH_SIZE) + 1} complete: ${batch.length} products linked to category`,
				);
			} catch (error: any) {
				// #region agent log
				fetch('http://127.0.0.1:7242/ingest/8dec15ee-be69-4a0f-a1bf-ccc71cc82934',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'assign-uncategorized-products.ts:BATCH_ERROR',message:'Batch workflow failed',data:{batchNumber:Math.floor(i/BATCH_SIZE)+1,errorMessage:error.message,errorStack:error.stack,errorName:error.name},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
				// #endregion

				logger.error(
					`[ASSIGN-UNCATEGORIZED] ✗ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`,
					error.message,
				);

				// Try individual products if batch fails (helps identify problematic products)
				logger.info(
					`[ASSIGN-UNCATEGORIZED] Retrying products individually for batch ${Math.floor(i / BATCH_SIZE) + 1}...`,
				);

				for (const productId of batch) {
					try {
						const individualResult = await batchLinkProductsToCategoryWorkflow(container).run({
							input: {
								id: input.categoryId,
								add: [productId], // Correct property name per Medusa API
							},
						});

						// #region agent log
						fetch('http://127.0.0.1:7242/ingest/8dec15ee-be69-4a0f-a1bf-ccc71cc82934',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'assign-uncategorized-products.ts:INDIVIDUAL_SUCCESS',message:'Individual product linked',data:{productId:productId,result:individualResult},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
						// #endregion

						updatedCount++;
						actuallyLinkedCount++;
					} catch (individualError: any) {
						// #region agent log
						fetch('http://127.0.0.1:7242/ingest/8dec15ee-be69-4a0f-a1bf-ccc71cc82934',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'assign-uncategorized-products.ts:INDIVIDUAL_ERROR',message:'Individual product link failed',data:{productId:productId,errorMessage:individualError.message,errorType:individualError.name},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
						// #endregion

						logger.error(
							`[ASSIGN-UNCATEGORIZED] Failed to link product ${productId}:`,
							individualError.message,
						);
					}
				}
			}
		}

		// #region agent log
		fetch('http://127.0.0.1:7242/ingest/8dec15ee-be69-4a0f-a1bf-ccc71cc82934',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'assign-uncategorized-products.ts:STEP_EXIT',message:'Step complete',data:{totalProductsToAssign:input.productIds.length,updatedCount:updatedCount,actuallyLinkedCount:actuallyLinkedCount,discrepancy:input.productIds.length-actuallyLinkedCount},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
		// #endregion

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

