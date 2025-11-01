// unified-checkout/index.tsx

'use client';

import { Radio, RadioGroup } from '@headlessui/react';
import { isStripe as isStripeFunc, paymentInfoMap } from '@lib/constants';
import { initiatePaymentSession, setShippingMethod } from '@lib/data/cart';
import compareAddresses from '@lib/util/compare-addresses';
import { convertToLocale } from '@lib/util/money';
import { HttpTypes } from '@medusajs/types';
import { Button, clx, Heading, useToggleState } from '@medusajs/ui';
import BillingAddress from '@modules/checkout/components/billing_address';
import PaymentContainer, {
	StripeCardContainer,
} from '@modules/checkout/components/payment-container';
import ShippingAddress from '@modules/checkout/components/shipping-address';
import MedusaRadio from '@modules/common/components/radio';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

type UnifiedCheckoutProps = {
	cart: HttpTypes.StoreCart;
	customer: HttpTypes.StoreCustomer | null;
	shippingMethods: HttpTypes.StoreCartShippingOption[];
	paymentMethods: any[];
};

export default function UnifiedCheckout({
	cart,
	customer,
	shippingMethods,
	paymentMethods,
}: UnifiedCheckoutProps) {
	const t = useTranslations('checkout');
	const router = useRouter();
	const containerRef = useRef<HTMLDivElement>(null);
	const timelineRef = useRef<HTMLDivElement>(null);
	const [timelineHeight, setTimelineHeight] = useState(0);

	const [shippingMethodId, setShippingMethodId] = useState(
		cart.shipping_methods?.at(-1)?.shipping_option_id || null,
	);
	const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
	const [cardComplete, setCardComplete] = useState(false);
	const [cardBrand, setCardBrand] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const { state: sameAsBilling, toggle: toggleSameAsBilling } = useToggleState(
		cart?.shipping_address && cart?.billing_address
			? compareAddresses(cart?.shipping_address, cart?.billing_address)
			: true,
	);

	const addressCompleted = !!(
		cart?.shipping_address &&
		cart?.billing_address &&
		cart?.email
	);

	// Calculate timeline height and progress
	useEffect(() => {
		if (timelineRef.current) {
			const rect = timelineRef.current.getBoundingClientRect();
			setTimelineHeight(rect.height);
		}
	}, [timelineRef]);

	const { scrollYProgress } = useScroll({
		target: containerRef,
		offset: ['start 10%', 'end 50%'],
	});

	const heightTransform = useTransform(scrollYProgress, [0, 1], [0, timelineHeight]);
	const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

	const handleShippingSelect = async (id: string) => {
		setError(null);
		setShippingMethodId(id);

		try {
			await setShippingMethod({ cartId: cart.id, shippingMethodId: id });
		} catch (err: any) {
			setError(err.message);
			setShippingMethodId(null);
		}
	};

	const handlePaymentSelect = async (method: string) => {
		setError(null);
		setSelectedPaymentMethod(method);

		if (isStripeFunc(method)) {
			try {
				await initiatePaymentSession(cart, { provider_id: method });
			} catch (err: any) {
				setError(err.message);
			}
		}
	};

	const canPlaceOrder =
		addressCompleted &&
		shippingMethodId &&
		selectedPaymentMethod &&
		(!isStripeFunc(selectedPaymentMethod) || cardComplete);

	// Calculate progress for timeline - start showing progress immediately
	// Even partial completion of a step shows progress
	let progressSteps = 0;

	// Step 1: Address (25% progress)
	if (cart?.shipping_address?.first_name || cart?.email) progressSteps += 0.5; // Started filling
	if (addressCompleted) progressSteps += 0.5; // Completed

	// Step 2: Shipping (25% progress)
	if (addressCompleted) progressSteps += 0.25; // Can see shipping options
	if (shippingMethodId) progressSteps += 0.75; // Selected shipping

	// Step 3: Payment (25% progress)
	if (shippingMethodId) progressSteps += 0.25; // Can see payment options
	if (selectedPaymentMethod) progressSteps += 0.75; // Selected payment

	// Step 4: Review (25% progress)
	if (canPlaceOrder) progressSteps += 1;

	const progress = (progressSteps / 4) * 100;

	return (
		<div className="w-full relative" ref={containerRef}>
			{/* Animated vertical timeline line - on the left */}
			<div ref={timelineRef} className="absolute left-4 top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-neutral-700 to-transparent">
				<motion.div
					style={{
						height: `${progress}%`,
					}}
					className="absolute inset-x-0 top-0 w-[2px] bg-gradient-to-b from-blue-500 via-blue-400 to-transparent rounded-full"
					transition={{ duration: 0.6, ease: "easeInOut" }}
				/>
			</div>

			<div className="pl-12 space-y-6">
			{/* Step 1: Address */}
			<div className="bg-card border border-neutral-700 rounded-lg p-6">
				<Heading
					level="h2"
					className="text-2xl font-bold mb-6 flex items-center gap-3"
				>
					<span
						className={clx(
							'flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold',
							{
								'bg-green-600 text-white': addressCompleted,
								'bg-blue-600 text-white': !addressCompleted,
							},
						)}
					>
						{addressCompleted ? '✓' : '1'}
					</span>
					{t('addresses.title')}
				</Heading>

				<ShippingAddress
					customer={customer}
					cart={cart}
					checked={sameAsBilling}
					onChange={toggleSameAsBilling}
				/>

				{!sameAsBilling && (
					<div className="mt-8">
						<Heading level="h2" className="text-xl font-bold mb-4">
							{t('addresses.billingAddress')}
						</Heading>
						<BillingAddress cart={cart} />
					</div>
				)}
			</div>

			{/* Step 2: Shipping - Always visible */}
			<div
				className={clx('bg-card border border-neutral-700 rounded-lg p-6', {
					'opacity-60': !addressCompleted,
				})}
			>
					<Heading
						level="h2"
						className="text-2xl font-bold mb-6 flex items-center gap-3"
					>
						<span
							className={clx(
								'flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold',
								{
									'bg-green-600 text-white': shippingMethodId,
									'bg-blue-600 text-white': !shippingMethodId,
								},
							)}
						>
							{shippingMethodId ? '✓' : '2'}
						</span>
						{t('shipping.title')}
					</Heading>

					<RadioGroup
						value={shippingMethodId}
						onChange={handleShippingSelect}
						disabled={!addressCompleted}
					>
						{shippingMethods?.map(option => (
							<Radio
								key={option.id}
								value={option.id}
								disabled={!addressCompleted}
								className={clx(
									'flex items-center justify-between cursor-pointer py-4 border rounded-lg px-8 mb-2',
									{
										'border-ui-border-interactive':
											option.id === shippingMethodId,
										'cursor-not-allowed opacity-50': !addressCompleted,
									},
								)}
							>
								<div className="flex items-center gap-x-4">
									<MedusaRadio checked={option.id === shippingMethodId} />
									<span>{option.name}</span>
								</div>
								<span>
									{convertToLocale({
										amount: option.amount!,
										currency_code: cart?.currency_code,
									})}
								</span>
							</Radio>
						))}
					</RadioGroup>
			</div>

			{/* Step 3: Payment - Always visible */}
			<div
				className={clx('bg-card border border-neutral-700 rounded-lg p-6', {
					'opacity-60': !addressCompleted || !shippingMethodId,
				})}
			>
					<Heading
						level="h2"
						className="text-2xl font-bold mb-6 flex items-center gap-3"
					>
						<span
							className={clx(
								'flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold',
								{
									'bg-green-600 text-white': selectedPaymentMethod,
									'bg-blue-600 text-white': !selectedPaymentMethod,
								},
							)}
						>
							{selectedPaymentMethod ? '✓' : '3'}
						</span>
						{t('payment.title')}
					</Heading>

					<RadioGroup
						value={selectedPaymentMethod}
						onChange={handlePaymentSelect}
						disabled={!addressCompleted || !shippingMethodId}
					>
						{paymentMethods.map(method => (
							<div key={method.id}>
								{isStripeFunc(method.id) ? (
									<StripeCardContainer
										paymentProviderId={method.id}
										selectedPaymentOptionId={selectedPaymentMethod}
										paymentInfoMap={paymentInfoMap}
										setCardBrand={setCardBrand}
										setError={setError}
										setCardComplete={setCardComplete}
									/>
								) : (
									<PaymentContainer
										paymentInfoMap={paymentInfoMap}
										paymentProviderId={method.id}
										selectedPaymentOptionId={selectedPaymentMethod}
									/>
								)}
							</div>
						))}
					</RadioGroup>
			</div>

			{/* Step 4: Review & Place Order - Always visible */}
			<div className={clx("bg-card border rounded-lg p-6", {
				"border-blue-500": canPlaceOrder,
				"border-neutral-700": !canPlaceOrder,
				"opacity-60": !canPlaceOrder,
			})}>
					<Heading
						level="h2"
						className="text-2xl font-bold mb-6 flex items-center gap-3"
					>
						<span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">
							4
						</span>
						{t('review.title')}
					</Heading>

				<div className="mb-6">
					<p className="text-sm text-neutral-400">
						Durch Klicken auf "Bestellung aufgeben" bestätigen Sie, dass Sie unsere Allgemeinen Geschäftsbedingungen und Datenschutzrichtlinie gelesen und akzeptiert haben.
					</p>
				</div>

					<Button
						size="large"
						className="w-full"
						disabled={isSubmitting}
						isLoading={isSubmitting}
						onClick={async () => {
							setIsSubmitting(true);
							router.push(`/checkout?step=review`);
						}}
					>
						Bestellung aufgeben
					</Button>

					{error && <p className="text-red-500 mt-4">{error}</p>}
			</div>
			</div>
		</div>
	);
}
