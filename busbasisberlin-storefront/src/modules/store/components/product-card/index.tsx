// src/modules/store/components/product-card/index.tsx
// Squared product card with availability, price, and details link
'use client';

import { getProductPrice } from '@lib/util/get-product-price';
import { HttpTypes } from '@medusajs/types';
import { Text } from '@medusajs/ui';
import LocalizedClientLink from '@modules/common/components/localized-client-link';
import Thumbnail from '@modules/products/components/thumbnail';
// import PreviewPrice from '@modules/products/components/product-preview/price';

type ProductCardProps = {
	product: HttpTypes.StoreProduct;
	region: HttpTypes.StoreRegion;
	isFeatured?: boolean;
};

const ProductCard = ({ product, region, isFeatured }: ProductCardProps) => {
	const pricedProduct = getProductPrice({
		product,
	});

	if (!pricedProduct) {
		return null;
	}

	// Check availability - products from Meilisearch have is_available field
	// If not present, fall back to checking variant inventory
	const isAvailable =
		(product as any).is_available !== undefined
			? (product as any).is_available
			: product.variants?.some(variant =>
					variant.manage_inventory
						? (variant.inventory_quantity || 0) > 0
						: true,
			  ) ?? false;

	const totalInventory =
		product.variants?.reduce((sum, variant) => {
			return sum + (variant.inventory_quantity || 0);
		}, 0) || 0;

	return (
		<div className="group relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
			{/* Product Image - Square */}
			<div className="aspect-square relative overflow-hidden bg-gray-100 dark:bg-gray-900">
				<LocalizedClientLink
					href={`/products/${product.handle}`}
					className="absolute inset-0"
				>
					<Thumbnail
						thumbnail={product.thumbnail}
						images={product.images}
						size="square"
						className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
					/>
				</LocalizedClientLink>

				{/* Availability Badge - Top Right */}
				<div className="absolute top-2 right-2 z-10">
					{isAvailable ? (
						<span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-green-500 text-white shadow-sm">
							Auf Lager
						</span>
					) : (
						<span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-red-500 text-white shadow-sm">
							Anfragen
						</span>
					)}
				</div>

				{/* Stock Count Badge - Top Left (only if available and has inventory) */}
				{isAvailable && totalInventory > 0 && (
					<div className="absolute top-2 left-2 z-10">
						<span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-white backdrop-blur-sm shadow-sm">
							{totalInventory} Stück
						</span>
					</div>
				)}
			</div>

			{/* Product Info */}
			<div className="p-4 space-y-2.5">
				{/* Product Title */}
				<div className="min-h-[2.8rem]">
					<LocalizedClientLink
						href={`/products/${product.handle}`}
						className="block"
					>
						<Text className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
							{product.title}
						</Text>
					</LocalizedClientLink>
				</div>

				{/* Product Description */}
				{product.description && (
					<Text className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
						{product.description}
					</Text>
				)}

				{/* Price */}
				<div className="flex items-baseline gap-2 pt-1">
					{pricedProduct.cheapestPrice && (
						<div className="text-lg font-bold text-gray-900 dark:text-white">
							{pricedProduct.cheapestPrice.calculated_price}
						</div>
					)}
				</div>

				{/* Action Button */}
				<div className="pt-2">
					<LocalizedClientLink
						href={`/products/${product.handle}`}
						className="w-full inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isAvailable ? 'Details ansehen' : 'Anfragen'}
					</LocalizedClientLink>
				</div>

				{/* Categories */}
				{product.categories && product.categories.length > 0 && (
					<div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100 dark:border-gray-700">
						{product.categories.slice(0, 2).map(category => (
							<span
								key={category.id}
								className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
							>
								{category.name}
							</span>
						))}
						{product.categories.length > 2 && (
							<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
								+{product.categories.length - 2}
							</span>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default ProductCard;
