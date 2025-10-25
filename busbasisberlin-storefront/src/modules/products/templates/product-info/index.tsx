import { HttpTypes } from '@medusajs/types';
import { Heading, Text } from '@medusajs/ui';
import LocalizedClientLink from '@modules/common/components/localized-client-link';

type ProductInfoProps = {
	product: HttpTypes.StoreProduct;
};

const ProductInfo = ({ product }: ProductInfoProps) => {
	return (
		<div id="product-info" className="bg-gray-800 rounded-lg border border-gray-700 p-6">
			<div className="flex flex-col gap-y-4">
				{product.collection && (
					<LocalizedClientLink
						href={`/collections/${product.collection.handle}`}
						className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
					>
						{product.collection.title}
					</LocalizedClientLink>
				)}
				<Heading
					level="h2"
					className="text-2xl font-bold leading-tight text-white"
					data-testid="product-title"
				>
					{product.title}
				</Heading>

				<Text
					className="text-sm text-gray-400 whitespace-pre-line leading-relaxed"
					data-testid="product-description"
				>
					{product.description}
				</Text>
			</div>
		</div>
	);
};

export default ProductInfo;
