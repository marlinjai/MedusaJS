// product-detail-section/index.tsx
// Client component that manages variant selection and image display with fallback logic

'use client';

import { HttpTypes } from '@medusajs/types';
import { createContext, useContext, useState, useEffect } from 'react';
import ImageGallery from '@modules/products/components/image-gallery';
import ProductInfoActions from './product-info-actions';

type VariantContextType = {
	selectedVariant: HttpTypes.StoreProductVariant | undefined;
	setSelectedVariant: (variant: HttpTypes.StoreProductVariant | undefined) => void;
};

const VariantContext = createContext<VariantContextType | undefined>(undefined);

export const useVariantContext = () => {
	const context = useContext(VariantContext);
	if (!context) {
		return { selectedVariant: undefined, setSelectedVariant: () => {} };
	}
	return context;
};

type ProductDetailSectionProps = {
	product: HttpTypes.StoreProduct;
	region: HttpTypes.StoreRegion;
	customer?: HttpTypes.StoreCustomer | null;
	inventorySettings?: { low_stock_threshold: number };
};

export default function ProductDetailSection({
	product,
	region,
	customer,
	inventorySettings,
}: ProductDetailSectionProps) {
	const [selectedVariant, setSelectedVariant] = useState<
		HttpTypes.StoreProductVariant | undefined
	>(undefined);

	// Determine which images to display: variant images if available, otherwise product images
	// This implements the fallback logic as recommended by Medusa
	const imagesToShow =
		selectedVariant?.images && selectedVariant.images.length > 0
			? selectedVariant.images
			: product.images || [];

	return (
		<VariantContext.Provider value={{ selectedVariant, setSelectedVariant }}>
			<>
				{/* Left: Image Gallery */}
				<div className="w-full">
					<ImageGallery images={imagesToShow} />
				</div>

				{/* Right: Product Info and Actions */}
				<ProductInfoActions
					product={product}
					region={region}
					customer={customer}
					inventorySettings={inventorySettings}
				/>
			</>
		</VariantContext.Provider>
	);
}

