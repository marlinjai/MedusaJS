// product-info/index.tsx

import { HttpTypes } from '@medusajs/types';
import { Heading, Text } from '@medusajs/ui';
import LocalizedClientLink from '@modules/common/components/localized-client-link';

type ProductInfoProps = {
	product: HttpTypes.StoreProduct;
};

const ProductInfo = ({ product }: ProductInfoProps) => {
	return (
		<div id="product-info" className="flex flex-col gap-y-6">
			{/* Breadcrumb / Collection */}
			{product.collection && (
				<LocalizedClientLink
					href={`/collections/${product.collection.handle}`}
					className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
				>
					<span>←</span>
					{product.collection.title}
				</LocalizedClientLink>
			)}

			{/* Product Title */}
			<div>
				<Heading
					level="h1"
					className="text-2xl md:text-3xl font-bold text-foreground"
					data-testid="product-title"
				>
					{product.title}
				</Heading>
			</div>

			{/* Product Description */}
			{product.description && (
				<div className="border-t border-border pt-6">
					<Text
						className="text-base text-muted-foreground whitespace-pre-line leading-relaxed"
						data-testid="product-description"
					>
						{product.description}
					</Text>
				</div>
			)}

			{/* Additional Product Details */}
			{product.material && (
				<div className="border-t border-border pt-6 text-sm">
					<div>
						<span className="font-semibold text-foreground block mb-1">Material</span>
						<span className="text-muted-foreground">{product.material}</span>
					</div>
				</div>
			)}
		</div>
	);
};

export default ProductInfo;
