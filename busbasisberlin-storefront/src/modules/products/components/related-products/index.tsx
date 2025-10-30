// related-products/index.tsx

import { getRegion } from '@lib/data/regions';
import { HttpTypes } from '@medusajs/types';
import InfiniteSlider from './infinite-slider';

type RelatedProductsProps = {
	product: HttpTypes.StoreProduct;
	countryCode: string;
};

export default async function RelatedProducts({ product, countryCode }: RelatedProductsProps) {
	const region = await getRegion(countryCode);

	if (!region) {
		return null;
	}

	return (
		<div className="w-full">
			<div className="flex flex-col items-center text-center mb-8 md:mb-12">
				<span className="text-sm font-semibold text-primary mb-2 uppercase tracking-wider">
					Weitere Produkte
				</span>
				<h2 className="text-2xl md:text-3xl font-bold text-foreground">
					Entdecken Sie mehr
				</h2>
			</div>

			<InfiniteSlider region={region} currentProductId={product.id} />
		</div>
	);
}
