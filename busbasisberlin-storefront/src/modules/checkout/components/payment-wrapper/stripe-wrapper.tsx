'use client';

import { HttpTypes } from '@medusajs/types';
import { Elements } from '@stripe/react-stripe-js';
import { Stripe, StripeElementsOptions } from '@stripe/stripe-js';
import { createContext } from 'react';

type StripeWrapperProps = {
	paymentSession: HttpTypes.StorePaymentSession;
	stripeKey?: string;
	stripePromise: Promise<Stripe | null> | null;
	children: React.ReactNode;
};

export const StripeContext = createContext(false);

const StripeWrapper: React.FC<StripeWrapperProps> = ({
	paymentSession,
	stripeKey,
	stripePromise,
	children,
}) => {
	const clientSecret = paymentSession?.data?.client_secret as
		| string
		| undefined;

	const options: StripeElementsOptions = {
		clientSecret: clientSecret,
		locale: 'de', // Set locale to German to show German payment methods
		appearance: {
			theme: 'stripe',
		},
	};

	if (!stripeKey) {
		throw new Error(
			'Stripe key is missing. Set NEXT_PUBLIC_STRIPE_KEY environment variable.',
		);
	}

	if (!stripePromise) {
		throw new Error(
			'Stripe promise is missing. Make sure you have provided a valid Stripe key.',
		);
	}

	if (!clientSecret) {
		throw new Error(
			'Stripe client secret is missing. Cannot initialize Stripe.',
		);
	}

	return (
		<StripeContext.Provider value={true}>
			{/*
				OPTIMIZATION: Single Elements instance for all Stripe elements.
				ExpressCheckoutElement and PaymentElement should both be children of this
				same Elements instance for optimal performance.
				See: https://stripe.com/docs/payments/payment-element/express-checkout-element
			*/}
			<Elements key={clientSecret} options={options} stripe={stripePromise}>
				{children}
			</Elements>
		</StripeContext.Provider>
	);
};

export default StripeWrapper;
