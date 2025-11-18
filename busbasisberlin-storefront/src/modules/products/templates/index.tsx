// products/templates/index.tsx

import React, { Suspense } from 'react';

import { retrieveCustomer } from '@lib/data/customer';
import { getInventorySettings } from '@lib/data/inventory-settings';
import { listProducts } from '@lib/data/products';
import HeroAlertPaddingWrapper from '@lib/util/hero-alert-padding-wrapper';
import { HttpTypes } from '@medusajs/types';
import ProductDetailSection from '@modules/products/components/product-detail-section';
import ProductOnboardingCta from '@modules/products/components/product-onboarding-cta';
import RelatedProducts from '@modules/products/components/related-products';
import SkeletonRelatedProducts from '@modules/skeletons/templates/skeleton-related-products';
import { notFound } from 'next/navigation';

type ProductTemplateProps = {
	product: HttpTypes.StoreProduct;
	region: HttpTypes.StoreRegion;
	countryCode: string;
};

const ProductTemplate: React.FC<ProductTemplateProps> = async ({
	product,
	region,
	countryCode,
}) => {
	if (!product || !product.id) {
		return notFound();
	}

	// Fetch additional data needed for ProductActions
	// Re-fetch product to get latest pricing and shipping profile
	const [freshProduct, customer, inventorySettings] = await Promise.all([
		listProducts({
			// id is a valid query param for Medusa API but not in TypeScript type definition
			queryParams: { id: [product.id] } as any,
			regionId: region.id,
		}).then(({ response }) => response.products[0]),
		retrieveCustomer(),
		getInventorySettings(),
	]);

	// Use fresh product if available, otherwise fall back to original
	const productWithData = freshProduct || product;

	return (
		<div className="relative bg-background min-h-screen">
			{/* Texture Background - covers entire page */}
			<div
				className="fixed inset-0 opacity-10 pointer-events-none"
				style={{
					backgroundImage: 'url(/images/texture_I.jpg)',
					backgroundSize: 'cover',
					backgroundPosition: 'center',
					backgroundRepeat: 'no-repeat',
				}}
			/>

			{/* Product Detail Section */}
			<div className="relative">
				<HeroAlertPaddingWrapper
					size="large"
					className="content-container pb-12 md:pb-20"
				>
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
						{/* Product Detail Section - returns grid with image and info/actions */}
						<ProductDetailSection
							product={productWithData}
							region={region}
							customer={customer}
							inventorySettings={inventorySettings}
						/>

						{/* Onboarding CTA - Server Component in right column */}
						<div className="flex flex-col gap-y-8">
							<ProductOnboardingCta />
						</div>
					</div>
				</HeroAlertPaddingWrapper>
			</div>

			{/* Related Products Section */}
			<div
				className="relative content-container my-16 md:my-24"
				data-testid="related-products-container"
			>
				<Suspense fallback={<SkeletonRelatedProducts />}>
					<RelatedProducts product={product} countryCode={countryCode} />
				</Suspense>
			</div>
		</div>
	);
};

export default ProductTemplate;
