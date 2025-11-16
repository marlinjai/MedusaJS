// product-actions-wrapper/index.tsx

import { listProducts } from '@lib/data/products';
import { getInventorySettings } from '@lib/data/inventory-settings';
import { HttpTypes } from '@medusajs/types';
import ProductActions from '@modules/products/components/product-actions';
import QuoteRequest from '@modules/products/components/quote-request';
import OnRequestProduct from '@modules/products/components/on-request-product';
import { retrieveCustomer } from '@lib/data/customer';

/**
 * Fetches real time pricing for a product and renders the appropriate component:
 * - OnRequestProduct for "Artikel auf Anfrage" shipping profile products
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

	// Get customer data for pre-filling forms
	const customer = await retrieveCustomer();

	// Get inventory settings for stock display
	const inventorySettings = await getInventorySettings();

	// Check if product requires shipping quote (Sperrgut profile)
	// Access the shipping_profile relation that was expanded in the query
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

	// Priority: On Request > Sperrgut > Normal
	if (isOnRequest) {
		return <OnRequestProduct product={product} customer={customer} />;
	}

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
