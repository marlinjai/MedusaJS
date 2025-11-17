// products/templates/index.tsx

import React, { Suspense } from 'react';

import { HttpTypes } from '@medusajs/types';
import RelatedProducts from '@modules/products/components/related-products';
import SkeletonRelatedProducts from '@modules/skeletons/templates/skeleton-related-products';
import ProductOnboardingCta from '@modules/products/components/product-onboarding-cta';
import { notFound } from 'next/navigation';
import ProductDetailSection from '@modules/products/components/product-detail-section';
import { listProducts } from '@lib/data/products';
import { getInventorySettings } from '@lib/data/inventory-settings';
import { retrieveCustomer } from '@lib/data/customer';
import { PAGE_PADDING_TOP_LARGE } from '@lib/util/page-padding';

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
			queryParams: { id: [product.id] },
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
				<div className={`content-container pb-12 md:pb-20 ${PAGE_PADDING_TOP_LARGE}`}>
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
				</div>
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
