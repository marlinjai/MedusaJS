'use client';

// product-info/index.tsx

import { useStoreSettings } from '@lib/context/store-settings-context';
import { HttpTypes } from '@medusajs/types';
import { Heading, Text } from '@medusajs/ui';

type ProductInfoProps = {
	product: HttpTypes.StoreProduct;
};

const ProductInfo = ({ product }: ProductInfoProps) => {
	const { settings } = useStoreSettings();

	return (
		<div id="product-info" className="flex flex-col gap-y-6">
			{/* Product Title */}
			<div>
				<Heading
					level="h1"
					className="text-2xl md:text-3xl font-bold text-foreground"
					data-testid="product-title"
				>
					{product.title}
				</Heading>

				{/* Subtitle */}
				{settings.product_display.show_subtitle_in_product_page &&
					(product as any).subtitle && (
						<Text className="text-base text-muted-foreground italic mt-2">
							{(product as any).subtitle}
						</Text>
					)}
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
						<span className="font-semibold text-foreground block mb-1">
							Material
						</span>
						<span className="text-muted-foreground">{product.material}</span>
					</div>
				</div>
			)}
		</div>
	);
};

export default ProductInfo;
