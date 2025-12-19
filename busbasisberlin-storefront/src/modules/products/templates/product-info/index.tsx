'use client';

// product-info/index.tsx

import { useStoreSettings } from '@lib/context/store-settings-context';
import { HttpTypes } from '@medusajs/types';
import { Heading, Text } from '@medusajs/ui';
import LocalizedClientLink from '@modules/common/components/localized-client-link';
import { Fragment } from 'react';

type ProductInfoProps = {
	product: HttpTypes.StoreProduct;
};

// Helper function to build category hierarchy breadcrumb
const getCategoryBreadcrumb = (
	categories?: HttpTypes.StoreProductCategory[],
): HttpTypes.StoreProductCategory[] => {
	if (!categories || categories.length === 0) return [];

	// Use first category (products typically have one main category)
	const category = categories[0];
	const breadcrumb: HttpTypes.StoreProductCategory[] = [];

	// Build hierarchy by recursively following parent_category
	const buildPath = (cat: HttpTypes.StoreProductCategory) => {
		breadcrumb.unshift(cat);
		if (cat.parent_category) {
			buildPath(cat.parent_category);
		}
	};

	buildPath(category);
	return breadcrumb;
};

const ProductInfo = ({ product }: ProductInfoProps) => {
	// DEBUG: Log product categories
	console.log('[ProductInfo] Product data:', {
		title: product.title,
		categories: product.categories,
		categoryCount: product.categories?.length,
		firstCategory: product.categories?.[0],
		hasParent: product.categories?.[0]?.parent_category,
	});

	const categoryBreadcrumb = getCategoryBreadcrumb(
		product.categories || undefined,
	);

	console.log('[ProductInfo] Breadcrumb result:', categoryBreadcrumb);

	const { settings } = useStoreSettings();

	return (
		<div id="product-info" className="flex flex-col gap-y-6">
			{/* Category Breadcrumb */}
			{categoryBreadcrumb.length > 0 && (
				<div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
					<span>←</span>
					{categoryBreadcrumb.map((category, index) => (
						<Fragment key={category.id}>
							{index > 0 && <span className="text-muted-foreground">/</span>}
							<LocalizedClientLink
								href={`/categories/${category.handle}`}
								className="hover:text-foreground transition-colors"
							>
								{category.name}
							</LocalizedClientLink>
						</Fragment>
					))}
				</div>
			)}

			{/* Product Title */}
			<div>
				<Heading
					level="h1"
					className="text-2xl md:text-3xl font-bold text-foreground"
					data-testid="product-title"
				>
					{product.title}
				</Heading>

				{/* Subtitle */}
				{settings.product_display.show_subtitle_in_product_page &&
					(product as any).subtitle && (
						<Text className="text-base text-muted-foreground italic mt-2">
							{(product as any).subtitle}
						</Text>
					)}
			</div>

			{/* Product Description */}
			{product.description && (
				<div className="border-t border-border pt-6">
					<Text
						className="text-base text-muted-foreground whitespace-pre-line leading-relaxed"
						data-testid="product-description"
					>
						{product.description}
					</Text>
				</div>
			)}

			{/* Additional Product Details */}
			{product.material && (
				<div className="border-t border-border pt-6 text-sm">
					<div>
						<span className="font-semibold text-foreground block mb-1">
							Material
						</span>
						<span className="text-muted-foreground">{product.material}</span>
					</div>
				</div>
			)}
		</div>
	);
};

export default ProductInfo;
