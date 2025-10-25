// src/modules/store/components/category-filter/index.tsx
// Simplified category filter using facet data (no server calls)
'use client';

import {
	CategoryTreeNode,
	buildCategoryTreeFromFacets,
} from '@lib/utils/category-tree';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { IoChevronDown, IoChevronForward } from 'react-icons/io5';

type CategoryFilterProps = {
	categoryNames: Record<string, number>;
	categoryPaths: Record<string, number>;
	selectedCategories?: string[];
	onCategoryChange?: (categories: string[]) => void;
	className?: string;
};

const CategoryFilter = ({
	categoryNames,
	categoryPaths,
	selectedCategories = [],
	onCategoryChange,
	className = '',
}: CategoryFilterProps) => {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
	const [selectedIds, setSelectedIds] = useState<Set<string>>(
		new Set(selectedCategories),
	);

	// Build category tree from facet data
	const categoryTree = buildCategoryTreeFromFacets(
		categoryNames || {},
		categoryPaths || {},
	);

	// Create query string helper
	const createQueryString = useCallback(
		(name: string, value: string[]) => {
			const params = new URLSearchParams(searchParams);
			if (value.length > 0) {
				params.set(name, value.join(','));
			} else {
				params.delete(name);
			}
			return params.toString();
		},
		[searchParams],
	);

	// Handle category selection
	const handleCategoryToggle = useCallback(
		(categoryName: string) => {
			const newSelected = new Set(selectedIds);

			if (newSelected.has(categoryName)) {
				newSelected.delete(categoryName);
			} else {
				newSelected.add(categoryName);
			}

			setSelectedIds(newSelected);
			const selectedArray = Array.from(newSelected);

			// Update URL
			const queryString = createQueryString('categories', selectedArray);
			router.replace(`${pathname}?${queryString}`, { scroll: false });

			// Notify parent component
			if (onCategoryChange) {
				onCategoryChange(selectedArray);
			}
		},
		[selectedIds, createQueryString, router, pathname, onCategoryChange],
	);

	// Handle node expansion
	const handleNodeToggle = useCallback(
		(categoryName: string) => {
			const newExpanded = new Set(expandedNodes);

			if (newExpanded.has(categoryName)) {
				newExpanded.delete(categoryName);
			} else {
				newExpanded.add(categoryName);
			}

			setExpandedNodes(newExpanded);
		},
		[expandedNodes],
	);

	// Render category node
	const renderCategoryNode = useCallback(
		(category: CategoryTreeNode) => {
			const isExpanded = expandedNodes.has(category.name);
			const isSelected = selectedIds.has(category.name);
			const hasChildren = category.children.length > 0;

			return (
				<div key={category.name} className="select-none">
					<div
						className={`flex items-center py-2 px-3 rounded-md cursor-pointer transition-all duration-150 ${
							isSelected
								? 'bg-blue-50 text-blue-700 border border-blue-200'
								: 'hover:bg-gray-50 text-gray-700'
						}`}
						style={{ marginLeft: `${category.level * 16}px` }}
					>
						{/* Expand/Collapse Button */}
						<div className="flex items-center mr-2 w-5">
							{hasChildren ? (
								<button
									onClick={e => {
										e.stopPropagation();
										handleNodeToggle(category.name);
									}}
									className="p-0.5 rounded hover:bg-gray-200 transition-colors"
								>
									{isExpanded ? (
										<IoChevronDown className="w-4 h-4 text-gray-500" />
									) : (
										<IoChevronForward className="w-4 h-4 text-gray-500" />
									)}
								</button>
							) : (
								<div className="w-4 h-4" />
							)}
						</div>

						{/* Category Selection */}
						<div
							className="flex items-center flex-1 min-w-0"
							onClick={() => handleCategoryToggle(category.name)}
						>
							{/* Checkbox */}
							<div className="flex items-center mr-3">
								<input
									type="checkbox"
									checked={isSelected}
									onChange={() => {}} // Handled by parent onClick
									className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
								/>
							</div>

							{/* Category Name */}
							<span className="text-sm font-medium truncate flex-1">
								{category.name}
							</span>

							{/* Product Count */}
							{category.count > 0 && (
								<span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
									{category.count}
								</span>
							)}
						</div>
					</div>

					{/* Children */}
					{hasChildren && isExpanded && (
						<div className="mt-1">
							{category.children.map(child => renderCategoryNode(child))}
						</div>
					)}
				</div>
			);
		},
		[expandedNodes, selectedIds, handleNodeToggle, handleCategoryToggle],
	);

	// Clear all selections
	const clearAllSelections = useCallback(() => {
		setSelectedIds(new Set());
		const queryString = createQueryString('categories', []);
		router.replace(`${pathname}?${queryString}`, { scroll: false });
		if (onCategoryChange) {
			onCategoryChange([]);
		}
	}, [createQueryString, router, pathname, onCategoryChange]);

	// Auto-expand top-level categories with children on first load
	useEffect(() => {
		const topLevelCategories = categoryTree
			.filter(cat => cat.children.length > 0)
			.slice(0, 3) // Only expand first 3 top-level categories
			.map(cat => cat.name);

		if (topLevelCategories.length > 0 && expandedNodes.size === 0) {
			setExpandedNodes(new Set(topLevelCategories));
		}
	}, [categoryTree]); // Only run when tree is built

	return (
		<div className={`${className}`}>
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-sm font-medium text-gray-900">Kategorien</h3>
				{selectedIds.size > 0 && (
					<button
						onClick={clearAllSelections}
						className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
					>
						Alle entfernen ({selectedIds.size})
					</button>
				)}
			</div>

			<div
				className="space-y-1 max-h-80 overflow-y-scroll border border-gray-100 rounded-md p-2"
				style={{
					scrollbarWidth: 'thin',
					scrollbarColor: '#d1d5db #f3f4f6',
				}}
			>
				{categoryTree.length > 0 ? (
					categoryTree.map(category => renderCategoryNode(category))
				) : (
					<div className="text-sm text-gray-500 text-center py-4">
						Keine Kategorien verfügbar
					</div>
				)}
			</div>
		</div>
	);
};

export default CategoryFilter;
