// src/modules/store/components/facet-filters/tags-filter.tsx
// Tags filter component with checkboxes
'use client';

import { useMemo, useState } from 'react';
import { IoSearch } from 'react-icons/io5';

type TagsFilterProps = {
	selectedTags: string[];
	onChange: (tags: string[]) => void;
	facetData: Record<string, number>;
	maxVisible?: number;
};

const TagsFilter = ({
	selectedTags,
	onChange,
	facetData,
	maxVisible = 5,
}: TagsFilterProps) => {
	const [showAll, setShowAll] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');

	// Sort tags by count (descending) and filter by search term
	const filteredTags = useMemo(() => {
		const tags = Object.entries(facetData)
			.sort(([, a], [, b]) => b - a)
			.filter(([tag]) => tag.toLowerCase().includes(searchTerm.toLowerCase()));

		return showAll ? tags : tags.slice(0, maxVisible);
	}, [facetData, searchTerm, showAll, maxVisible]);

	const totalTags = Object.keys(facetData).length;
	const hasMoreTags = totalTags > maxVisible;

	const handleTagToggle = (tag: string) => {
		const newTags = selectedTags.includes(tag)
			? selectedTags.filter(t => t !== tag)
			: [...selectedTags, tag];

		onChange(newTags);
	};

	const clearAllTags = () => {
		onChange([]);
	};

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<h4 className="text-sm font-medium text-gray-900">Tags</h4>
				{selectedTags.length > 0 && (
					<button
						onClick={clearAllTags}
						className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
					>
						Alle entfernen ({selectedTags.length})
					</button>
				)}
			</div>

			{/* Search tags */}
			{totalTags > 5 && (
				<div className="relative">
					<input
						type="text"
						value={searchTerm}
						onChange={e => setSearchTerm(e.target.value)}
						placeholder="Tags suchen..."
						className="w-full px-3 py-2 pl-8 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
					<IoSearch className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
				</div>
			)}

			<div className="space-y-2 max-h-48 overflow-y-auto">
				{filteredTags.map(([tag, count]) => {
					const isSelected = selectedTags.includes(tag);

					return (
						<label
							key={tag}
							className={`flex items-center p-2 rounded-md cursor-pointer transition-all duration-150 ${
								isSelected
									? 'bg-blue-50 text-blue-700 border border-blue-200'
									: 'hover:bg-gray-50 text-gray-700'
							}`}
						>
							<input
								type="checkbox"
								checked={isSelected}
								onChange={() => handleTagToggle(tag)}
								className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 mr-3"
							/>

							<span className="text-sm font-medium flex-1 truncate">{tag}</span>

							<span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full ml-2">
								{count}
							</span>
						</label>
					);
				})}

				{filteredTags.length === 0 && searchTerm && (
					<div className="text-sm text-gray-500 text-center py-4">
						Keine Tags gefunden für "{searchTerm}"
					</div>
				)}
			</div>

			{/* Show more/less button */}
			{hasMoreTags && !searchTerm && (
				<button
					onClick={() => setShowAll(!showAll)}
					className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
				>
					{showAll
						? 'Weniger anzeigen'
						: `${totalTags - maxVisible} weitere anzeigen`}
				</button>
			)}
		</div>
	);
};

export default TagsFilter;
