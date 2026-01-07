// src/workflows/steps/sync-categories.ts
import { ProductCategoryDTO } from '@medusajs/framework/types';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import { MEILISEARCH_MODULE } from '../../modules/meilisearch';
import MeilisearchModuleService from '../../modules/meilisearch/service';
import { getDefaultSalesChannelIdFromQuery, getInternalOperationsSalesChannelId } from '../../utils/sales-channel-helper';

export type SyncCategoriesStepInput = {
	categories: ProductCategoryDTO[];
};

export const syncCategoriesStep = createStep(
	'sync-categories',
	async ({ categories }: SyncCategoriesStepInput, { container }) => {
		const meilisearchModuleService = container.resolve(
			MEILISEARCH_MODULE,
		) as MeilisearchModuleService;

		// Get query service for checking products in categories
		const query = container.resolve('query');

		// Get sales channel IDs for filtering
		const defaultSalesChannelId = await getDefaultSalesChannelIdFromQuery(query);
		const internalSalesChannelId = await getInternalOperationsSalesChannelId(query);

		// Helper function to recursively get all descendant category IDs
		const getAllDescendantCategoryIds = (categoryId: string, allCategories: ProductCategoryDTO[]): string[] => {
			const descendants = new Set<string>();
			descendants.add(categoryId);

			const findChildren = (parentId: string) => {
				const children = allCategories.filter(cat => cat.parent_category_id === parentId);
				children.forEach(child => {
					if (!descendants.has(child.id)) {
						descendants.add(child.id);
						findChildren(child.id); // Recursively find grandchildren
					}
				});
			};

			findChildren(categoryId);
			return Array.from(descendants);
		};

		// Transform categories for better search functionality
		const transformedCategories = await Promise.all(categories.map(async category => {
			// Build category hierarchy path
			let hierarchyPath = category.name;
			if (category.parent_category?.name) {
				hierarchyPath = `${category.parent_category.name} > ${category.name}`;
			}

			// Get child category names
			const childCategoryNames =
				category.category_children?.map(child => child.name) || [];

			// Check if category OR its subcategories have any public products
			let hasPublicProducts = false;
			try {
				// Get all descendant category IDs (including current category)
				const allCategoryIds = getAllDescendantCategoryIds(category.id, categories);

				// Get products in this category AND all its subcategories with sales channel information
				const { data: productsInCategory } = await query.graph({
					entity: 'product',
					fields: ['id', 'sales_channels.id', 'sales_channels.name'],
					filters: {
						categories: { id: allCategoryIds } as any,
					},
					pagination: { take: 500, skip: 0 }, // Increased limit to catch more products
				});

				// Check if any products are available in the default sales channel
				hasPublicProducts = productsInCategory.some((product: any) => {
					const salesChannels = product.sales_channels || [];
					const hasDefaultChannel = salesChannels.some((sc: any) => sc.id === defaultSalesChannelId);
					const hasInternalChannel = internalSalesChannelId &&
						salesChannels.some((sc: any) => sc.id === internalSalesChannelId);

					// Product is public if it has default channel OR if it has no channels (legacy products)
					return hasDefaultChannel || (salesChannels.length === 0);
				});

				// Debug logging for problematic categories
				if (category.name === 'Beleuchtung' || category.parent_category?.name === 'Beleuchtung') {
					console.log(`🔍 [CATEGORY-SYNC] ${category.name} (${category.id}):`, {
						allCategoryIds: allCategoryIds.length,
						productsFound: productsInCategory.length,
						hasPublicProducts,
						sampleProducts: productsInCategory.slice(0, 3).map((p: any) => ({
							id: p.id,
							salesChannels: p.sales_channels?.map((sc: any) => sc.id) || []
						}))
					});
				}
			} catch (error) {
				console.warn(`Warning: Could not check products for category ${category.id}:`, error);
				// Default to true to avoid hiding categories due to errors
				hasPublicProducts = true;
			}

			// Debug: Log category data to see what we're getting
			if (categories.indexOf(category) === 0) {
				console.log('🔍 Sample category data:', {
					id: category.id,
					name: category.name,
					parent_category: category.parent_category?.name,
					children_count: category.category_children?.length || 0,
					is_active: category.is_active,
					has_public_products: hasPublicProducts,
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

				// Frontend visibility - only show categories with public products
				has_public_products: hasPublicProducts,

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
		}));

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
