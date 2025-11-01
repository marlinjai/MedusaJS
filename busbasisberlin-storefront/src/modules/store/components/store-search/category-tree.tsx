'use client';

// src/modules/store/components/store-search/category-tree.tsx
// Custom hierarchical menu for category navigation

import { useHierarchicalMenu } from 'react-instantsearch-core';

type HierarchicalListProps = {
	items: ReturnType<typeof useHierarchicalMenu>['items'];
	createURL: ReturnType<typeof useHierarchicalMenu>['createURL'];
	onNavigate: (value: string) => void;
	level?: number;
};

function HierarchicalList({
	items,
	createURL,
	onNavigate,
	level = 0,
}: HierarchicalListProps) {
	if (items.length === 0) {
		return null;
	}

	return (
		<ul
			className={`space-y-1 ${
				level > 0 ? 'ml-3 mt-1 border-l-2 border-gray-700 pl-3' : ''
			}`}
		>
			{items.map(item => (
				<li key={item.value}>
					<a
						href={createURL(item.value)}
						onClick={event => {
							// Allow modifier clicks for opening in new tab
							const isMiddleClick = event.button === 1;
							if (
								isMiddleClick ||
								event.altKey ||
								event.ctrlKey ||
								event.metaKey ||
								event.shiftKey
							) {
								return;
							}
							event.preventDefault();
							onNavigate(item.value);
						}}
						className={`
							flex items-center justify-between gap-2 py-2 px-3 rounded-lg
							text-sm transition-all duration-200 group
							${
								item.isRefined
									? 'bg-gray-700/60 text-white font-semibold'
									: 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
							}
						`}
					>
						<span className="flex items-center gap-2 flex-1 min-w-0">
							{/* Chevron icon for items with children */}
							{item.data && item.data.length > 0 && (
								<svg
									className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
										item.isRefined ? 'rotate-90' : ''
									}`}
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 5l7 7-7 7"
									/>
								</svg>
							)}

							<span className="truncate">{item.label}</span>
						</span>

						{/* Count badge */}
						<span
							className={`
								text-xs px-2 py-0.5 rounded-full min-w-[32px] text-center flex-shrink-0
								${
									item.isRefined
										? 'bg-gray-600 text-gray-200'
										: 'bg-gray-700/50 text-gray-400 group-hover:bg-gray-700'
								}
							`}
						>
							{item.count}
						</span>
					</a>

					{/* Nested children */}
					{item.data && item.data.length > 0 && item.isRefined && (
						<HierarchicalList
							items={item.data}
							onNavigate={onNavigate}
							createURL={createURL}
							level={level + 1}
						/>
					)}
				</li>
			))}
		</ul>
	);
}

export default function CategoryTree() {
	const { items, refine, createURL } = useHierarchicalMenu({
		attributes: [
			'hierarchical_categories.lvl0',
			'hierarchical_categories.lvl1',
			'hierarchical_categories.lvl2',
			'hierarchical_categories.lvl3',
		],
		separator: ' > ',
		limit: 50,
	});

	return (
		<div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
			{items.length > 0 ? (
				<HierarchicalList
					items={items}
					onNavigate={refine}
					createURL={createURL}
				/>
			) : (
				<p className="text-sm text-gray-500 py-4 text-center">
					Keine Kategorien verfügbar
				</p>
			)}
		</div>
	);
}
