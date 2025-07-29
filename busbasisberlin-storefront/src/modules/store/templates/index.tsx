import { Suspense } from 'react';

import SkeletonProductGrid from '@modules/skeletons/templates/skeleton-product-grid';
import RefinementList from '@modules/store/components/refinement-list';
import { SortOptions } from '@modules/store/components/refinement-list/sort-products';
import SearchBar from '@modules/store/components/search-bar';

import PaginatedProducts from './paginated-products';

const StoreTemplate = ({
	sortBy,
	page,
	searchQuery,
	countryCode,
}: {
	sortBy?: SortOptions;
	page?: string;
	searchQuery?: string;
	countryCode: string;
}) => {
	const pageNumber = page ? parseInt(page) : 1;
	const sort = sortBy || 'created_at';

	return (
		<div
			className="flex flex-col small:flex-row small:items-start py-6 content-container"
			data-testid="category-container"
		>
			<RefinementList sortBy={sort} />
			<div className="w-full">
				{/* Suchleiste hinzufügen */}
				<div className="mb-6">
					<SearchBar countryCode={countryCode} />
				</div>

				<div className="mb-8">
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
						<h1 className="text-2xl-semi" data-testid="store-page-title">
							All products
						</h1>
					)}
				</div>

				<Suspense fallback={<SkeletonProductGrid />}>
					<PaginatedProducts
						sortBy={sort}
						page={pageNumber}
						searchQuery={searchQuery}
						countryCode={countryCode}
					/>
				</Suspense>
			</div>
		</div>
	);
};

export default StoreTemplate;
