'use client';

import { convertToLocale } from '@lib/util/money';
import { useTranslations } from 'next-intl';
import React from 'react';

type CartTotalsProps = {
	totals: {
		total?: number | null;
		subtotal?: number | null;
		tax_total?: number | null;
		shipping_total?: number | null;
		discount_total?: number | null;
		gift_card_total?: number | null;
		currency_code: string;
		shipping_subtotal?: number | null;
		item_total?: number | null;
	};
};

const CartTotals: React.FC<CartTotalsProps> = ({ totals }) => {
	const t = useTranslations('cart');
	const {
		currency_code,
		total,
		subtotal,
		tax_total,
		discount_total,
		gift_card_total,
		shipping_subtotal,
		shipping_total,
		item_total,
	} = totals;

	// Debug: Log available totals to understand what's available
	console.log('=== CART TOTALS DEBUG ===');
	console.log('Available totals:', {
		total,
		subtotal,
		tax_total,
		shipping_total,
		shipping_subtotal,
		item_total,
		discount_total,
		gift_card_total,
	});
	console.log('========================');

	// Use item_total for subtotal (inkl. MwSt.) - this is the sum of all items
	// Fallback to subtotal if item_total is not available
	// Use shipping_total for shipping costs (inkl. MwSt.)
	// Fallback to shipping_subtotal if shipping_total is not available
	// Use total for final total
	const itemTotalBrutto = item_total ?? subtotal ?? 0;
	const shippingBrutto = shipping_total ?? shipping_subtotal ?? 0;
	const finalTotal = total ?? 0;

	// Calculate netto from brutto (tax-inclusive)
	// Formula: netto = brutto / 1.19
	const itemTotalNetto = itemTotalBrutto / 1.19;
	const itemTotalTax = itemTotalBrutto - itemTotalNetto;

	// Calculate total tax from final total
	// Formula: total_netto = total / 1.19, total_tax = total - total_netto
	const totalNetto = finalTotal / 1.19;
	const totalTax = finalTotal - totalNetto;

	return (
		<div className="space-y-4">
			{/* Clear calculation breakdown */}
			<div className="flex flex-col gap-y-2 text-sm text-gray-400">
				{/* Netto sum */}
				<div className="flex items-center justify-between">
					<span>Summe Waren (netto):</span>
					<span
						className="text-gray-300 font-medium"
						data-testid="cart-subtotal-netto"
					>
						{convertToLocale({ amount: itemTotalNetto, currency_code })}
					</span>
				</div>

				{/* Tax */}
				<div className="flex items-center justify-between">
					<span>+ MwSt. 19%:</span>
					<span className="text-gray-300 font-medium" data-testid="cart-tax">
						{convertToLocale({ amount: itemTotalTax, currency_code })}
					</span>
				</div>

				{/* Divider */}
				<div className="h-px w-full bg-gray-700 my-1" />

				{/* Brutto sum */}
				<div className="flex items-center justify-between">
					<span>= Summe Waren (brutto):</span>
					<span
						className="text-gray-300 font-medium"
						data-testid="cart-subtotal-brutto"
					>
						{convertToLocale({ amount: itemTotalBrutto, currency_code })}
					</span>
				</div>

				{/* Shipping */}
				<div className="flex items-center justify-between">
					<span>+ Versand (brutto):</span>
					<span
						className="text-gray-300 font-medium"
						data-testid="cart-shipping"
					>
						{convertToLocale({ amount: shippingBrutto, currency_code })}
					</span>
				</div>

				{/* Gift card discount if present */}
				{!!gift_card_total && (
					<div className="flex items-center justify-between text-green-400">
						<span>- Geschenkkarte:</span>
						<span className="font-medium" data-testid="cart-gift-card-amount">
							{convertToLocale({ amount: gift_card_total ?? 0, currency_code })}
						</span>
					</div>
				)}

				{/* Divider */}
				<div className="h-px w-full bg-gray-700 my-1" />
			</div>

			{/* Total */}
			<div className="flex items-center justify-between text-gray-100 pt-2">
				<span className="font-bold text-lg">= Gesamtbetrag:</span>
				<span
					className="text-2xl font-bold"
					data-testid="cart-total"
					data-value={finalTotal}
				>
					{convertToLocale({ amount: finalTotal, currency_code })}
				</span>
			</div>

			{/* Total tax info */}
			<div className="flex justify-between text-xs text-gray-500 italic pt-2 border-t border-gray-700">
				<span>Enthaltene MwSt. (19%):</span>
				<span data-testid="cart-total-taxes">
					{convertToLocale({ amount: totalTax, currency_code })}
				</span>
			</div>
		</div>
	);
};

export default CartTotals;
