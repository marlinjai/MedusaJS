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
		region,
	});

	if (!pricedProduct) {
		return null;
	}

	// Check availability
	const isAvailable =
		product.variants?.some(variant =>
			variant.manage_inventory ? (variant.inventory_quantity || 0) > 0 : true,
		) ?? false;

	const totalInventory =
		product.variants?.reduce((sum, variant) => {
			return sum + (variant.inventory_quantity || 0);
		}, 0) || 0;

	return (
		<div className="group relative bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
			{/* Product Image - Square */}
			<div className="aspect-square relative overflow-hidden bg-gray-50">
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

				{/* Availability Badge */}
				<div className="absolute top-3 right-3">
					{isAvailable ? (
						<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
							Verfügbar
						</span>
					) : (
						<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
							Nicht verfügbar
						</span>
					)}
				</div>

				{/* Stock Count for Available Items */}
				{isAvailable && totalInventory > 0 && (
					<div className="absolute top-3 left-3">
						<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
							{totalInventory} auf Lager
						</span>
					</div>
				)}
			</div>

			{/* Product Info */}
			<div className="p-4 space-y-3">
				{/* Product Title */}
				<div className="min-h-[2.5rem]">
					<LocalizedClientLink
						href={`/products/${product.handle}`}
						className="block"
					>
						<Text className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
							{product.title}
						</Text>
					</LocalizedClientLink>
				</div>

				{/* Product Description */}
				{product.description && (
					<Text className="text-xs text-gray-600 line-clamp-2">
						{product.description}
					</Text>
				)}

				{/* Price */}
				<div className="flex items-center justify-between">
					<div className="flex-1">
						{pricedProduct.cheapestPrice && (
							<div className="text-sm font-medium text-gray-900">
								{pricedProduct.cheapestPrice.calculated_price}
							</div>
						)}
					</div>
				</div>

				{/* Action Button */}
				<div className="pt-2">
					<LocalizedClientLink
						href={`/products/${product.handle}`}
						className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Details ansehen
					</LocalizedClientLink>
				</div>

				{/* Categories */}
				{product.categories && product.categories.length > 0 && (
					<div className="flex flex-wrap gap-1 pt-2">
						{product.categories.slice(0, 2).map(category => (
							<span
								key={category.id}
								className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
							>
								{category.name}
							</span>
						))}
						{product.categories.length > 2 && (
							<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
								+{product.categories.length - 2} mehr
							</span>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default ProductCard;
