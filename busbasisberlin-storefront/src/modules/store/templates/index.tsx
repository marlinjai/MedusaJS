import { Suspense } from 'react';

import SkeletonProductGrid from '@modules/skeletons/templates/skeleton-product-grid';
import { SortOptions } from '@modules/store/components/refinement-list/sort-products';
import RealTimeSearch from '@modules/store/components/search-bar/real-time-search';

import CatalogProducts from './catalog-products';

type StoreFilters = {
	categories: string[];
	availability: 'all' | 'in_stock' | 'out_of_stock';
	minPrice?: number;
	maxPrice?: number;
	tags: string[];
	collections: string[];
};

const StoreTemplate = ({
	sortBy,
	page,
	searchQuery,
	filters,
	countryCode,
}: {
	sortBy?: SortOptions;
	page?: string;
	searchQuery?: string;
	filters?: StoreFilters;
	countryCode: string;
}) => {
	const pageNumber = page ? parseInt(page) : 1;
	const sort = sortBy || 'created_at';

	return (
		<div data-testid="store-container">
			{/* Enhanced Real-time Search */}
			<div className="mb-6 content-container">
				<RealTimeSearch
					countryCode={countryCode}
					showInstantResults={false}
					placeholder="Nach Teilen suchen..."
				/>
			</div>

			<div className="mb-8 content-container">
				{/* Titel je nach Suchbegriff anpassen */}
				{searchQuery ? (
					<div>
						<h1 className="text-2xl-semi mb-2" data-testid="store-page-title">
							Suchergebnisse für "{searchQuery}"
						</h1>
						<p className="text-gray-600">
							Durchsuche unsere Produktpalette nach den gewünschten Teilen
						</p>
					</div>
				) : (
					<div>
						<h1 className="text-2xl-semi mb-2" data-testid="store-page-title">
							Produktkatalog
						</h1>
						<p className="text-gray-600">
							Verwende die Filter und Kategorien um die gewünschten Teile zu finden
						</p>
					</div>
				)}
			</div>

			<Suspense fallback={<SkeletonProductGrid />}>
				<CatalogProducts
					sortBy={sort}
					page={pageNumber}
					searchQuery={searchQuery}
					filters={filters}
					countryCode={countryCode}
				/>
			</Suspense>
		</div>
	);
};

export default StoreTemplate;
