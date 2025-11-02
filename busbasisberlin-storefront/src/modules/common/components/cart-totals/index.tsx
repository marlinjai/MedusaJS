"use client"

import { convertToLocale } from "@lib/util/money"
import React from "react"
import { useTranslations } from "next-intl"

type CartTotalsProps = {
  totals: {
    total?: number | null
    subtotal?: number | null
    tax_total?: number | null
    shipping_total?: number | null
    discount_total?: number | null
    gift_card_total?: number | null
    currency_code: string
    shipping_subtotal?: number | null
  }
}

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
  } = totals

  // Calculate tax from tax-inclusive price if tax_total is 0
  // German tax rate: 19%
  // Formula: tax = price - (price / 1.19)
  const displayTaxTotal = tax_total && tax_total > 0
    ? tax_total
    : (subtotal || 0) - ((subtotal || 0) / 1.19); // Extract exact 19% from tax-inclusive price

  return (
    <div>
      <div className="flex flex-col gap-y-3 txt-medium text-gray-400">
        <div className="flex items-center justify-between">
          <span className="text-sm">
            Zwischensumme (inkl. 19% MwSt.)
          </span>
          <span className="text-gray-300 font-medium" data-testid="cart-subtotal" data-value={subtotal || 0}>
            {convertToLocale({ amount: subtotal ?? 0, currency_code })}
          </span>
        </div>
        {!!discount_total && (
          <div className="flex items-center justify-between">
            <span className="text-sm">Rabatt</span>
            <span
              className="text-green-400 font-medium"
              data-testid="cart-discount"
              data-value={discount_total || 0}
            >
              -{" "}
              {convertToLocale({ amount: discount_total ?? 0, currency_code })}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm">Versand</span>
          <span className="text-gray-300 font-medium" data-testid="cart-shipping" data-value={shipping_subtotal || 0}>
            {convertToLocale({ amount: shipping_subtotal ?? 0, currency_code })}
          </span>
        </div>
        {/* Tax info - calculated from tax-inclusive price */}
        <div className="flex justify-between text-xs text-gray-500 italic">
          <span>davon MwSt. (19%)</span>
          <span data-testid="cart-taxes" data-value={displayTaxTotal}>
            {convertToLocale({ amount: displayTaxTotal, currency_code })}
          </span>
        </div>
        {!!gift_card_total && (
          <div className="flex items-center justify-between">
            <span className="text-sm">Geschenkkarte</span>
            <span
              className="text-green-400 font-medium"
              data-testid="cart-gift-card-amount"
              data-value={gift_card_total || 0}
            >
              -{" "}
              {convertToLocale({ amount: gift_card_total ?? 0, currency_code })}
            </span>
          </div>
        )}
      </div>
      <div className="h-px w-full bg-gray-700 my-4" />
      <div className="flex items-center justify-between text-gray-100">
        <span className="font-bold text-lg">Gesamt</span>
        <span
          className="text-2xl font-bold"
          data-testid="cart-total"
          data-value={total || 0}
        >
          {convertToLocale({ amount: total ?? 0, currency_code })}
        </span>
      </div>
    </div>
  )
}

export default CartTotals
