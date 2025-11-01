"use client"

import { Button } from "@medusajs/ui"

import OrderCard from "../order-card"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { useTranslations } from 'next-intl'

const OrderOverview = ({ orders }: { orders: HttpTypes.StoreOrder[] }) => {
  const t = useTranslations('account.orders')
  if (orders?.length) {
    return (
      <div className="flex flex-col gap-y-8 w-full">
        {orders.map((o) => (
          <div
            key={o.id}
            className="border-b border-gray-200 pb-6 last:pb-0 last:border-none"
          >
            <OrderCard order={o} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className="w-full flex flex-col items-center gap-y-4"
      data-testid="no-orders-container"
    >
      <h2 className="text-large-semi">{t('empty.title')}</h2>
      <p className="text-base-regular">
        {t('empty.description')}
      </p>
      <div className="mt-4">
        <LocalizedClientLink href="/store" passHref>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 h-12 rounded-lg transition-colors"
            data-testid="continue-shopping-button"
          >
            {t('empty.button')}
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default OrderOverview
