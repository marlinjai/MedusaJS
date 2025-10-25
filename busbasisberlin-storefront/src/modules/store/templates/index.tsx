import { Suspense } from 'react';

import SkeletonProductGrid from '@modules/skeletons/templates/skeleton-product-grid';
import { SortOptions } from '@modules/store/components/refinement-list/sort-products';
import RealTimeSearch from '@modules/store/components/search-bar/real-time-search';

import CatalogProducts from './catalog-products';

type StoreFilters = {
	category?: string; // Single category instead of array
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
		<div data-testid="store-container" className="min-h-screen bg-gray-900">
			{/* Dark Header Section */}
			<div className="bg-gray-800 border-b border-gray-700">
				<div className="content-container py-8">
					{/* Page Title */}
					<div className="mb-6">
						{searchQuery ? (
							<div>
								<h1
									className="text-3xl font-bold text-white mb-2"
									data-testid="store-page-title"
								>
									Suchergebnisse für "{searchQuery}"
								</h1>
								<p className="text-gray-400">
									Durchsuche unsere Produktpalette nach den gewünschten Teilen
								</p>
							</div>
						) : (
							<div>
								<h1
									className="text-3xl font-bold text-white mb-2"
									data-testid="store-page-title"
								>
									Düdo Ersatzteile & Zubehör
								</h1>
								<p className="text-gray-400">
									Alles für Ihren Mercedes T2 "Düdo" - von Original-Ersatzteilen
									bis zu Camping-Ausstattung
								</p>
							</div>
						)}
					</div>

					{/* Search Bar - Dark Theme */}
					<div className="max-w-3xl">
						<RealTimeSearch
							countryCode={countryCode}
							showInstantResults={false}
							placeholder="Nach Teilen suchen..."
						/>
					</div>
				</div>
			</div>

			{/* Main Content */}
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
