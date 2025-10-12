import { searchProducts } from '@lib/data/products';
import { getRegion } from '@lib/data/regions';
import ProductPreview from '@modules/products/components/product-preview';
import { Pagination } from '@modules/store/components/pagination';
import ProductListItem from '@modules/store/components/product-list-item';
import { SortOptions } from '@modules/store/components/refinement-list/sort-products';

const DEFAULT_PRODUCT_LIMIT = 20;

export default async function PaginatedProducts({
	sortBy,
	page,
	collectionId,
	categoryId,
	productsIds,
	searchQuery,
	countryCode,
	viewMode = 'grid',
	perPage = DEFAULT_PRODUCT_LIMIT,
	stockFilter,
}: {
	sortBy?: SortOptions;
	page: number;
	collectionId?: string;
	categoryId?: string;
	productsIds?: string[];
	searchQuery?: string;
	countryCode: string;
	viewMode?: 'grid' | 'list';
	perPage?: number;
	stockFilter?: string;
}) {
	// Use the perPage value from URL, capped at 50 for performance
	const PRODUCT_LIMIT = Math.min(perPage, 50);
	const region = await getRegion(countryCode);

	if (!region) {
		return null;
	}

	// Use standard Medusa SDK approach for product search
	// Following official documentation: https://docs.medusajs.com/resources/storefront-development/products/list
	const { response } = await searchProducts({
		query: searchQuery?.trim() || '',
		page,
		limit: PRODUCT_LIMIT,
		countryCode,
		sortBy: sortBy || 'created_at',
		categoryId,
		collectionId,
		stockFilter,
	});

	const products = response.products;
	const count = response.count;
	const totalPages = Math.ceil(count / PRODUCT_LIMIT);

	// Zeige Nachricht wenn keine Suchergebnisse gefunden werden
	if (searchQuery && products.length === 0) {
		return (
			<div className="text-center py-12">
				<h3 className="text-lg font-medium text-gray-900 mb-2">
					Keine Produkte gefunden
				</h3>
				<p className="text-gray-600">
					Versuche es mit anderen Suchbegriffen oder durchstöbere alle Produkte.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Products Grid */}
			<div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-xl">
				<div className="flex items-center justify-between mb-8">
					<div>
						<h2 className="text-2xl font-semibold text-white mb-2">
							Produkte {searchQuery && `für "${searchQuery}"`}
						</h2>
						<p className="text-neutral-400">
							{products.length} {products.length === 1 ? 'Produkt' : 'Produkte'}{' '}
							gefunden
						</p>
					</div>
				</div>

				{viewMode === 'grid' ? (
					<ul
						className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
						data-testid="products-list"
					>
						{products.map(p => {
							return (
								<li key={p.id} className="group">
									<div className="bg-neutral-800/50 border border-neutral-700/50 rounded-2xl p-4 hover:bg-neutral-800 hover:border-neutral-600 transition-all duration-300 hover:scale-105 hover:shadow-xl">
										<ProductPreview product={p} region={region} />
									</div>
								</li>
							);
						})}
					</ul>
				) : (
					<ul className="space-y-4" data-testid="products-list">
						{products.map(p => {
							return (
								<li key={p.id}>
									<ProductListItem product={p} region={region} />
								</li>
							);
						})}
					</ul>
				)}

				{products.length === 0 && (
					<div className="text-center py-16">
						<div className="w-24 h-24 mx-auto mb-6 bg-neutral-800 rounded-full flex items-center justify-center">
							<svg
								className="w-12 h-12 text-neutral-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={1.5}
									d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a8.97 8.97 0 008.354-5.646z"
								/>
							</svg>
						</div>
						<h3 className="text-xl font-medium text-white mb-2">
							Keine Produkte gefunden
						</h3>
						<p className="text-neutral-400">
							Versuchen Sie andere Suchbegriffe oder Filter.
						</p>
					</div>
				)}
			</div>

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex justify-center">
					<div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-lg">
						<Pagination
							data-testid="product-pagination"
							page={page}
							totalPages={totalPages}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
