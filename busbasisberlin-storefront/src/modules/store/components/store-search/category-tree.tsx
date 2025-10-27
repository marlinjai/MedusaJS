'use client';

// src/modules/store/components/store-search/category-tree.tsx
// Meilisearch HierarchicalMenu for category navigation

import { HierarchicalMenu } from 'react-instantsearch';

export default function CategoryTree() {
	return (
		<div className="max-h-[500px] overflow-y-auto">
			<HierarchicalMenu
				attributes={[
					'hierarchical_categories.lvl0',
					'hierarchical_categories.lvl1',
					'hierarchical_categories.lvl2',
					'hierarchical_categories.lvl3',
				]}
				separator=" > "
				limit={50}
				showMore={false}
				classNames={{
					root: 'space-y-1',
					list: 'space-y-1',
					item: 'py-2 px-3 rounded-md',
					selectedItem: 'bg-gray-800 text-white',
					parentItem: 'bg-gray-800 text-white',
					link: 'flex items-start justify-between text-gray-300 hover:text-white text-sm cursor-pointer transition-colors leading-relaxed',
					selectedItemLink: 'text-white',
					label: 'flex-1 break-words min-w-0',
					count:
						'text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded-full min-w-[32px] text-center ml-2 flex-shrink-0',
				}}
			/>
		</div>
	);
}
