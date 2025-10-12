// src/modules/store/components/product-list-item/index.tsx
import { getProductPrice } from '@lib/util/get-product-price';
import { HttpTypes } from '@medusajs/types';
import { Text } from '@medusajs/ui';
import LocalizedClientLink from '@modules/common/components/localized-client-link';
import PreviewPrice from '@modules/products/components/product-preview/price';
import Thumbnail from '@modules/products/components/thumbnail';

// Helper to build category breadcrumb path (up to 4 levels)
const getCategoryPath = (
	categories: HttpTypes.StoreProductCategory[] | null | undefined,
): string[] => {
	if (!categories || categories.length === 0) return [];

	// Get the first category (products can be in multiple categories)
	const category = categories[0];
	const path: string[] = [];

	// Build path from root to current category (max 4 levels)
	let current: HttpTypes.StoreProductCategory | null | undefined = category;
	let depth = 0;
	while (current && depth < 4) {
		path.unshift(current.name);
		current = current.parent_category || null;
		depth++;
	}

	return path;
};

export default async function ProductListItem({
	product,
	region,
}: {
	product: HttpTypes.StoreProduct;
	region: HttpTypes.StoreRegion;
}) {
	const { cheapestPrice } = getProductPrice({
		product,
	});

	const categoryPath = getCategoryPath(product.categories);

	// Check if product is out of stock (all variants have inventory_quantity 0 or null)
	const isOutOfStock =
		product.variants?.every(
			variant =>
				variant.inventory_quantity === 0 || variant.inventory_quantity === null,
		) ?? false;

	return (
		<LocalizedClientLink href={`/products/${product.handle}`} className="group">
			<div
				data-testid="product-wrapper"
				className="flex gap-6 items-center bg-neutral-800/50 border border-neutral-700/50 rounded-2xl p-6 hover:bg-neutral-800 hover:border-neutral-600 transition-all duration-300 hover:shadow-xl"
			>
				{/* Product Image */}
				<div className="w-32 h-32 flex-shrink-0 relative">
					<Thumbnail
						thumbnail={product.thumbnail}
						images={product.images}
						size="square"
					/>
					{/* Out of Stock Badge */}
					{isOutOfStock && (
						<div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
							Ausverkauft
						</div>
					)}
				</div>

				{/* Product Info */}
				<div className="flex-1 min-w-0">
					<Text
						className="text-white text-lg font-medium mb-2 group-hover:text-blue-400 transition-colors"
						data-testid="product-title"
					>
						{product.title}
					</Text>

					{/* Category Breadcrumb */}
					{categoryPath.length > 0 && (
						<div className="flex items-center gap-2 text-xs text-neutral-400 mb-2">
							{categoryPath.map((cat, index) => (
								<span key={index} className="flex items-center gap-2">
									{index > 0 && <span className="text-neutral-600">›</span>}
									<span className="hover:text-blue-400 transition-colors">
										{cat}
									</span>
								</span>
							))}
						</div>
					)}

					{product.description && (
						<p className="text-neutral-400 text-sm line-clamp-2">
							{product.description}
						</p>
					)}
				</div>

				{/* Price */}
				<div className="flex-shrink-0 text-right">
					{cheapestPrice && <PreviewPrice price={cheapestPrice} />}
				</div>
			</div>
		</LocalizedClientLink>
	);
}
