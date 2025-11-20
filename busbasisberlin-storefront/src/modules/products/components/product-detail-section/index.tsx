// product-detail-section/index.tsx
// Client component that manages variant selection and image display with fallback logic

'use client';

import { HttpTypes } from '@medusajs/types';
import ImageGallery from '@modules/products/components/image-gallery';
import { createContext, useContext, useMemo, useState } from 'react';
import ProductInfoActions from './product-info-actions';

type VariantContextType = {
	selectedVariant: HttpTypes.StoreProductVariant | undefined;
	setSelectedVariant: (
		variant: HttpTypes.StoreProductVariant | undefined,
	) => void;
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
		console.log('[ProductDetailSection] imagesToShow calculation started');
		console.log('[ProductDetailSection] Product ID:', product.id);
		console.log('[ProductDetailSection] Product title:', product.title);
		console.log(
			'[ProductDetailSection] Selected variant:',
			selectedVariant?.id || 'NONE',
		);
		console.log('[ProductDetailSection] Product images:', product.images);
		console.log(
			'[ProductDetailSection] Product images count:',
			product.images?.length || 0,
		);
		console.log(
			'[ProductDetailSection] Variants count:',
			product.variants?.length || 0,
		);

		// If a variant is selected, try to get its images first
		if (selectedVariant?.id) {
			console.log(
				'[ProductDetailSection] Step 1: Checking selected variant images',
			);
			// First, try to get images from the selected variant object
			const variantImages = (selectedVariant as any)?.images;
			console.log(
				'[ProductDetailSection] Selected variant images (direct):',
				variantImages,
			);

			// If variant doesn't have images directly, try to find the variant in product.variants
			// which might have the images populated
			if (
				!variantImages ||
				!Array.isArray(variantImages) ||
				variantImages.length === 0
			) {
				console.log(
					'[ProductDetailSection] Step 1a: No direct variant images, checking product.variants',
				);
				const fullVariant = product.variants?.find(
					v => v.id === selectedVariant.id,
				);
				const fullVariantImages = (fullVariant as any)?.images;
				console.log(
					'[ProductDetailSection] Full variant found:',
					!!fullVariant,
				);
				console.log(
					'[ProductDetailSection] Full variant images:',
					fullVariantImages,
				);

				if (
					fullVariantImages &&
					Array.isArray(fullVariantImages) &&
					fullVariantImages.length > 0
				) {
					console.log(
						'[ProductDetailSection] ✅ Using variant images from product.variants:',
						fullVariantImages.length,
					);
					return fullVariantImages;
				}
			} else if (Array.isArray(variantImages) && variantImages.length > 0) {
				console.log(
					'[ProductDetailSection] ✅ Using variant images from selectedVariant:',
					variantImages.length,
				);
				return variantImages;
			}
			console.log('[ProductDetailSection] Step 1: No variant images found');
		} else {
			console.log(
				'[ProductDetailSection] Step 1: No variant selected, skipping variant check',
			);
		}

		// If no variant selected or selected variant has no images, check product images
		console.log('[ProductDetailSection] Step 2: Checking product images');
		if (
			product.images &&
			Array.isArray(product.images) &&
			product.images.length > 0
		) {
			console.log(
				'[ProductDetailSection] ✅ Using product images:',
				product.images.length,
			);
			return product.images;
		}
		console.log('[ProductDetailSection] Step 2: No product images found');

		// If product has no images, check all variants for images (some products only have variant images)
		console.log(
			'[ProductDetailSection] Step 3: Checking all variants for images',
		);
		if (product.variants && product.variants.length > 0) {
			// Try to find any variant with images
			for (const variant of product.variants) {
				const variantImages = (variant as any)?.images;
				console.log(`[ProductDetailSection] Checking variant ${variant.id}:`, {
					title: variant.title,
					sku: variant.sku,
					images: variantImages,
					imagesCount: variantImages?.length || 0,
				});
				if (
					variantImages &&
					Array.isArray(variantImages) &&
					variantImages.length > 0
				) {
					// Return first variant's images found
					console.log(
						'[ProductDetailSection] ✅ Using images from variant:',
						variant.id,
						variantImages.length,
					);
					return variantImages;
				}
			}
		}
		console.log('[ProductDetailSection] Step 3: No variant images found');

		// If no images found anywhere, return empty array
		console.log(
			'[ProductDetailSection] ❌ No images found anywhere, returning empty array',
		);
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
