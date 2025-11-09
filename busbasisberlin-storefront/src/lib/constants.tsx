import { CreditCard } from '@medusajs/icons';
import React from 'react';

import Bancontact from '@modules/common/icons/bancontact';

import Giropay from '@modules/common/icons/giropay';
import Ideal from '@modules/common/icons/ideal';
import PayPal from '@modules/common/icons/paypal';
/* Map of payment provider_id to their title and icon. Add in any payment providers you want to use. */
export const paymentInfoMap: Record<
	string,
	{ title: string; icon: React.JSX.Element }
> = {
	pp_stripe_stripe: {
		title: 'Kreditkarte & mehr',
		icon: <CreditCard />,
	},
	'pp_stripe-ideal_stripe': {
		title: 'iDeal',
		icon: <Ideal />,
	},
	'pp_stripe-bancontact_stripe': {
		title: 'Bancontact',
		icon: <Bancontact />,
	},
	'pp_stripe-giropay_stripe': {
		title: 'Giropay',
		icon: <Giropay />,
	},
	pp_paypal_paypal: {
		title: 'PayPal',
		icon: <PayPal />,
	},
	pp_system_default: {
		title: 'Barzahlung bei Abholung',
		icon: <CreditCard />,
	},
	pp_system: {
		title: 'Barzahlung bei Abholung',
		icon: <CreditCard />,
	},

	// Payment method types from Stripe Payment Element
	card: {
		title: 'Kreditkarte',
		icon: <CreditCard />,
	},
	paypal: {
		title: 'PayPal',
		icon: <PayPal />,
	},
	ideal: {
		title: 'iDeal',
		icon: <Ideal />,
	},
	giropay: {
		title: 'Giropay',
		icon: <Giropay />,
	},
	bancontact: {
		title: 'Bancontact',
		icon: <Bancontact />,
	},
	// Add more payment providers here
};

// This checks if it is a Stripe payment provider (handles both underscore and hyphen formats)
// Stripe creates separate provider IDs for each payment method type (e.g., pp_stripe-giropay_stripe)
export const isStripe = (providerId?: string) => {
	return (
		providerId?.startsWith('pp_stripe_') || providerId?.startsWith('pp_stripe-')
	);
};
export const isPaypal = (providerId?: string) => {
	return providerId?.startsWith('pp_paypal');
};
export const isManual = (providerId?: string) => {
	return providerId?.startsWith('pp_system') || providerId === 'pp_system';
};

// Add currencies that don't need to be divided by 100
export const noDivisionCurrencies = [
	'krw',
	'jpy',
	'vnd',
	'clp',
	'pyg',
	'xaf',
	'xof',
	'bif',
	'djf',
	'gnf',
	'kmf',
	'mga',
	'rwf',
	'xpf',
	'htg',
	'vuv',
	'xag',
	'xdr',
	'xau',
];
