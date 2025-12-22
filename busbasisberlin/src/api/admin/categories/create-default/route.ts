// busbasisberlin/src/api/admin/categories/create-default/route.ts
// Admin API route to create the default "Ohne Kategorie" category

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createProductCategoriesWorkflow } from '@medusajs/medusa/core-flows';

export const POST = async (
	req: MedusaRequest,
	res: MedusaResponse,
): Promise<void> => {
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	try {
		logger.info('[CREATE-DEFAULT-CATEGORY] Creating Ohne Kategorie category...');

		// Check if category already exists
		const query = req.scope.resolve('query');
		const existingCategories = await query.graph({
			entity: 'product_category',
			fields: ['id', 'name', 'handle'],
			filters: {
				handle: 'ohne-kategorie',
			},
			pagination: {
				take: 1,
			},
		});

		if (existingCategories?.data && existingCategories.data.length > 0) {
			const existing = existingCategories.data[0];
			logger.info(
				`[CREATE-DEFAULT-CATEGORY] Category already exists with ID: ${existing.id}`,
			);
			res.json({
				success: true,
				category: existing,
				message: 'Category already exists',
			});
			return;
		}

		// Create the category
		const { result } = await createProductCategoriesWorkflow(req.scope).run({
			input: {
				product_categories: [
					{
						name: 'Ohne Kategorie',
						handle: 'ohne-kategorie',
						description: 'Produkte ohne zugewiesene Kategorie',
						is_active: true,
						is_internal: false,
					},
				],
			},
		});

		const createdCategory = result[0];

		logger.info(
			`[CREATE-DEFAULT-CATEGORY] Successfully created category with ID: ${createdCategory.id}`,
		);

		res.json({
			success: true,
			category: createdCategory,
			message: 'Category created successfully',
		});
	} catch (error: any) {
		logger.error('[CREATE-DEFAULT-CATEGORY] Error:', error);
		res.status(500).json({
			error: 'Failed to create category',
			message: error.message,
			stack: error.stack,
		});
	}
};

