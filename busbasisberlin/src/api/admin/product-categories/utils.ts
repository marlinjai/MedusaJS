// busbasisberlin/src/api/admin/product-categories/utils.ts
// Utility functions for product category operations

export type CategoryNode = {
	id: string;
	name: string;
	handle: string;
	parent_category_id: string | null;
	children: CategoryNode[];
};

// Helper function to get all descendant category IDs recursively
export function getAllDescendantCategoryIds(
	categoryId: string,
	categoryTree: CategoryNode[],
): string[] {
	const result: string[] = [categoryId];

	// Find the category in the tree
	const findCategory = (
		nodes: CategoryNode[],
		targetId: string,
	): CategoryNode | null => {
		for (const node of nodes) {
			if (node.id === targetId) {
				return node;
			}
			const found = findCategory(node.children, targetId);
			if (found) {
				return found;
			}
		}
		return null;
	};

	const category = findCategory(categoryTree, categoryId);
	if (category) {
		// Recursively collect all children
		const collectChildren = (node: CategoryNode) => {
			for (const child of node.children) {
				result.push(child.id);
				if (child.children.length > 0) {
					collectChildren(child);
				}
			}
		};
		collectChildren(category);
	}

	return result;
}



