import { Heading } from '@medusajs/ui';
import ItemsPreviewTemplate from '@modules/cart/templates/preview';
import DiscountCode from '@modules/checkout/components/discount-code';
import CartTotals from '@modules/common/components/cart-totals';
import { useTranslations } from 'next-intl';

const CheckoutSummary = ({ cart }: { cart: any }) => {
	const t = useTranslations('cart.summary');

	return (
		<div className="sticky top-24">
			<div className="w-full bg-card border border-neutral-700 rounded-lg p-6 space-y-6">
				<Heading
					level="h2"
					className="text-2xl font-bold"
				>
					{t('title')}
				</Heading>
				<div className="h-px bg-neutral-700" />
				<CartTotals totals={cart} />
				<div className="h-px bg-neutral-700" />
				<ItemsPreviewTemplate cart={cart} />
				<div className="h-px bg-neutral-700" />
				<DiscountCode cart={cart} />
			</div>
		</div>
	);
};

export default CheckoutSummary;
