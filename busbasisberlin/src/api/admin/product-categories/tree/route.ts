// busbasisberlin/src/api/admin/product-categories/tree/route.ts
// Admin API route to fetch categories as tree structure

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import type { CategoryNode } from '../utils';

// Re-export for convenience
export type { CategoryNode } from '../utils';

export const GET = async (
	req: MedusaRequest,
	res: MedusaResponse,
): Promise<void> => {
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	try {
		// Get query module
		const query = req.scope.resolve('query');

		// Fetch all categories with parent relationships
		// Load all categories without pagination to build complete tree
		const categoriesResult = await query.graph({
			entity: 'product_category',
			fields: ['id', 'name', 'handle', 'parent_category_id'],
			pagination: {
				take: 10000, // Large limit to get all categories
				skip: 0,
			},
		});

		const categories = categoriesResult?.data || [];

		// Build tree structure
		const categoryMap = new Map<string, CategoryNode>();
		const rootCategories: CategoryNode[] = [];

		// First pass: create all nodes
		categories.forEach((cat: any) => {
			categoryMap.set(cat.id, {
				id: cat.id,
				name: cat.name,
				handle: cat.handle,
				parent_category_id: cat.parent_category_id || null,
				children: [],
			});
		});

		// Second pass: build parent-child relationships
		categories.forEach((cat: any) => {
			const node = categoryMap.get(cat.id);
			if (!node) return;

			if (cat.parent_category_id) {
				const parent = categoryMap.get(cat.parent_category_id);
				if (parent) {
					parent.children.push(node);
				} else {
					// Parent not found, treat as root
					rootCategories.push(node);
				}
			} else {
				rootCategories.push(node);
			}
		});

		// Sort children alphabetically
		const sortCategories = (nodes: CategoryNode[]) => {
			nodes.sort((a, b) => a.name.localeCompare(b.name));
			nodes.forEach(node => {
				if (node.children.length > 0) {
					sortCategories(node.children);
				}
			});
		};

		sortCategories(rootCategories);

		res.json({
			categories: rootCategories,
		});
	} catch (error) {
		logger.error('[CATEGORIES-TREE] Error fetching category tree:', error);
		res.status(500).json({
			error: 'Failed to fetch category tree',
			message: error instanceof Error ? error.message : 'Unknown error',
		});
	}
};
