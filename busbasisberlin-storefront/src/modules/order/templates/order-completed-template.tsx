import { Heading, Button } from '@medusajs/ui';
import { cookies as nextCookies } from 'next/headers';
import { HttpTypes } from '@medusajs/types';
import CartTotals from '@modules/common/components/cart-totals';
import Help from '@modules/order/components/help';
import Items from '@modules/order/components/items';
import OnboardingCta from '@modules/order/components/onboarding-cta';
import OrderDetails from '@modules/order/components/order-details';
import PaymentDetails from '@modules/order/components/payment-details';
import ShippingDetails from '@modules/order/components/shipping-details';
import LocalizedClientLink from '@modules/common/components/localized-client-link';
import { getTranslations } from 'next-intl/server';

type OrderCompletedTemplateProps = {
	order: HttpTypes.StoreOrder;
};

export default async function OrderCompletedTemplate({
	order,
}: OrderCompletedTemplateProps) {
	const cookies = await nextCookies();
	const t = await getTranslations('order.confirmation');

	const isOnboarding = cookies.get('_medusa_onboarding')?.value === 'true';

	return (
		<div className="py-12 min-h-[calc(100vh-64px)] bg-gradient-to-b from-neutral-900 to-black">
			<div className="content-container flex flex-col justify-center items-center gap-y-10 max-w-5xl h-full w-full">
				{isOnboarding && <OnboardingCta orderId={order.id} />}

				{/* Success Icon & Message */}
				<div className="flex flex-col items-center text-center gap-4 mb-8">
					<div className="w-20 h-20 rounded-full bg-green-600/20 flex items-center justify-center mb-4">
						<svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
						</svg>
					</div>
					<Heading
						level="h1"
						className="text-4xl font-bold text-white"
					>
						{t('title')}
					</Heading>
					<p className="text-xl text-neutral-300">
						{t('subtitle')}
					</p>
				</div>

				<div
					className="flex flex-col gap-8 max-w-5xl w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl"
					data-testid="order-complete-container"
				>
					<OrderDetails order={order} />

					<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
						<LocalizedClientLink href="/store" className="w-full">
							<Button
								variant="secondary"
								className="w-full h-12 bg-neutral-800 hover:bg-neutral-700 text-white"
							>
								{t('continueShopping')}
							</Button>
						</LocalizedClientLink>
						<LocalizedClientLink href={`/account/orders/${order.id}`} className="w-full">
							<Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white">
								{t('viewOrder')}
							</Button>
						</LocalizedClientLink>
					</div>

					<Heading level="h2" className="text-2xl font-bold text-white mt-4">
						{t('summary')}
					</Heading>
					<Items order={order} />
					<CartTotals totals={order} />
					<ShippingDetails order={order} />
					<PaymentDetails order={order} />
					<Help />
				</div>
			</div>
		</div>
	);
}
