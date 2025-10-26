// src/modules/store/templates/catalog-products.tsx
// Simplified catalog products component using existing search functionality
import { unifiedProductSearch } from '@lib/data/search';
import ProductPreview from '@modules/products/components/product-preview';
import CategoryFilterSimple from '@modules/store/components/category-filter-simple';
import AvailabilityFilter from '@modules/store/components/filters/availability-filter';
import { Pagination } from '@modules/store/components/pagination';
import { SortOptions } from '@modules/store/components/refinement-list/sort-products';
import { getRegion } from '../../../lib/data/regions';

type StoreFilters = {
	category?: string;
	availability: 'all' | 'in_stock' | 'out_of_stock';
	minPrice?: number;
	maxPrice?: number;
	tags: string[];
	collections: string[];
};

type CatalogProductsProps = {
	sortBy: SortOptions;
	page: number;
	searchQuery?: string;
	filters?: StoreFilters;
	countryCode: string;
};

const CatalogProducts = async ({
	sortBy,
	page,
	searchQuery,
	filters = {
		availability: 'all',
		tags: [],
		collections: [],
	},
	countryCode,
}: CatalogProductsProps) => {
	const region = await getRegion(countryCode);

	if (!region) {
		return (
			<div className="content-container py-12 text-center">
				<h3 className="text-lg font-medium text-white mb-2">
					Region nicht gefunden
				</h3>
				<p className="text-gray-400">
					Die angeforderte Region konnte nicht geladen werden.
				</p>
			</div>
		);
	}

	try {
		// Use the unified search function with filters
		const searchResult = await unifiedProductSearch({
			query: searchQuery || '',
			page,
			limit: 12,
			countryCode,
			sortBy,
			categoryHandle: filters.category,
			stockFilter: filters.availability,
		});

		const { products, count } = searchResult.response;
		const totalPages = Math.ceil(count / 12);

		return (
			<div className="content-container py-6">
				{/* Desktop/Tablet: Sidebar + Content Layout */}
				<div className="flex flex-col lg:flex-row gap-8">
					{/* Sidebar - Filters (Desktop: Left Side, Mobile: Top) */}
					<aside className="w-full lg:w-72 flex-shrink-0">
						<div className="space-y-4">
							{/* Category Filter - Dark Theme */}
							<div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
								<CategoryFilterSimple
									categoryNames={{}} // Empty for now, will be enhanced in Phase 4
									categoryPaths={{}}
								/>
							</div>

							{/* Availability Filter - Dark Theme */}
							<div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
								<AvailabilityFilter value={filters.availability} />
							</div>
						</div>
					</aside>

					{/* Main Content Area */}
					<main className="flex-1 min-w-0">
						{/* Results Summary Bar - Dark Theme */}
						<div className="bg-gray-800 rounded-lg border border-gray-700 px-6 py-4 mb-6">
							<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
								<div className="flex items-center gap-4">
									<span className="text-base font-medium text-white">
										{count.toLocaleString('de-DE')}{' '}
										{count === 1 ? 'Produkt' : 'Produkte'}
									</span>
									{searchQuery && (
										<span className="text-sm text-gray-400">
											für "{searchQuery}"
										</span>
									)}
								</div>

								{/* Active Filters Tags - Dark Theme */}
								{(filters.category || filters.availability !== 'all') && (
									<div className="flex flex-wrap gap-2">
										{filters.category && (
											<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-600 text-white">
												{filters.category}
											</span>
										)}
										{filters.availability !== 'all' && (
											<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-600 text-white">
												{filters.availability === 'in_stock'
													? 'Verfügbar'
													: 'Nicht verfügbar'}
											</span>
										)}
									</div>
								)}
							</div>
						</div>

						{/* No Results - Dark Theme */}
						{products.length === 0 ? (
							<div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
								<div className="max-w-md mx-auto">
									<svg
										className="mx-auto h-12 w-12 text-gray-500 mb-4"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
									<h3 className="text-lg font-semibold text-white mb-2">
										Keine Produkte gefunden
									</h3>
									{searchQuery ||
									filters.category ||
									filters.availability !== 'all' ? (
										<div className="space-y-2">
											<p className="text-gray-400">
												Keine Produkte entsprechen den aktuellen
												Filterkriterien.
											</p>
											<p className="text-sm text-gray-500">
												Versuchen Sie, einige Filter zu entfernen.
											</p>
										</div>
									) : (
										<p className="text-gray-400">Keine Produkte verfügbar.</p>
									)}
								</div>
							</div>
						) : (
							<>
								{/* Products Grid */}
								<ul
									className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8"
									data-testid="products-list"
								>
									{products.map((product: any) => (
										<li key={product.id}>
											<ProductPreview product={product} region={region} />
										</li>
									))}
								</ul>

								{/* Pagination */}
								{totalPages > 1 && (
									<div className="flex justify-center mt-8">
										<Pagination
											data-testid="product-pagination"
											page={page}
											totalPages={totalPages}
										/>
									</div>
								)}
							</>
						)}
					</main>
				</div>
			</div>
		);
	} catch (error) {
		console.error('Catalog error:', error);
		return (
			<div className="content-container py-12 text-center">
				<h3 className="text-lg font-medium text-white mb-2">
					Fehler beim Laden des Katalogs
				</h3>
				<p className="text-gray-400">
					Die Produktdaten konnten nicht geladen werden. Bitte versuchen Sie es
					später erneut.
				</p>
			</div>
		);
	}
};

export default CatalogProducts;
