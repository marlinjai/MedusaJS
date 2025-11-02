import { HttpTypes } from '@medusajs/types';
import { getPercentageDiff } from './get-precentage-diff';
import { convertToLocale } from './money';

export const getPricesForVariant = (variant: any) => {
  if (!variant?.calculated_price?.calculated_amount) {
    return null;
  }

  // Use tax-inclusive prices (prices already include 19% MwSt.)
  const priceWithTax = variant.calculated_price.calculated_amount_with_tax || variant.calculated_price.calculated_amount;
  const originalWithTax = variant.calculated_price.original_amount_with_tax || variant.calculated_price.original_amount;

  return {
    calculated_price_number: priceWithTax,
    calculated_price: convertToLocale({
      amount: priceWithTax,
      currency_code: variant.calculated_price.currency_code,
    }),
    original_price_number: originalWithTax,
    original_price: convertToLocale({
      amount: originalWithTax,
      currency_code: variant.calculated_price.currency_code,
    }),
    currency_code: variant.calculated_price.currency_code,
    price_type: variant.calculated_price.calculated_price.price_list_type,
    percentage_diff: getPercentageDiff(
      originalWithTax,
      priceWithTax,
    ),
    is_tax_inclusive: variant.calculated_price.is_calculated_price_tax_inclusive || true,
  };
};

export function getProductPrice({ product, variantId }: { product: HttpTypes.StoreProduct; variantId?: string }) {
  if (!product || !product.id) {
    throw new Error('No product provided');
  }

  const cheapestPrice = () => {
    if (!product || !product.variants?.length) {
      return null;
    }

    const cheapestVariant: any = product.variants
      .filter((v: any) => !!v.calculated_price)
      .sort((a: any, b: any) => {
        return a.calculated_price.calculated_amount - b.calculated_price.calculated_amount;
      })[0];

    return getPricesForVariant(cheapestVariant);
  };

  const variantPrice = () => {
    if (!product || !variantId) {
      return null;
    }

    const variant: any = product.variants?.find(v => v.id === variantId || v.sku === variantId);

    if (!variant) {
      return null;
    }

    return getPricesForVariant(variant);
  };

  return {
    product,
    cheapestPrice: cheapestPrice(),
    variantPrice: variantPrice(),
  };
}
