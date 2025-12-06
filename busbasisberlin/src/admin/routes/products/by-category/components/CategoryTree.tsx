// busbasisberlin/src/admin/routes/products/by-category/components/CategoryTree.tsx
// Reusable hierarchical category tree component with expand/collapse

import { Checkbox, Text } from '@medusajs/ui';
import { ChevronDown, ChevronRight } from 'lucide-react';

export type CategoryNode = {
	id: string;
	name: string;
	children: CategoryNode[];
};

type CategoryTreeProps = {
	categories: CategoryNode[];
	selectedCategories: Set<string>;
	onToggleCategory: (id: string) => void;
	expandedCategories: Set<string>;
	onToggleExpand: (id: string) => void;
	level?: number;
};

export default function CategoryTree({
	categories,
	selectedCategories,
	onToggleCategory,
	expandedCategories,
	onToggleExpand,
	level = 0,
}: CategoryTreeProps) {
	return (
		<div className="space-y-1">
			{categories.map(category => {
				const hasChildren = category.children.length > 0;
				const isExpanded = expandedCategories.has(category.id);
				const isSelected = selectedCategories.has(category.id);

				return (
					<div key={category.id} className="flex flex-col">
						<div
							className="flex items-center gap-2 py-1 px-2 hover:bg-ui-bg-subtle rounded cursor-pointer"
							style={{ paddingLeft: `${level * 16 + 8}px` }}
						>
							{hasChildren && (
								<button
									onClick={e => {
										e.stopPropagation();
										onToggleExpand(category.id);
									}}
									className="p-0.5"
								>
									{isExpanded ? (
										<ChevronDown className="w-4 h-4" />
									) : (
										<ChevronRight className="w-4 h-4" />
									)}
								</button>
							)}
							{!hasChildren && <div className="w-5" />}
							<Checkbox
								checked={isSelected}
								onCheckedChange={() => onToggleCategory(category.id)}
							/>
							<Text
								size="small"
								onClick={() => onToggleCategory(category.id)}
								className="flex-1 cursor-pointer"
							>
								{category.name}
							</Text>
						</div>
						{hasChildren && isExpanded && (
							<CategoryTree
								categories={category.children}
								selectedCategories={selectedCategories}
								onToggleCategory={onToggleCategory}
								expandedCategories={expandedCategories}
								onToggleExpand={onToggleExpand}
								level={level + 1}
							/>
						)}
					</div>
				);
			})}
		</div>
	);
}

