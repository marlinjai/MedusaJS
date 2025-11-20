// product-detail-section/index.tsx
// Client component that manages variant selection and image display with fallback logic

'use client';

import { HttpTypes } from '@medusajs/types';
import { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
	// Use useMemo to recalculate when selectedVariant changes
	const imagesToShow = useMemo(() => {
		// If a variant is selected, try to get its images first
		if (selectedVariant?.id) {
			// First, try to get images from the selected variant object
			const variantImages = (selectedVariant as any)?.images;

			// If variant doesn't have images directly, try to find the variant in product.variants
			// which might have the images populated
			if (!variantImages || !Array.isArray(variantImages) || variantImages.length === 0) {
				const fullVariant = product.variants?.find(v => v.id === selectedVariant.id);
				const fullVariantImages = (fullVariant as any)?.images;

				if (fullVariantImages && Array.isArray(fullVariantImages) && fullVariantImages.length > 0) {
					return fullVariantImages;
				}
			} else if (Array.isArray(variantImages) && variantImages.length > 0) {
				return variantImages;
			}
		}

		// If no variant selected or selected variant has no images, check product images
		if (product.images && Array.isArray(product.images) && product.images.length > 0) {
			return product.images;
		}

		// If product has no images, check all variants for images (some products only have variant images)
		if (product.variants && product.variants.length > 0) {
			// Try to find any variant with images
			for (const variant of product.variants) {
				const variantImages = (variant as any)?.images;
				if (variantImages && Array.isArray(variantImages) && variantImages.length > 0) {
					// Return first variant's images found
					return variantImages;
				}
			}
		}

		// If no images found anywhere, return empty array
		return [];
	}, [selectedVariant, product.images, product.variants]);

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

