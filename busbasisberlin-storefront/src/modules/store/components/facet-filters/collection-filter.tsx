// src/modules/store/components/facet-filters/collection-filter.tsx
// Collection filter component with checkboxes
'use client';

import { useMemo, useState } from 'react';
import { IoSearch } from 'react-icons/io5';

type CollectionFilterProps = {
	selectedCollections: string[];
	onChange: (collections: string[]) => void;
	facetData: Record<string, number>;
	maxVisible?: number;
};

const CollectionFilter = ({
	selectedCollections,
	onChange,
	facetData,
	maxVisible = 5,
}: CollectionFilterProps) => {
	const [showAll, setShowAll] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');

	// Sort collections by count (descending) and filter by search term
	const filteredCollections = useMemo(() => {
		const collections = Object.entries(facetData)
			.sort(([, a], [, b]) => b - a)
			.filter(([collection]) =>
				collection.toLowerCase().includes(searchTerm.toLowerCase()),
			);

		return showAll ? collections : collections.slice(0, maxVisible);
	}, [facetData, searchTerm, showAll, maxVisible]);

	const totalCollections = Object.keys(facetData).length;
	const hasMoreCollections = totalCollections > maxVisible;

	const handleCollectionToggle = (collection: string) => {
		const newCollections = selectedCollections.includes(collection)
			? selectedCollections.filter(c => c !== collection)
			: [...selectedCollections, collection];

		onChange(newCollections);
	};

	const clearAllCollections = () => {
		onChange([]);
	};

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<h4 className="text-sm font-medium text-gray-900">Kollektionen</h4>
				{selectedCollections.length > 0 && (
					<button
						onClick={clearAllCollections}
						className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
					>
						Alle entfernen ({selectedCollections.length})
					</button>
				)}
			</div>

			{/* Search collections */}
			{totalCollections > 5 && (
				<div className="relative">
					<input
						type="text"
						value={searchTerm}
						onChange={e => setSearchTerm(e.target.value)}
						placeholder="Kollektionen suchen..."
						className="w-full px-3 py-2 pl-8 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
					<IoSearch className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
				</div>
			)}

			<div className="space-y-2 max-h-48 overflow-y-auto">
				{filteredCollections.map(([collection, count]) => {
					const isSelected = selectedCollections.includes(collection);

					return (
						<label
							key={collection}
							className={`flex items-center p-2 rounded-md cursor-pointer transition-all duration-150 ${
								isSelected
									? 'bg-blue-50 text-blue-700 border border-blue-200'
									: 'hover:bg-gray-50 text-gray-700'
							}`}
						>
							<input
								type="checkbox"
								checked={isSelected}
								onChange={() => handleCollectionToggle(collection)}
								className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 mr-3"
							/>

							<span className="text-sm font-medium flex-1 truncate">
								{collection}
							</span>

							<span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full ml-2">
								{count}
							</span>
						</label>
					);
				})}

				{filteredCollections.length === 0 && searchTerm && (
					<div className="text-sm text-gray-500 text-center py-4">
						Keine Kollektionen gefunden für "{searchTerm}"
					</div>
				)}
			</div>

			{/* Show more/less button */}
			{hasMoreCollections && !searchTerm && (
				<button
					onClick={() => setShowAll(!showAll)}
					className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
				>
					{showAll
						? 'Weniger anzeigen'
						: `${totalCollections - maxVisible} weitere anzeigen`}
				</button>
			)}
		</div>
	);
};

export default CollectionFilter;
