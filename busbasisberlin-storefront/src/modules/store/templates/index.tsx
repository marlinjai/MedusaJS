import { Suspense } from 'react';

import SkeletonProductGrid from '@modules/skeletons/templates/skeleton-product-grid';
import FilterWrapper from '@modules/store/components/filter-wrapper';
import { SortOptions } from '@modules/store/components/refinement-list/sort-products';
import SearchBar from '@modules/store/components/search-bar';

import PaginatedProducts from './paginated-products';

const StoreTemplate = ({
	sortBy,
	page,
	searchQuery,
	countryCode,
	categoryId,
	collectionId,
	viewMode = 'grid',
	perPage = 20,
	stockFilter,
}: {
	sortBy?: SortOptions;
	page?: string;
	searchQuery?: string;
	countryCode: string;
	categoryId?: string;
	collectionId?: string;
	viewMode?: 'grid' | 'list';
	perPage?: number;
	stockFilter?: string;
}) => {
	const pageNumber = page ? parseInt(page) : 1;
	const sort = sortBy || 'created_at';

	return (
		<div className="min-h-screen bg-black">
			{/* Hero Section with Search - More consistent with homepage */}
			<div className="relative py-16 px-4 md:px-8 bg-gradient-to-b from-neutral-900 to-black">
				{/* Subtle background texture */}
				<div className="absolute inset-0 bg-[url('/images/texture_I.jpg')] opacity-5 bg-cover bg-center"></div>

				<div className="relative max-w-7xl mx-auto">
					{/* Header */}
					<div className="text-center mb-12">
						{searchQuery ? (
							<div>
								<h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
									Suchergebnisse für "{searchQuery}"
								</h1>
								<p className="text-neutral-400 max-w-2xl mx-auto">
									Durchsuche unsere Produktpalette nach den gewünschten Teilen
								</p>
							</div>
						) : (
							<div>
								<h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
									Düdo Ersatzteile & Zubehör
								</h1>
								<p className="text-neutral-400 max-w-2xl mx-auto">
									Alles für Ihren Mercedes T2 "Düdo" - von Original-Ersatzteilen
									bis zu Camping-Ausstattung
								</p>
							</div>
						)}
					</div>

					{/* Search Bar - More subtle design */}
					<div className="mb-12">
						<SearchBar countryCode={countryCode} />
					</div>

					{/* Filters - Working basic implementation */}
					<FilterWrapper
						sortBy={sort}
						countryCode={countryCode}
						searchQuery={searchQuery}
						stockFilter={stockFilter}
					/>
				</div>
			</div>

			{/* Products Section */}
			<div className="relative px-4 md:px-8 pb-24">
				<div className="max-w-7xl mx-auto">
					<Suspense fallback={<SkeletonProductGrid />}>
						<PaginatedProducts
							sortBy={sort}
							page={pageNumber}
							searchQuery={searchQuery}
							countryCode={countryCode}
							categoryId={categoryId}
							collectionId={collectionId}
							viewMode={viewMode}
							perPage={perPage}
							stockFilter={stockFilter}
						/>
					</Suspense>
				</div>
			</div>
		</div>
	);
};

export default StoreTemplate;
