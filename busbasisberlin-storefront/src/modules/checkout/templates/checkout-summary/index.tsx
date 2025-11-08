import { Heading } from '@medusajs/ui';
import ItemsPreviewTemplate from '@modules/cart/templates/preview';
import DiscountCode from '@modules/checkout/components/discount-code';
import CartTotals from '@modules/common/components/cart-totals';
import { useTranslations } from 'next-intl';

const CheckoutSummary = ({ cart }: { cart: any }) => {
	const t = useTranslations('cart.summary');

	// DEBUG: Log cart data to understand calculation
	console.log('=== CHECKOUT CART DEBUG ===');
	console.log('Cart object:', cart);
	console.log('Cart totals:', {
		subtotal: cart.subtotal,
		total: cart.total,
		tax_total: cart.tax_total,
		shipping_total: cart.shipping_total,
		item_subtotal: cart.item_subtotal,
		item_total: cart.item_total,
	});
	console.log(
		'Cart items:',
		cart.items?.map((item: any) => ({
			title: item.product_title,
			quantity: item.quantity,
			unit_price: item.unit_price,
			subtotal: item.subtotal,
			total: item.total,
			original_total: item.original_total,
			tax_total: item.tax_total,
		})),
	);
	console.log('========================');

	return (
		<div className="sticky top-24">
			<div className="w-full bg-card border border-neutral-700 rounded-lg p-6 space-y-6">
				<Heading level="h2" className="text-2xl font-bold">
					{t('title')}
				</Heading>
				<div className="h-px bg-neutral-700" />
				{/* Products first - show items with images */}
				<ItemsPreviewTemplate cart={cart} />
				<div className="h-px bg-neutral-700" />
				{/* Then show calculation breakdown */}
				<CartTotals totals={cart} />
				<div className="h-px bg-neutral-700" />
				<DiscountCode cart={cart} />
			</div>
		</div>
	);
};

export default CheckoutSummary;
