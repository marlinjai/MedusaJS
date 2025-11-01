// summary.tsx

'use client';

import { useTranslations } from '@lib/i18n/translations-context';
import { HttpTypes } from '@medusajs/types';
import { Button, Heading } from '@medusajs/ui';
import DiscountCode from '@modules/checkout/components/discount-code';
import CartTotals from '@modules/common/components/cart-totals';
import Divider from '@modules/common/components/divider';
import LocalizedClientLink from '@modules/common/components/localized-client-link';

type SummaryProps = {
	cart: HttpTypes.StoreCart & {
		promotions: HttpTypes.StorePromotion[];
	};
};

function getCheckoutStep(cart: HttpTypes.StoreCart) {
	if (!cart?.shipping_address?.address_1 || !cart.email) {
		return 'address';
	} else if (cart?.shipping_methods?.length === 0) {
		return 'delivery';
	} else {
		return 'payment';
	}
}

const Summary = ({ cart }: SummaryProps) => {
	const t = useTranslations('cart.summary');
	const step = getCheckoutStep(cart);

	return (
		<div className="flex flex-col gap-y-6 bg-stone-950 rounded-xl p-6">
			<Heading level="h2" className="text-2xl font-bold text-gray-100">
				{t('title')}
			</Heading>
			<DiscountCode cart={cart} />
			<Divider className="border-gray-700" />
			<CartTotals totals={cart} />
			<LocalizedClientLink
				href={'/checkout?step=' + step}
				data-testid="checkout-button"
			>
				<Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
					{t('goToCheckout')}
				</Button>
			</LocalizedClientLink>
		</div>
	);
};

export default Summary;
