// product-actions-wrapper/index.tsx

import { listProducts } from '@lib/data/products';
import { getInventorySettings } from '@lib/data/inventory-settings';
import { HttpTypes } from '@medusajs/types';
import ProductActions from '@modules/products/components/product-actions';
import QuoteRequest from '@modules/products/components/quote-request';
import { retrieveCustomer } from '@lib/data/customer';

/**
 * Fetches real time pricing for a product and renders the appropriate component:
 * - QuoteRequest for "Sperrgut" shipping profile products
 * - ProductActions for normal products
 */
export default async function ProductActionsWrapper({
	id,
	region,
}: {
	id: string;
	region: HttpTypes.StoreRegion;
}) {
	const product = await listProducts({
		queryParams: { id: [id] },
		regionId: region.id,
	}).then(({ response }) => response.products[0]);

	if (!product) {
		return null;
	}

	// Get customer data for pre-filling quote form
	const customer = await retrieveCustomer();

	// Get inventory settings for stock display
	const inventorySettings = await getInventorySettings();

	// Check if product requires shipping quote (Sperrgut profile)
	// Access the shipping_profile relation that was expanded in the query
	const shippingProfile = (product as any).shipping_profile;

	// Debug logging
	console.log('🔍 Product:', product.title);
	console.log('📦 Shipping Profile:', shippingProfile);
	console.log('📦 Profile Name:', shippingProfile?.name);
	console.log('📦 Profile ID:', shippingProfile?.id);

	const requiresShippingQuote =
		shippingProfile?.name?.toLowerCase().includes('sperrgut') ||
		shippingProfile?.name?.toLowerCase().includes('speergut') || // Handle typo
		shippingProfile?.type?.toLowerCase() === 'oversized' ||
		shippingProfile?.id === 'sperrgut';

	console.log('✅ Requires Shipping Quote:', requiresShippingQuote);

	if (requiresShippingQuote) {
		return <QuoteRequest product={product} variant={product.variants?.[0]} customer={customer} />;
	}

	return (
		<ProductActions
			product={product}
			region={region}
			lowStockThreshold={inventorySettings.low_stock_threshold}
		/>
	);
}
