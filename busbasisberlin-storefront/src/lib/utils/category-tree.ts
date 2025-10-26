// src/lib/utils/category-tree.ts
// Utility functions for building category trees from facet data

// Category tree structure built from facet data
export type CategoryTreeNode = {
	name: string;
	path: string;
	count: number;
	children: CategoryTreeNode[];
	level: number;
	isExpanded?: boolean;
	isSelected?: boolean;
};

/**
 * Build category tree from facet data
 * Handles multi-level category hierarchies from Meilisearch facets
 */
export const buildCategoryTreeFromFacets = (
	categoryNames: Record<string, number>,
	categoryPaths: Record<string, number>,
): CategoryTreeNode[] => {
	// Use unique path-based keys to avoid conflicts with categories at different levels
	const categoryMap = new Map<string, CategoryTreeNode>();
	const rootCategories: CategoryTreeNode[] = [];

	// First pass: Build hierarchy from categoryPaths
	Object.entries(categoryPaths).forEach(([fullPath, count]) => {
		const parts = fullPath.split(' > ').map(p => p.trim());

		// Build the hierarchy path by path
		for (let i = 0; i < parts.length; i++) {
			const categoryName = parts[i];
			// Create unique key: use the partial path up to this level
			const uniqueKey = parts.slice(0, i + 1).join(' > ');

			// Get or create the category node
			let node = categoryMap.get(uniqueKey);
			if (!node) {
				node = {
					name: categoryName,
					path: uniqueKey, // Store full path for filtering
					count: 0,
					children: [],
					level: i,
				};
				categoryMap.set(uniqueKey, node);
			}

			// For leaf nodes (last part of path), add the product count
			if (i === parts.length - 1) {
				node.count += count; // Accumulate if same leaf appears in multiple paths
			}

			// Add to root categories if it's a top-level category
			if (i === 0 && !rootCategories.find(root => root.name === categoryName)) {
				rootCategories.push(node);
			}

			// Add to parent's children if it's not a root category
			if (i > 0) {
				const parentKey = parts.slice(0, i).join(' > ');
				const parent = categoryMap.get(parentKey);
				if (
					parent &&
					!parent.children.find(child => child.name === categoryName)
				) {
					parent.children.push(node);
				}
			}
		}
	});

	// Second pass: Update counts from categoryNames facet
	// The backend includes aggregated counts for parent categories
	Object.entries(categoryNames).forEach(([name, count]) => {
		// Try to find this category in our map (it might be at any level)
		for (const [key, node] of categoryMap.entries()) {
			if (node.name === name && node.count === 0) {
				// Update parent category counts (they come from backend aggregation)
				node.count = count;
				break; // Only update first occurrence
			}
		}

		// If not found in hierarchy, add as standalone root category
		const existingRoot = rootCategories.find(root => root.name === name);
		if (
			!existingRoot &&
			!Array.from(categoryMap.values()).some(node => node.name === name)
		) {
			const node: CategoryTreeNode = {
				name: name,
				path: name,
				count: count,
				children: [],
				level: 0,
			};
			categoryMap.set(name, node);
			rootCategories.push(node);
		}
	});

	// Recursive sorting function for all levels
	const sortCategoriesRecursive = (
		categories: CategoryTreeNode[],
	): CategoryTreeNode[] => {
		const sorted = categories.sort((a, b) => b.count - a.count);
		sorted.forEach(cat => {
			if (cat.children.length > 0) {
				cat.children = sortCategoriesRecursive(cat.children);
			}
		});
		return sorted;
	};

	// Sort the entire tree by product count
	return sortCategoriesRecursive(rootCategories);
};