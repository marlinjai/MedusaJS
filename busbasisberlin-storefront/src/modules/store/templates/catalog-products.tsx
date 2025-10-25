// src/modules/store/templates/catalog-products.tsx
// Catalog products component using the new /store/catalog API
import CategoryFilterSimple from '@modules/store/components/category-filter-simple';
import AvailabilityFilter from '@modules/store/components/filters/availability-filter';
import PriceFilter from '@modules/store/components/filters/price-filter';
import { Pagination } from '@modules/store/components/pagination';
import ProductCard from '@modules/store/components/product-card';
import { SortOptions } from '@modules/store/components/refinement-list/sort-products';
import { getCatalogData, type CatalogFilters } from '../../../lib/data/catalog';
import { getRegion } from '../../../lib/data/regions';

type StoreFilters = {
	category?: string; // Single category instead of array
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
			<div className="text-center py-12">
				<h3 className="text-lg font-medium text-gray-900 mb-2">
					Region nicht gefunden
				</h3>
				<p className="text-gray-600">
					Die angeforderte Region konnte nicht geladen werden.
				</p>
			</div>
		);
	}

	// Build catalog filters - convert single category to array for API
	const catalogFilters: CatalogFilters = {
		query: searchQuery,
		categories: filters.category ? [filters.category] : [],
		availability: filters.availability,
		minPrice: filters.minPrice,
		maxPrice: filters.maxPrice,
		tags: filters.tags,
		collections: filters.collections,
		sortBy,
		page,
		limit: 12,
	};

	try {
		// Get catalog data from backend
		const catalogData = await getCatalogData(catalogFilters, countryCode);

		const {
			products,
			facets,
			totalProducts,
			appliedFilters,
			pagination,
			processingTimeMs,
		} = catalogData;

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
									categoryNames={facets.category_names}
									categoryPaths={facets.category_paths}
								/>
							</div>

							{/* Availability Filter - Dark Theme */}
							<div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
								<AvailabilityFilter
									value={appliedFilters.availability as any}
									facetData={facets.is_available}
								/>
							</div>

							{/* Price Filter - Dark Theme */}
							<div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
								<PriceFilter
									minPrice={appliedFilters.priceRange?.min}
									maxPrice={appliedFilters.priceRange?.max}
								/>
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
										{totalProducts.toLocaleString('de-DE')}{' '}
										{totalProducts === 1 ? 'Produkt' : 'Produkte'}
									</span>
									{appliedFilters.query && (
										<span className="text-sm text-gray-400">
											für "{appliedFilters.query}"
										</span>
									)}
								</div>

								{/* Active Filters Tags - Dark Theme */}
								{(appliedFilters.categories.length > 0 ||
									appliedFilters.availability !== 'all' ||
									appliedFilters.priceRange) && (
									<div className="flex flex-wrap gap-2">
										{appliedFilters.categories.length > 0 && (
											<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-600 text-white">
												{appliedFilters.categories[0]}
											</span>
										)}
										{appliedFilters.availability !== 'all' && (
											<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-600 text-white">
												{appliedFilters.availability === 'in_stock'
													? 'Verfügbar'
													: 'Nicht verfügbar'}
											</span>
										)}
										{appliedFilters.priceRange && (
											<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-600 text-white">
												Preisfilter
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
									{appliedFilters.query ||
									appliedFilters.categories.length > 0 ||
									appliedFilters.availability !== 'all' ||
									appliedFilters.priceRange ? (
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
									{products.map(product => (
										<li key={product.id}>
											<ProductCard product={product} region={region} />
										</li>
									))}
								</ul>

								{/* Pagination */}
								{pagination.totalPages > 1 && (
									<div className="flex justify-center mt-8">
										<Pagination
											data-testid="product-pagination"
											page={pagination.page}
											totalPages={pagination.totalPages}
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
			<div className="text-center py-12">
				<h3 className="text-lg font-medium text-gray-900 mb-2">
					Fehler beim Laden des Katalogs
				</h3>
				<p className="text-gray-600">
					Die Produktdaten konnten nicht geladen werden. Bitte versuchen Sie es
					später erneut.
				</p>
			</div>
		);
	}
};

export default CatalogProducts;
