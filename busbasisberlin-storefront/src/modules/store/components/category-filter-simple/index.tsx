// src/modules/store/components/category-filter-simple/index.tsx
// Simple, clean category filter with single-select (no checkboxes)
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
						className={`group flex items-center py-2 px-3 rounded-lg cursor-pointer transition-all duration-200 ${
							isSelected
								? 'bg-blue-500 text-white shadow-md'
								: 'hover:bg-gray-100 text-gray-700'
						}`}
						style={{ marginLeft: `${category.level * 20}px` }}
					>
						{/* Expand/Collapse Icon */}
						{hasChildren ? (
							<button
								onClick={e => {
									e.stopPropagation();
									handleNodeToggle(nodePath);
								}}
								className={`mr-2 p-1 rounded transition-colors ${
									isSelected ? 'hover:bg-blue-600' : 'hover:bg-gray-200'
								}`}
								aria-label={
									isExpanded ? 'Kategorie einklappen' : 'Kategorie ausklappen'
								}
							>
								{isExpanded ? (
									<IoChevronDown
										className={`w-4 h-4 ${
											isSelected ? 'text-white' : 'text-gray-500'
										}`}
									/>
								) : (
									<IoChevronForward
										className={`w-4 h-4 ${
											isSelected ? 'text-white' : 'text-gray-500'
										}`}
									/>
								)}
							</button>
						) : (
							<div className="w-6 mr-2" />
						)}

						{/* Category Name & Count */}
						<div
							className="flex items-center justify-between flex-1 min-w-0"
							onClick={() => handleCategoryClick(category.name)}
						>
							<span className="text-sm font-medium truncate mr-2">
								{category.name}
							</span>

							{/* Product Count Badge */}
							{category.count > 0 && (
								<span
									className={`text-xs px-2 py-0.5 rounded-full font-medium ${
										isSelected
											? 'bg-blue-600 text-white'
											: 'bg-gray-200 text-gray-600 group-hover:bg-gray-300'
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
			{/* Header */}
			<div className="flex items-center justify-between mb-3">
				<h3 className="text-lg font-semibold text-gray-900">Kategorien</h3>
				{currentCategory && (
					<button
						onClick={clearCategory}
						className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium"
					>
						Zurücksetzen
					</button>
				)}
			</div>

			{/* Category Tree */}
			<div
				className="space-y-0.5 max-h-[500px] overflow-y-auto pr-2"
				style={{
					scrollbarWidth: 'thin',
					scrollbarColor: '#cbd5e1 #f1f5f9',
				}}
			>
				{categoryTree.length > 0 ? (
					categoryTree.map(category => renderCategoryNode(category))
				) : (
					<div className="text-sm text-gray-500 text-center py-8 bg-gray-50 rounded-lg">
						Keine Kategorien verfügbar
					</div>
				)}
			</div>

			{/* Active Filter Display */}
			{currentCategory && (
				<div className="mt-4 pt-4 border-t border-gray-200">
					<div className="flex items-center gap-2">
						<span className="text-xs text-gray-500">Aktiver Filter:</span>
						<span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
							{currentCategory}
						</span>
					</div>
				</div>
			)}
		</div>
	);
};

export default CategoryFilterSimple;
