import { listCartShippingMethods } from '@lib/data/fulfillment';
import { listCartPaymentMethods } from '@lib/data/payment';
import { HttpTypes } from '@medusajs/types';
import UnifiedCheckout from '@modules/checkout/templates/unified-checkout';

export default async function CheckoutForm({
	cart,
	customer,
}: {
	cart: HttpTypes.StoreCart | null;
	customer: HttpTypes.StoreCustomer | null;
}) {
	if (!cart) {
		return null;
	}

	const shippingMethods = await listCartShippingMethods(cart.id);
	const paymentMethods = await listCartPaymentMethods(cart.region?.id ?? '');

	if (!shippingMethods || !paymentMethods) {
		return null;
	}

	return (
		<UnifiedCheckout
			cart={cart}
			customer={customer}
			shippingMethods={shippingMethods}
			paymentMethods={paymentMethods}
		/>
	);
}
