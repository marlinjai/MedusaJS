import { listProducts } from '@lib/data/products';
import { getRegion } from '@lib/data/regions';
import UnifiedProductCard from '@modules/products/components/unified-product-card';
import SkeletonProductGrid from '@modules/skeletons/templates/skeleton-product-grid';
import { Pagination } from '@modules/store/components/pagination';
import { Suspense } from 'react';

type SortOptions = 'price_asc' | 'price_desc' | 'created_at';

type PaginatedProductsProps = {
	sortBy: SortOptions;
	page: number;
	categoryId?: string;
	collectionId?: string;
	countryCode: string;
};

async function ProductResults({
	sortBy,
	page,
	categoryId,
	collectionId,
	countryCode,
}: PaginatedProductsProps) {
	const region = await getRegion(countryCode);
	if (!region) return null;

	const limit = 12;
	const offset = (page - 1) * limit;

	const queryParams = {
		region_id: region.id,
		limit,
		offset,
	} as any;

	if (categoryId) {
		queryParams.category_id = [categoryId];
	}
	if (collectionId) {
		queryParams.collection_id = [collectionId];
	}

	const { response } = await listProducts({ queryParams, countryCode });
	const totalPages = Math.ceil((response.count || 0) / limit);

	return (
		<div className="w-full">
			<ul className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-x-4 gap-y-8">
				{response.products.map(product => (
					<li key={product.id}>
						<UnifiedProductCard
							product={product}
							showDescription={false}
							showCategories={true}
							showStock={true}
						/>
					</li>
				))}
			</ul>
			{totalPages > 1 && <Pagination page={page} totalPages={totalPages} />}
		</div>
	);
}

export default function PaginatedProducts(props: PaginatedProductsProps) {
	return (
		<Suspense fallback={<SkeletonProductGrid numberOfProducts={12} />}>
			<ProductResults {...props} />
		</Suspense>
	);
}
