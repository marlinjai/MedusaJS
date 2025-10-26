// src/modules/store/components/category-filter-simple/index.tsx
// Simple, clean category filter with single-select (no checkboxes)
'use client';

import {
	CategoryTreeNode,
	buildCategoryTreeFromFacets,
} from '../../../../lib/utils/category-tree';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { IoChevronDown, IoChevronForward } from 'react-icons/io5';

type CategoryFilterProps = {
	categoryNames: Record<string, number>;
	categoryPaths: Record<string, number>;
	className?: string;
};

const CategoryFilterSimple = ({
	categoryNames,
	categoryPaths,
	className = '',
}: CategoryFilterProps) => {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	// Get currently selected category from URL
	const currentCategory = searchParams.get('category') || '';
	const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

	// Build category tree from facet data
	const categoryTree = buildCategoryTreeFromFacets(
		categoryNames || {},
		categoryPaths || {},
	);

	// Handle category selection (single select)
	const handleCategoryClick = useCallback(
		(categoryName: string) => {
			const params = new URLSearchParams(searchParams);

			// Toggle: if clicking the same category, clear it
			if (currentCategory === categoryName) {
				params.delete('category');
			} else {
				params.set('category', categoryName);
			}

			// Reset to page 1 when changing category
			params.set('page', '1');

			router.push(`${pathname}?${params.toString()}`);
		},
		[currentCategory, searchParams, router, pathname],
	);

	// Handle node expansion
	const handleNodeToggle = useCallback(
		(categoryPath: string) => {
			const newExpanded = new Set(expandedNodes);

			if (newExpanded.has(categoryPath)) {
				newExpanded.delete(categoryPath);
			} else {
				newExpanded.add(categoryPath);
			}

			setExpandedNodes(newExpanded);
		},
		[expandedNodes],
	);

	// Render category node
	const renderCategoryNode = useCallback(
		(category: CategoryTreeNode, parentPath: string = '') => {
			const nodePath = parentPath
				? `${parentPath} > ${category.name}`
				: category.name;
			const isExpanded = expandedNodes.has(nodePath);
			const isSelected = currentCategory === category.name;
			const hasChildren = category.children.length > 0;

			return (
				<div key={nodePath} className="select-none">
					<div
						className={`group flex items-center py-2 px-2 rounded transition-all duration-150 ${
							isSelected
								? 'bg-blue-600 text-white'
								: 'hover:bg-gray-700 text-gray-300'
						}`}
						style={{ marginLeft: `${category.level * 16}px` }}
					>
						{/* Expand/Collapse Icon */}
						{hasChildren ? (
							<button
								onClick={e => {
									e.stopPropagation();
									handleNodeToggle(nodePath);
								}}
								className={`mr-2 p-1 rounded transition-colors ${
									isSelected ? 'hover:bg-blue-700' : 'hover:bg-gray-600'
								}`}
								aria-label={
									isExpanded ? 'Kategorie einklappen' : 'Kategorie ausklappen'
								}
							>
								{isExpanded ? (
									<IoChevronDown
										className={`w-4 h-4 ${
											isSelected ? 'text-white' : 'text-gray-400'
										}`}
									/>
								) : (
									<IoChevronForward
										className={`w-4 h-4 ${
											isSelected ? 'text-white' : 'text-gray-400'
										}`}
									/>
								)}
							</button>
						) : (
							<div className="w-6 mr-2" />
						)}

						{/* Category Name & Count - Clickable area for selection */}
						<div
							className="flex items-center justify-between flex-1 min-w-0 cursor-pointer"
							onClick={e => {
								e.stopPropagation(); // Prevent event bubbling
								handleCategoryClick(category.name);
							}}
						>
							<span className="text-sm font-medium truncate mr-2">
								{category.name}
							</span>

							{/* Product Count Badge - Dark Theme */}
							{category.count > 0 && (
								<span
									className={`text-xs px-2 py-0.5 rounded font-medium ${
										isSelected
											? 'bg-blue-500 text-white'
											: 'bg-gray-700 text-gray-300 group-hover:bg-gray-600'
									}`}
								>
									{category.count.toLocaleString('de-DE')}
								</span>
							)}
						</div>
					</div>

					{/* Children Categories */}
					{hasChildren && isExpanded && (
						<div className="mt-0.5 mb-1">
							{category.children.map(child =>
								renderCategoryNode(child, nodePath),
							)}
						</div>
					)}
				</div>
			);
		},
		[expandedNodes, currentCategory, handleNodeToggle, handleCategoryClick],
	);

	// Clear category filter
	const clearCategory = useCallback(() => {
		const params = new URLSearchParams(searchParams);
		params.delete('category');
		params.set('page', '1');
		router.push(`${pathname}?${params.toString()}`);
	}, [searchParams, router, pathname]);

	// Auto-expand top-level categories with children on first load
	useEffect(() => {
		if (expandedNodes.size === 0 && categoryTree.length > 0) {
			const topLevelCategories = categoryTree
				.filter(cat => cat.children.length > 0)
				.slice(0, 3) // Expand first 3 top-level categories
				.map(cat => cat.name);

			setExpandedNodes(new Set(topLevelCategories));
		}
	}, [categoryTree, expandedNodes.size]);

	return (
		<div className={`${className}`}>
			{/* Header - Dark Theme */}
			<div className="flex items-center justify-between mb-3">
				<h3 className="text-base font-semibold text-white">Kategorien</h3>
				{currentCategory && (
					<button
						onClick={clearCategory}
						className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
					>
						Zurücksetzen
					</button>
				)}
			</div>

			{/* Category Tree - Dark Scrollbar */}
			<div
				className="space-y-0.5 max-h-[500px] overflow-y-auto pr-2"
				style={{
					scrollbarWidth: 'thin',
					scrollbarColor: '#4b5563 #1f2937',
				}}
			>
				{categoryTree.length > 0 ? (
					categoryTree.map(category => renderCategoryNode(category))
				) : (
					<div className="text-sm text-gray-400 text-center py-8 bg-gray-900/50 rounded">
						Keine Kategorien verfügbar
					</div>
				)}
			</div>

			{/* Active Filter Display - Dark Theme */}
			{currentCategory && (
				<div className="mt-4 pt-4 border-t border-gray-700">
					<div className="flex items-center gap-2">
						<span className="text-xs text-gray-500">Aktiver Filter:</span>
						<span className="text-xs font-medium text-white bg-blue-600 px-2.5 py-1 rounded">
							{currentCategory}
						</span>
					</div>
				</div>
			)}
		</div>
	);
};

export default CategoryFilterSimple;