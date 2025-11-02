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
  
  return (
    <div>
      <Heading level="h2" className="text-2xl font-bold text-white my-6">
        {t('title')}
      </Heading>
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
            {(order as any).shipping_methods[0]?.name} (
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
      <Divider className="mt-8 border-neutral-700" />
    </div>
  )
}

export default ShippingDetails
