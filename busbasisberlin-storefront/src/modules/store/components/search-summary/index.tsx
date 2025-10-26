// src/modules/store/components/search-summary/index.tsx
// Simple search results summary component
'use client';

type SearchSummaryProps = {
	totalResults: number;
	searchQuery?: string;
	currentPage?: number;
	totalPages?: number;
	className?: string;
};

const SearchSummary = ({
	totalResults,
	searchQuery,
	currentPage = 1,
	totalPages = 1,
	className = '',
}: SearchSummaryProps) => {
	return (
		<div className={`bg-gray-800 rounded-lg border border-gray-700 px-6 py-4 ${className}`}>
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div className="flex items-center gap-4">
					<span className="text-base font-medium text-white">
						{totalResults.toLocaleString('de-DE')}{' '}
						{totalResults === 1 ? 'Produkt' : 'Produkte'}
					</span>
					{searchQuery && (
						<span className="text-sm text-gray-400">
							für "{searchQuery}"
						</span>
					)}
				</div>

				{/* Pagination Info */}
				{totalPages > 1 && (
					<div className="text-sm text-gray-400">
						Seite {currentPage} von {totalPages}
					</div>
				)}
			</div>
		</div>
	);
};

export default SearchSummary;