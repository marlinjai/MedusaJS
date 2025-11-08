import { Radio as RadioGroupOption } from '@headlessui/react';
import { Text, clx } from '@medusajs/ui';
import React, { useContext, type JSX } from 'react';

import Radio from '@modules/common/components/radio';

import { isManual } from '@lib/constants';
import SkeletonCardDetails from '@modules/skeletons/components/skeleton-card-details';
import {
	ExpressCheckoutElement,
	PaymentElement,
	useElements,
	useStripe,
} from '@stripe/react-stripe-js';
import {
	StripeExpressCheckoutElementConfirmEvent,
	StripePaymentElementChangeEvent,
} from '@stripe/stripe-js';
import PaymentTest from '../payment-test';
import { StripeContext } from '../payment-wrapper/stripe-wrapper';

type PaymentContainerProps = {
	paymentProviderId: string;
	selectedPaymentOptionId: string | null;
	disabled?: boolean;
	paymentInfoMap: Record<string, { title: string; icon: JSX.Element }>;
	children?: React.ReactNode;
};

const PaymentContainer: React.FC<PaymentContainerProps> = ({
	paymentProviderId,
	selectedPaymentOptionId,
	paymentInfoMap,
	disabled = false,
	children,
}) => {
	const isDevelopment = process.env.NODE_ENV === 'development';

	return (
		<RadioGroupOption
			key={paymentProviderId}
			value={paymentProviderId}
			disabled={disabled}
			className={clx(
				'flex flex-col gap-y-2 text-small-regular cursor-pointer py-4 border rounded-rounded px-8 mb-2 hover:shadow-borders-interactive-with-active',
				{
					'border-ui-border-interactive':
						selectedPaymentOptionId === paymentProviderId,
				},
			)}
		>
			<div className="flex items-center justify-between ">
				<div className="flex items-center gap-x-4">
					<Radio checked={selectedPaymentOptionId === paymentProviderId} />
					<Text className="text-base-regular">
						{paymentInfoMap[paymentProviderId]?.title || paymentProviderId}
					</Text>
					{isManual(paymentProviderId) && isDevelopment && (
						<PaymentTest className="hidden small:block" />
					)}
				</div>
				<span className="justify-self-end text-ui-fg-base">
					{paymentInfoMap[paymentProviderId]?.icon}
				</span>
			</div>
			{isManual(paymentProviderId) && isDevelopment && (
				<PaymentTest className="small:hidden text-[10px]" />
			)}
			{children}
		</RadioGroupOption>
	);
};

export default PaymentContainer;

export const StripeCardContainer = ({
	paymentProviderId,
	selectedPaymentOptionId,
	paymentInfoMap,
	disabled = false,
	setCardBrand,
	setError,
	setCardComplete,
	cartId,
	countryCode = 'de',
}: Omit<PaymentContainerProps, 'children'> & {
	setCardBrand: (brand: string) => void;
	setError: (error: string | null) => void;
	setCardComplete: (complete: boolean) => void;
	cartId?: string;
	countryCode?: string;
}) => {
	const stripeReady = useContext(StripeContext);
	const stripe = stripeReady ? useStripe() : null;
	const elements = stripeReady ? useElements() : null;

	// Handle ExpressCheckoutElement confirmation (Apple Pay, Google Pay)
	// ExpressCheckoutElement handles the payment flow automatically
	// We just need to track completion and handle any errors
	const handleExpressCheckoutConfirm = async (
		event: StripeExpressCheckoutElementConfirmEvent,
	) => {
		if (!stripe || !elements) {
			setError('Payment processing not ready. Please try again.');
			return;
		}

		try {
			// ExpressCheckoutElement handles payment confirmation automatically
			// We just need to confirm the payment with Stripe
			// The event contains the payment method details
			const { error: confirmError } = await stripe.confirmPayment({
				elements,
				confirmParams: {
					return_url: cartId
						? `${window.location.origin}/api/capture-payment/${cartId}?country_code=${countryCode}`
						: undefined,
				},
				redirect: 'if_required',
			});

			if (confirmError) {
				setError(confirmError.message || 'Payment failed');
				setCardComplete(false);
			} else {
				// Payment succeeded - ExpressCheckoutElement handles the rest
				setCardComplete(true);
				setCardBrand('Express Checkout'); // Generic label for Apple Pay/Google Pay
				setError(null);
			}
		} catch (err: any) {
			setError(err.message || 'An error occurred with express checkout');
			setCardComplete(false);
		}
	};

	// Handle PaymentElement change events
	// PaymentElement supports multiple payment methods (cards, Klarna, PayPal, etc.)
	const handlePaymentElementChange = (
		event: StripePaymentElementChangeEvent,
	) => {
		// Track the selected payment method type (card, klarna, paypal, etc.)
		if (event.value.type) {
			const paymentType = event.value.type;
			// Set brand based on payment method type
			// For card payments, use "Card" as default brand
			// For other methods, capitalize the type name
			if (paymentType === 'card') {
				setCardBrand('Card');
			} else {
				// For non-card methods (klarna, paypal, ideal, sofort, etc.), use the type as brand identifier
				setCardBrand(
					paymentType.charAt(0).toUpperCase() + paymentType.slice(1),
				);
			}
		}

		// Track completion status
		setCardComplete(event.complete);

		// Clear errors on successful completion
		// Note: PaymentElement change event doesn't include error property
		// Errors are handled separately via elements.submit() or stripe.confirmPayment()
		if (event.complete) {
			setError(null);
		}
	};

	// Show PaymentElement directly without RadioGroup wrapper when always selected
	const isSelected = selectedPaymentOptionId === paymentProviderId;

	return (
		<div className="my-4 transition-all duration-150 ease-in-out">
			{isSelected && stripeReady ? (
				<>
					{/*
						OPTIMIZATION: Both ExpressCheckoutElement and PaymentElement are within
						the same Elements instance (created by StripeWrapper).
						This improves performance by allowing Stripe to manage all elements together.
						See: https://stripe.com/docs/payments/payment-element/express-checkout-element
					*/}

					{/* Express Checkout Element for Apple Pay, Google Pay, etc. */}
					<div className="mb-4">
						<ExpressCheckoutElement
							onConfirm={handleExpressCheckoutConfirm}
							options={{
								buttonHeight: 48,
								buttonType: {
									applePay: 'book',
									googlePay: 'book',
								},
							}}
						/>
					</div>
					{/* Payment Element for cards, iDEAL, Sofort, Klarna, PayPal, etc. */}
					<PaymentElement
						onChange={handlePaymentElementChange}
						options={{
							layout: 'accordion',
							business: {
								name: 'BASISCAMP BERLIN REPAIR & RESTORATION',
							},
							// PaymentElement automatically shows enabled methods based on:
							// - Currency (EUR for iDEAL, Sofort)
							// - Customer location
							// - What's enabled in Stripe Dashboard
						}}
					/>
				</>
			) : (
				<SkeletonCardDetails />
			)}
		</div>
	);
};
