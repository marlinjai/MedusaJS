import { listProductsWithSort, searchProducts } from '@lib/data/products';
import { getRegion } from '@lib/data/regions';
import ProductPreview from '@modules/products/components/product-preview';
import { Pagination } from '@modules/store/components/pagination';
import { SortOptions } from '@modules/store/components/refinement-list/sort-products';

const PRODUCT_LIMIT = 12;

type PaginatedProductsParams = {
	limit: number;
	collection_id?: string[];
	category_id?: string[];
	id?: string[];
	order?: string;
};

export default async function PaginatedProducts({
	sortBy,
	page,
	collectionId,
	categoryId,
	productsIds,
	searchQuery,
	countryCode,
}: {
	sortBy?: SortOptions;
	page: number;
	collectionId?: string;
	categoryId?: string;
	productsIds?: string[];
	searchQuery?: string;
	countryCode: string;
}) {
	const region = await getRegion(countryCode);

	if (!region) {
		return null;
	}

	let products, count, totalPages;

	// Verwende Suchfunktion wenn Suchbegriff vorhanden ist
	if (searchQuery && searchQuery.trim()) {
		const searchResult = await searchProducts({
			query: searchQuery.trim(),
			page,
			limit: PRODUCT_LIMIT,
			countryCode,
			sortBy,
		});

		products = searchResult.response.products;
		count = searchResult.response.count;
		totalPages = Math.ceil(count / PRODUCT_LIMIT);
	} else {
		// Normale Produktliste ohne Suche
		const queryParams: PaginatedProductsParams = {
			limit: 12,
		};

		if (collectionId) {
			queryParams['collection_id'] = [collectionId];
		}

		if (categoryId) {
			queryParams['category_id'] = [categoryId];
		}

		if (productsIds) {
			queryParams['id'] = productsIds;
		}

		if (sortBy === 'created_at') {
			queryParams['order'] = 'created_at';
		}

		const {
			response: { products: normalProducts, count: normalCount },
		} = await listProductsWithSort({
			page,
			queryParams,
			sortBy,
			countryCode,
		});

		products = normalProducts;
		count = normalCount;
		totalPages = Math.ceil(count / PRODUCT_LIMIT);
	}

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
		<>
			<ul
				className="grid grid-cols-2 w-full small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-8"
				data-testid="products-list"
			>
				{products.map(p => {
					return (
						<li key={p.id}>
							<ProductPreview product={p} region={region} />
						</li>
					);
				})}
			</ul>
			{totalPages > 1 && (
				<Pagination
					data-testid="product-pagination"
					page={page}
					totalPages={totalPages}
				/>
			)}
		</>
	);
}
