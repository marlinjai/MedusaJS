// product-detail-section/product-info-actions.tsx
// Client component for product info and actions section

'use client';

import { HttpTypes } from '@medusajs/types';
import ProductInfo from '@modules/products/templates/product-info';
import ProductActions from '@modules/products/components/product-actions';
import QuoteRequest from '@modules/products/components/quote-request';
import OnRequestProduct from '@modules/products/components/on-request-product';

type ProductInfoActionsProps = {
	product: HttpTypes.StoreProduct;
	region: HttpTypes.StoreRegion;
	customer?: HttpTypes.StoreCustomer | null;
	inventorySettings?: { low_stock_threshold: number };
};

export default function ProductInfoActions({
	product,
	region,
	customer,
	inventorySettings,
}: ProductInfoActionsProps) {
	// Check shipping profile to determine which component to render
	const shippingProfile = (product as any).shipping_profile;
	const profileName = shippingProfile?.name?.toLowerCase() || '';

	// Check if product is "on request" (Artikel auf Anfrage)
	const isOnRequest =
		profileName.includes('artikel auf anfrage') ||
		profileName.includes('auf anfrage') ||
		profileName.includes('on request') ||
		shippingProfile?.id === 'artikel-auf-anfrage';

	// Check if product requires shipping quote (Sperrgut profile)
	const requiresShippingQuote =
		profileName.includes('sperrgut') ||
		profileName.includes('speergut') || // Handle typo
		shippingProfile?.type?.toLowerCase() === 'oversized' ||
		shippingProfile?.id === 'sperrgut';

	// Determine which action component to render
	let actionComponent;
	if (isOnRequest) {
		actionComponent = <OnRequestProduct product={product} customer={customer} />;
	} else if (requiresShippingQuote) {
		actionComponent = (
			<QuoteRequest
				product={product}
				variant={product.variants?.[0]}
				customer={customer}
			/>
		);
	} else {
		actionComponent = (
			<ProductActions
				product={product}
				region={region}
				lowStockThreshold={inventorySettings?.low_stock_threshold || 5}
			/>
		);
	}

	return (
		<div className="flex flex-col gap-y-8">
			{/* Product Info */}
			<div className="bg-card rounded-lg border border-border p-6 md:p-8">
				<ProductInfo product={product} />
			</div>

			{/* Product Actions (Add to Cart, etc.) */}
			<div className="bg-card rounded-lg border border-border p-6 md:p-8">
				{actionComponent}
			</div>
		</div>
	);
}

