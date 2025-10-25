// src/modules/store/templates/catalog-products.tsx
// Catalog products component using the new /store/catalog API
import { getCatalogData, type CatalogFilters } from '@lib/data/catalog';
import { getRegion } from '@lib/data/regions';
import CategoryFilterSimple from '@modules/store/components/category-filter-simple';
import AvailabilityFilter from '@modules/store/components/filters/availability-filter';
import PriceFilter from '@modules/store/components/filters/price-filter';
import { Pagination } from '@modules/store/components/pagination';
import ProductCard from '@modules/store/components/product-card';
import { SortOptions } from '@modules/store/components/refinement-list/sort-products';

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
			<div className="py-6 content-container">
				{/* Filters Above Products */}
				<div className="mb-8">
					<div className="grid grid-cols-1 medium:grid-cols-3 gap-6 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
						{/* Category Filter */}
						<div>
							<CategoryFilterSimple
								categoryNames={facets.category_names}
								categoryPaths={facets.category_paths}
							/>
						</div>

						{/* Availability Filter */}
						<div>
							<AvailabilityFilter
								value={appliedFilters.availability as any}
								facetData={facets.is_available}
							/>
						</div>

						{/* Price Filter */}
						<div>
							<PriceFilter
								minPrice={appliedFilters.priceRange?.min}
								maxPrice={appliedFilters.priceRange?.max}
							/>
						</div>
					</div>
				</div>

				{/* Main Content */}
				<div className="w-full">
					{/* Results Summary */}
					<div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
						<div className="flex items-center space-x-4">
							<span className="text-sm text-gray-600">
								{totalProducts} {totalProducts === 1 ? 'Produkt' : 'Produkte'}
								{appliedFilters.query && ` für "${appliedFilters.query}"`}
							</span>
							<span className="text-xs text-gray-500">
								({processingTimeMs}ms)
							</span>
						</div>

						{/* Active Filters Summary */}
						{(appliedFilters.categories.length > 0 ||
							appliedFilters.tags.length > 0 ||
							appliedFilters.collections.length > 0 ||
							appliedFilters.availability !== 'all' ||
							appliedFilters.priceRange) && (
							<div className="text-sm text-gray-500">
								{appliedFilters.categories.length > 0 && (
									<span className="mr-2">
										{appliedFilters.categories.length} Kategorie
										{appliedFilters.categories.length !== 1 ? 'n' : ''}
									</span>
								)}
								{appliedFilters.availability !== 'all' && (
									<span className="mr-2">Verfügbarkeit</span>
								)}
								{appliedFilters.priceRange && (
									<span className="mr-2">Preisfilter</span>
								)}
							</div>
						)}
					</div>

					{/* No results */}
					{products.length === 0 ? (
						<div className="text-center py-12">
							<h3 className="text-lg font-medium text-gray-900 mb-2">
								Keine Produkte gefunden
							</h3>
							{appliedFilters.query ||
							appliedFilters.categories.length > 0 ||
							appliedFilters.availability !== 'all' ||
							appliedFilters.priceRange ? (
								<div className="space-y-2">
									<p className="text-gray-600">
										Keine Produkte entsprechen den aktuellen Filterkriterien.
									</p>
									<p className="text-sm text-gray-500">
										Versuchen Sie, einige Filter zu entfernen oder andere
										Suchbegriffe zu verwenden.
									</p>
								</div>
							) : (
								<p className="text-gray-600">Keine Produkte verfügbar.</p>
							)}
						</div>
					) : (
						<>
							{/* Products Grid - Squared Cards */}
							<ul
								className="grid grid-cols-1 small:grid-cols-2 medium:grid-cols-3 large:grid-cols-4 gap-6 mb-8"
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
								<Pagination
									data-testid="product-pagination"
									page={pagination.page}
									totalPages={pagination.totalPages}
								/>
							)}
						</>
					)}
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
