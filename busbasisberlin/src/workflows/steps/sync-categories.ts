// src/workflows/steps/sync-categories.ts
import { ProductCategoryDTO } from '@medusajs/framework/types';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import { MEILISEARCH_MODULE } from '../../modules/meilisearch';
import MeilisearchModuleService from '../../modules/meilisearch/service';

export type SyncCategoriesStepInput = {
	categories: ProductCategoryDTO[];
};

export const syncCategoriesStep = createStep(
	'sync-categories',
	async ({ categories }: SyncCategoriesStepInput, { container }) => {
		const meilisearchModuleService = container.resolve(
			MEILISEARCH_MODULE,
		) as MeilisearchModuleService;

		// Transform categories for better search functionality
		const transformedCategories = categories.map(category => {
			// Build category hierarchy path
			let hierarchyPath = category.name;
			if (category.parent_category?.name) {
				hierarchyPath = `${category.parent_category.name} > ${category.name}`;
			}

			// Get child category names
			const childCategoryNames =
				category.category_children?.map(child => child.name) || [];

			// Debug: Log category data to see what we're getting
			if (categories.indexOf(category) === 0) {
				console.log('🔍 Sample category data:', {
					id: category.id,
					name: category.name,
					parent_category: category.parent_category?.name,
					children_count: category.category_children?.length || 0,
					is_active: category.is_active,
				});
			}

			return {
				id: category.id,
				name: category.name,
				description: category.description,
				handle: category.handle,
				is_active: category.is_active,
				is_internal: category.is_internal,
				parent_category_id: category.parent_category_id,
				parent_category_name: category.parent_category?.name || null,
				category_children: childCategoryNames,
				hierarchy_path: hierarchyPath,
				mpath: (category as any).mpath || null,
				rank: category.rank || 0,
				created_at: category.created_at,
				updated_at: category.updated_at,

				// Search-optimized fields
				searchable_text: [
					category.name,
					category.description,
					category.handle,
					category.parent_category?.name,
					...childCategoryNames,
				]
					.filter(Boolean)
					.join(' '),
			};
		});

		// Debug: Log sample transformed category
		if (transformedCategories.length > 0) {
			console.log('🔍 Sample transformed category:', {
				id: transformedCategories[0].id,
				name: transformedCategories[0].name,
				hierarchy_path: transformedCategories[0].hierarchy_path,
				parent_category_name: transformedCategories[0].parent_category_name,
				category_children: transformedCategories[0].category_children,
				is_active: transformedCategories[0].is_active,
			});
		}

		const existingCategories = await meilisearchModuleService.retrieveFromIndex(
			categories.map(category => category.id),
			'category',
		);
		const newCategories = categories.filter(
			category => !existingCategories.some(c => c.id === category.id),
		);

		await meilisearchModuleService.indexData(
			transformedCategories as unknown as Record<string, unknown>[],
			'category',
		);

		return new StepResponse(undefined, {
			newCategories: newCategories.map(category => category.id),
			existingCategories,
		});
	},
	async (input, { container }) => {
		if (!input) {
			return;
		}

		const meilisearchModuleService = container.resolve(
			MEILISEARCH_MODULE,
		) as MeilisearchModuleService;

		if (input.newCategories) {
			await meilisearchModuleService.deleteFromIndex(
				input.newCategories,
				'category',
			);
		}

		if (input.existingCategories) {
			await meilisearchModuleService.indexData(
				input.existingCategories,
				'category',
			);
		}
	},
);
