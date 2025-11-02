'use client';

import { HttpTypes } from "@medusajs/types"
import { Text } from "@medusajs/ui"
import { useTranslations } from 'next-intl';

type OrderDetailsProps = {
  order: HttpTypes.StoreOrder
  showStatus?: boolean
}

const OrderDetails = ({ order, showStatus }: OrderDetailsProps) => {
  const t = useTranslations('order.details');

  const formatStatus = (str: string) => {
    const formatted = str.split("_").join(" ")
    return formatted.slice(0, 1).toUpperCase() + formatted.slice(1)
  }

  return (
    <div className="bg-neutral-800/50 rounded-lg p-6 border border-neutral-700">
      <Text className="text-neutral-300">
        {t('emailSent')}{" "}
        <span
          className="text-blue-400 font-semibold"
          data-testid="order-email"
        >
          {order.email}
        </span>{" "}
        {t('emailSentEnd')}
      </Text>
      <Text className="mt-3 text-neutral-300">
        {t('orderDate')}{" "}
        <span data-testid="order-date" className="font-medium text-white">
          {new Date(order.created_at).toLocaleDateString('de-DE', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </span>
      </Text>
      <Text className="mt-3 text-blue-400 font-semibold text-lg">
        {t('orderNumber')} <span data-testid="order-id">{order.display_id}</span>
      </Text>

      <div className="flex items-center text-compact-small gap-x-4 mt-4">
        {showStatus && (
          <>
            <Text>
              Order status:{" "}
              <span className="text-ui-fg-subtle " data-testid="order-status">
                {/* TODO: Check where the statuses should come from */}
                {/* {formatStatus(order.fulfillment_status)} */}
              </span>
            </Text>
            <Text>
              Payment status:{" "}
              <span
                className="text-ui-fg-subtle "
                data-testid="order-payment-status"
              >
                {/* {formatStatus(order.payment_status)} */}
              </span>
            </Text>
          </>
        )}
      </div>
    </div>
  )
}

export default OrderDetails
