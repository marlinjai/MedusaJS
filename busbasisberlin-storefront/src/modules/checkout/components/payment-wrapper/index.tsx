'use client';

import { HttpTypes } from '@medusajs/types';
import { loadStripe } from '@stripe/stripe-js';
import React from 'react';
import StripeWrapper from './stripe-wrapper';

type PaymentWrapperProps = {
	cart: HttpTypes.StoreCart;
	children: React.ReactNode;
};

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

const PaymentWrapper: React.FC<PaymentWrapperProps> = ({ cart, children }) => {
	// Find the Stripe card payment session (pp_stripe_stripe), not other Stripe methods
	const paymentSession = cart.payment_collection?.payment_sessions?.find(
		s => s.status === 'pending' && s.provider_id === 'pp_stripe_stripe',
	);

	if (paymentSession && stripePromise && paymentSession.data?.client_secret) {
		return (
			<StripeWrapper
				paymentSession={paymentSession}
				stripeKey={stripeKey}
				stripePromise={stripePromise}
			>
				{children}
			</StripeWrapper>
		);
	}

	return <div>{children}</div>;
};

export default PaymentWrapper;
