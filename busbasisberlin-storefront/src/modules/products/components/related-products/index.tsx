import { listProducts } from '@lib/data/products';
import { getRegion } from '@lib/data/regions';
import { HttpTypes } from '@medusajs/types';
import Product from '../product-preview';

type RelatedProductsProps = {
	product: HttpTypes.StoreProduct;
	countryCode: string;
};

export default async function RelatedProducts({
	product,
	countryCode,
}: RelatedProductsProps) {
	const region = await getRegion(countryCode);

	if (!region) {
		return null;
	}

	// edit this function to define your related products logic
	const queryParams: HttpTypes.StoreProductParams = {};
	if (region?.id) {
		queryParams.region_id = region.id;
	}
	if (product.collection_id) {
		queryParams.collection_id = [product.collection_id];
	}
	if (product.tags) {
		queryParams.tag_id = product.tags
			.map(t => t.id)
			.filter(Boolean) as string[];
	}
	queryParams.is_giftcard = false;

	const products = await listProducts({
		queryParams,
		countryCode,
	}).then(({ response }) => {
		return response.products.filter(
			responseProduct => responseProduct.id !== product.id,
		);
	});

	if (!products.length) {
		return null;
	}

	return (
		<div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-xl">
			<ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
				{products.slice(0, 10).map(product => (
					<li key={product.id} className="group">
						<div className="bg-neutral-800/50 border border-neutral-700/50 rounded-2xl p-4 hover:bg-neutral-800 hover:border-neutral-600 transition-all duration-300 hover:scale-105 hover:shadow-xl">
							<Product region={region} product={product} />
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}
