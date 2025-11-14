// busbasisberlin-storefront/src/modules/order/components/shipping-details/index.tsx
// Shipping details component with special handling for pickup orders

'use client';

import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { Heading, Text } from "@medusajs/ui"
import Divider from "@modules/common/components/divider"
import { useTranslations } from 'next-intl';

type ShippingDetailsProps = {
  order: HttpTypes.StoreOrder
}

const ShippingDetails = ({ order }: ShippingDetailsProps) => {
  const t = useTranslations('order.delivery');

  // Check if this is a pickup order
  const shippingMethod = order.shipping_methods?.[0];
  const shippingOptionName = shippingMethod?.shipping_option?.name?.toLowerCase() || '';
  const isPickupOrder = shippingOptionName.includes('abholung') || shippingOptionName.includes('pickup');

  return (
    <div>
      <Heading level="h2" className="text-2xl font-bold text-white my-6">
        {t('title')}
      </Heading>
      {isPickupOrder ? (
        // Pickup order display
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            className="flex flex-col"
            data-testid="pickup-location-summary"
          >
            <Text className="font-semibold text-white mb-2">
              {t('pickupLocation')}
            </Text>
            <Text className="text-neutral-400">
              {t('pickupAddress')}
            </Text>
            <Text className="text-neutral-400 mt-2">
              {t('pickupInstructions')}
            </Text>
          </div>

          <div
            className="flex flex-col"
            data-testid="pickup-contact-summary"
          >
            <Text className="font-semibold text-white mb-2">{t('contact')}</Text>
            <Text className="text-neutral-400">
              {order.shipping_address?.phone || t('contactViaEmail')}
            </Text>
            <Text className="text-neutral-400">{order.email}</Text>
          </div>

          <div
            className="flex flex-col"
            data-testid="pickup-method-summary"
          >
            <Text className="font-semibold text-white mb-2">{t('method')}</Text>
            <Text className="text-neutral-400">
              {shippingMethod?.name || shippingMethod?.shipping_option?.name || ''} (
              {convertToLocale({
                amount: order.shipping_methods?.[0].total ?? 0,
                currency_code: order.currency_code,
              })
                .replace(/,/g, "")
                .replace(/\./g, ",")}
              )
            </Text>
          </div>
        </div>
      ) : (
        // Standard shipping display
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            className="flex flex-col"
            data-testid="shipping-address-summary"
          >
            <Text className="font-semibold text-white mb-2">
              {t('shippingAddress')}
            </Text>
            <Text className="text-neutral-400">
              {order.shipping_address?.first_name}{" "}
              {order.shipping_address?.last_name}
            </Text>
            <Text className="text-neutral-400">
              {order.shipping_address?.address_1}{" "}
              {order.shipping_address?.address_2}
            </Text>
            <Text className="text-neutral-400">
              {order.shipping_address?.postal_code},{" "}
              {order.shipping_address?.city}
            </Text>
            <Text className="text-neutral-400">
              {order.shipping_address?.country_code?.toUpperCase()}
            </Text>
          </div>

          <div
            className="flex flex-col"
            data-testid="shipping-contact-summary"
          >
            <Text className="font-semibold text-white mb-2">{t('contact')}</Text>
            <Text className="text-neutral-400">
              {order.shipping_address?.phone}
            </Text>
            <Text className="text-neutral-400">{order.email}</Text>
          </div>

          <div
            className="flex flex-col"
            data-testid="shipping-method-summary"
          >
            <Text className="font-semibold text-white mb-2">{t('method')}</Text>
            <Text className="text-neutral-400">
              {shippingMethod?.name || shippingMethod?.shipping_option?.name || ''} (
              {convertToLocale({
                amount: order.shipping_methods?.[0].total ?? 0,
                currency_code: order.currency_code,
              })
                .replace(/,/g, "")
                .replace(/\./g, ",")}
              )
            </Text>
          </div>
        </div>
      )}
      <Divider className="mt-8 border-neutral-700" />
    </div>
  )
}

export default ShippingDetails
