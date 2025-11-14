// busbasisberlin-storefront/src/modules/order/components/payment-details/index.tsx
// Payment details component with special handling for pickup orders with manual payment

'use client';

import { Container, Heading, Text } from "@medusajs/ui"
import { isManual, isStripe, paymentInfoMap } from "@lib/constants"
import Divider from "@modules/common/components/divider"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { useTranslations } from 'next-intl';

type PaymentDetailsProps = {
  order: HttpTypes.StoreOrder
}

const PaymentDetails = ({ order }: PaymentDetailsProps) => {
  const t = useTranslations('order.payment');
  const payment = order.payment_collections?.[0].payments?.[0]

  // Check if this is a pickup order
  const shippingMethod = order.shipping_methods?.[0];
  const shippingOptionName = shippingMethod?.shipping_option?.name?.toLowerCase() || '';
  const isPickupOrder = shippingOptionName.includes('abholung') || shippingOptionName.includes('pickup');

  // Check if manual payment
  const isManualPayment = payment && isManual(payment.provider_id);

  // Determine if this is pickup with cash payment
  const isPickupWithCash = isPickupOrder && isManualPayment;

  return (
    <div>
      <Heading level="h2" className="text-2xl font-bold text-white my-6">
        {t('title')}
      </Heading>
      <div>
        {payment && (
          <>
            {isPickupWithCash ? (
              // Special display for pickup orders with cash payment
              <div className="p-4 bg-orange-600/20 border border-orange-500/30 rounded-lg">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Text className="font-semibold text-orange-300 text-lg">
                      💵 {t('pickupPayment.title')}
                    </Text>
                  </div>
                  <Text className="text-orange-200">
                    {t('pickupPayment.message')}
                  </Text>
                  <Text className="text-orange-200 text-sm">
                    {t('pickupPayment.amount')}: {convertToLocale({
                      amount: order.total,
                      currency_code: order.currency_code,
                    })}
                  </Text>
                </div>
              </div>
            ) : (
              // Standard payment display
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <Text className="font-semibold text-white mb-2">
                    {t('paymentMethod')}
                  </Text>
                  <Text
                    className="text-neutral-400"
                    data-testid="payment-method"
                  >
                    {paymentInfoMap[payment.provider_id]?.title || payment.provider_id}
                  </Text>
                </div>
                <div className="flex flex-col">
                  <Text className="font-semibold text-white mb-2">
                    {t('paymentDetails')}
                  </Text>
                  <div className="flex gap-2 text-neutral-400 items-center">
                    <Container className="flex items-center h-7 w-fit p-2 bg-neutral-700">
                      {paymentInfoMap[payment.provider_id]?.icon}
                    </Container>
                    <Text data-testid="payment-amount">
                      {isStripe(payment.provider_id) && payment.data?.card_last4
                        ? `**** **** **** ${payment.data.card_last4}`
                        : `${convertToLocale({
                            amount: payment.amount,
                            currency_code: order.currency_code,
                          })} ${t('paidAt')} ${new Date(
                            payment.created_at ?? ""
                          ).toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}`}
                    </Text>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Divider className="mt-8 border-neutral-700" />
    </div>
  )
}

export default PaymentDetails
