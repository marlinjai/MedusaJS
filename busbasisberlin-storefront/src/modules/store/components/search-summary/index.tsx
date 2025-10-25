// src/modules/store/components/search-summary/index.tsx
// Summary component showing the current search and filter state
'use client';

import { useSearchParams } from 'next/navigation';

const SearchSummary = () => {
	const searchParams = useSearchParams();

	const query = searchParams.get('q');
	const categories =
		searchParams.get('categories')?.split(',').filter(Boolean) || [];
	const availability = searchParams.get('availability');
	const minPrice = searchParams.get('min_price');
	const maxPrice = searchParams.get('max_price');
	const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
	const collections =
		searchParams.get('collections')?.split(',').filter(Boolean) || [];

	const hasFilters =
		query ||
		categories.length > 0 ||
		availability !== 'all' ||
		minPrice ||
		maxPrice ||
		tags.length > 0 ||
		collections.length > 0;

	if (!hasFilters) {
		return null;
	}

	return (
		<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
			<h3 className="text-sm font-medium text-blue-900 mb-2">Aktive Filter:</h3>
			<div className="flex flex-wrap gap-2">
				{query && (
					<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
						Suche: "{query}"
					</span>
				)}
				{categories.length > 0 && (
					<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
						{categories.length} Kategorie{categories.length !== 1 ? 'n' : ''}
					</span>
				)}
				{availability && availability !== 'all' && (
					<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
						{availability === 'in_stock' ? 'Verfügbar' : 'Nicht verfügbar'}
					</span>
				)}
				{(minPrice || maxPrice) && (
					<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
						Preis: {minPrice || '0'}€ - {maxPrice || '∞'}€
					</span>
				)}
				{tags.length > 0 && (
					<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
						{tags.length} Tag{tags.length !== 1 ? 's' : ''}
					</span>
				)}
				{collections.length > 0 && (
					<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
						{collections.length} Kollektion
						{collections.length !== 1 ? 'en' : ''}
					</span>
				)}
			</div>
		</div>
	);
};

export default SearchSummary;
