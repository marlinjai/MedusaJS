// products/templates/index.tsx

import React, { Suspense } from 'react';

import ImageGallery from '@modules/products/components/image-gallery';
import ProductActions from '@modules/products/components/product-actions';
import ProductOnboardingCta from '@modules/products/components/product-onboarding-cta';
import ProductTabs from '@modules/products/components/product-tabs';
import RelatedProducts from '@modules/products/components/related-products';
import ProductInfo from '@modules/products/templates/product-info';
import SkeletonRelatedProducts from '@modules/skeletons/templates/skeleton-related-products';
import { notFound } from 'next/navigation';
import ProductActionsWrapper from './product-actions-wrapper';
import { HttpTypes } from '@medusajs/types';

type ProductTemplateProps = {
	product: HttpTypes.StoreProduct;
	region: HttpTypes.StoreRegion;
	countryCode: string;
};

const ProductTemplate: React.FC<ProductTemplateProps> = ({ product, region, countryCode }) => {
	if (!product || !product.id) {
		return notFound();
	}

	return (
		<>
			{/* Product Detail Section with Texture Background */}
			<div className="relative bg-background">
				{/* Texture Background */}
				<div
					className="absolute inset-0 opacity-5"
					style={{
						backgroundImage: 'url(/images/texture_I.jpg)',
						backgroundSize: 'cover',
						backgroundPosition: 'center',
						backgroundRepeat: 'no-repeat',
					}}
				/>

				<div className="relative content-container py-12 md:py-20">
					{/* Main Grid: Image Left, Content Right */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
						{/* Left: Image Gallery */}
						<div className="w-full">
							<ImageGallery images={product?.images || []} />
						</div>

						{/* Right: Product Info and Actions */}
						<div className="flex flex-col gap-y-8">
							{/* Product Info */}
							<div className="bg-card rounded-lg border border-border p-6 md:p-8">
								<ProductInfo product={product} />
							</div>

							{/* Product Actions (Add to Cart, etc.) */}
							<div className="bg-card rounded-lg border border-border p-6 md:p-8">
								<Suspense
									fallback={
										<ProductActions disabled={true} product={product} region={region} />
									}
								>
									<ProductActionsWrapper id={product.id} region={region} />
								</Suspense>
							</div>

							{/* Onboarding CTA if needed */}
							<ProductOnboardingCta />
						</div>
					</div>
				</div>
			</div>

			{/* Related Products Section */}
			<div className="content-container my-16 md:my-24" data-testid="related-products-container">
				<Suspense fallback={<SkeletonRelatedProducts />}>
					<RelatedProducts product={product} countryCode={countryCode} />
				</Suspense>
			</div>
		</>
	);
};

export default ProductTemplate;
