import React, { Suspense } from 'react';

import { HttpTypes } from '@medusajs/types';
import ImageGallery from '@modules/products/components/image-gallery';
import ProductActions from '@modules/products/components/product-actions';
import ProductOnboardingCta from '@modules/products/components/product-onboarding-cta';
import ProductTabs from '@modules/products/components/product-tabs';
import RelatedProducts from '@modules/products/components/related-products';
import ProductInfo from '@modules/products/templates/product-info';
import SkeletonRelatedProducts from '@modules/skeletons/templates/skeleton-related-products';
import { notFound } from 'next/navigation';
import ProductActionsWrapper from './product-actions-wrapper';

type ProductTemplateProps = {
	product: HttpTypes.StoreProduct;
	region: HttpTypes.StoreRegion;
	countryCode: string;
};

const ProductTemplate: React.FC<ProductTemplateProps> = ({
	product,
	region,
	countryCode,
}) => {
	if (!product || !product.id) {
		return notFound();
	}

	return (
		<div className="min-h-screen bg-black">
			{/* Subtle background texture */}
			<div className="absolute inset-0 bg-[url('/images/texture_I.jpg')] opacity-5 bg-cover bg-center pointer-events-none"></div>

			{/* Main Product Section */}
			<div className="relative px-4 md:px-8 py-12">
				<div className="max-w-7xl mx-auto">
					{/* Product Card */}
					<div className="bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden">
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 lg:p-12">
							{/* Left Side - Image Gallery */}
							<div className="space-y-4">
								<ImageGallery images={product?.images || []} />
							</div>

							{/* Right Side - Product Info & Actions */}
							<div className="flex flex-col gap-8">
								{/* Product Info */}
								<div className="space-y-6">
									<ProductInfo product={product} />
								</div>

								{/* Product Actions */}
								<div className="space-y-6">
									<Suspense
										fallback={
											<ProductActions
												disabled={true}
												product={product}
												region={region}
											/>
										}
									>
										<ProductActionsWrapper id={product.id} region={region} />
									</Suspense>
								</div>

								{/* Product Tabs */}
								<div className="mt-6 pt-6 border-t border-neutral-700">
									<ProductTabs product={product} />
								</div>

								{/* Onboarding CTA */}
								<ProductOnboardingCta />
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Related Products Section */}
			<div className="relative px-4 md:px-8 py-12">
				<div className="max-w-7xl mx-auto">
					<div className="mb-8">
						<h2 className="text-3xl font-bold text-white mb-2">
							Sie könnten auch diese Produkte interessieren
						</h2>
						<p className="text-neutral-400">
							Weitere passende Ersatzteile für Ihren Düdo
						</p>
					</div>
					<Suspense fallback={<SkeletonRelatedProducts />}>
						<RelatedProducts product={product} countryCode={countryCode} />
					</Suspense>
				</div>
			</div>
		</div>
	);
};

export default ProductTemplate;
