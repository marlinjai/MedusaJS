/**
 * service-categories/tree/route.ts
 * Admin API route to fetch service categories as tree structure
 * Builds tree from hierarchical category levels (category_level_1, category_level_2, etc.)
 */
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

import { SERVICE_MODULE } from '../../../../modules/service';
import ServiceService from '../../../../modules/service/service';

// Service category tree node structure
export type ServiceCategoryNode = {
	name: string;
	path: string; // Full path for filtering (e.g., "Motor > Sonstiges")
	count: number; // Number of services in this category
	children: ServiceCategoryNode[];
	level: number; // 1, 2, 3, or 4
};

export const GET = async (
	req: MedusaRequest,
	res: MedusaResponse,
): Promise<void> => {
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	try {
		const serviceService: ServiceService =
			req.scope.resolve(SERVICE_MODULE);

		// Fetch all active services with category data
		const services = await serviceService.listServices(
			{
				is_active: true,
				status: 'active',
			},
			{
				take: 10000, // Get all services
			},
		);

		logger.info(`[SERVICE-TREE] Found ${services.length} active services`);

		// Build category tree from hierarchical levels
		const categoryMap = new Map<string, ServiceCategoryNode>();
		const rootCategories: ServiceCategoryNode[] = [];

		for (const service of services) {
			// Skip services without category hierarchy
			if (!service.category_level_1) continue;

			// Build path through hierarchy
			const levels = [
				service.category_level_1,
				service.category_level_2,
				service.category_level_3,
				service.category_level_4,
			].filter(Boolean) as string[];

			// Create nodes for each level if they don't exist
			for (let i = 0; i < levels.length; i++) {
				const categoryName = levels[i];
				const path = levels.slice(0, i + 1).join(' > ');
				const level = i + 1;

				// Get or create node
				if (!categoryMap.has(path)) {
					const node: ServiceCategoryNode = {
						name: categoryName,
						path,
						count: 0,
						children: [],
						level,
					};
					categoryMap.set(path, node);

					// Add to parent or root
					if (i === 0) {
						// Root level
						rootCategories.push(node);
					} else {
						// Child level - find parent
						const parentPath = levels.slice(0, i).join(' > ');
						const parent = categoryMap.get(parentPath);
						if (parent && !parent.children.find(c => c.path === path)) {
							parent.children.push(node);
						}
					}
				}

				// Increment count for leaf node only
				if (i === levels.length - 1) {
					const node = categoryMap.get(path);
					if (node) {
						node.count++;
					}
				}
			}
		}

		// Sort categories alphabetically at each level
		const sortCategories = (nodes: ServiceCategoryNode[]) => {
			nodes.sort((a, b) => a.name.localeCompare(b.name));
			nodes.forEach(node => {
				if (node.children.length > 0) {
					sortCategories(node.children);
				}
			});
		};

		sortCategories(rootCategories);

		// Calculate aggregate counts (sum of children counts for parent nodes)
		const calculateAggregateCounts = (
			node: ServiceCategoryNode,
		): number => {
			if (node.children.length === 0) {
				// Leaf node - use direct count
				return node.count;
			}

			// Parent node - sum children
			let total = node.count; // Start with direct count (if any)
			for (const child of node.children) {
				total += calculateAggregateCounts(child);
			}
			node.count = total;
			return total;
		};

		rootCategories.forEach(calculateAggregateCounts);

		logger.info(
			`[SERVICE-TREE] Built tree with ${rootCategories.length} root categories`,
		);

		res.json({
			categories: rootCategories,
			total_services: services.length,
		});
	} catch (error) {
		logger.error('[SERVICE-TREE] Error fetching service category tree:', error);
		res.status(500).json({
			error: 'Failed to fetch service category tree',
			message: error instanceof Error ? error.message : 'Unknown error',
		});
	}
};


