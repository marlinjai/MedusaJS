import { placeOrder, retrieveCart } from '@lib/data/cart';
import { NextRequest, NextResponse } from 'next/server';

type Params = Promise<{ cartId: string }>;

export async function GET(req: NextRequest, { params }: { params: Params }) {
	const { cartId } = await params;
	const { origin, searchParams } = req.nextUrl;

	const paymentIntent = searchParams.get('payment_intent');
	const paymentIntentClientSecret = searchParams.get(
		'payment_intent_client_secret',
	);
	const redirectStatus = searchParams.get('redirect_status') || '';
	const countryCode = searchParams.get('country_code') || 'de'; // Default to 'de' if undefined

	const cart = await retrieveCart(cartId);

	// If cart doesn't exist, webhook may have already completed the order
	// This is expected behavior for successful payments processed by webhook
	if (!cart) {
		console.log(
			'[CAPTURE-PAYMENT] Cart not found - likely already converted to order by webhook',
		);
		return NextResponse.redirect(`${origin}/${countryCode}/account/orders`);
	}

	// Find payment session - handle different payment methods differently
	let paymentSession;

	// For card payments and some methods, we have payment_intent
	if (paymentIntent) {
		paymentSession = cart.payment_collection?.payment_sessions?.find(
			payment => payment.data.id === paymentIntent,
		);

		// For card payments, validate client secret
		if (
			paymentSession &&
			paymentIntentClientSecret &&
			paymentSession.data.client_secret !== paymentIntentClientSecret
		) {
			console.log('[CAPTURE-PAYMENT] Client secret mismatch');
			return NextResponse.redirect(
				`${origin}/${countryCode}/cart?step=review&error=payment_failed`,
			);
		}
	} else {
		// For PayPal and other methods that don't provide payment_intent in URL,
		// find the active payment session
		paymentSession = cart.payment_collection?.payment_sessions?.find(
			payment => payment.status !== 'canceled' && payment.status !== 'error',
		);
	}

	// If no valid payment session found, redirect to checkout
	if (!paymentSession) {
		console.log('[CAPTURE-PAYMENT] No valid payment session found');
		return NextResponse.redirect(
			`${origin}/${countryCode}/cart?step=review&error=payment_failed`,
		);
	}

	// Check Stripe redirect status if provided
	// PayPal and other methods may not provide this
	if (redirectStatus && !['pending', 'succeeded'].includes(redirectStatus)) {
		console.log('[CAPTURE-PAYMENT] Invalid redirect status:', redirectStatus);
		return NextResponse.redirect(
			`${origin}/${countryCode}/cart?step=review&error=payment_failed`,
		);
	}

	// Allow payment session in any valid payment state
	// Different payment methods use different status flows
	const validStatuses = ['pending', 'authorized', 'captured'];
	if (!validStatuses.includes(paymentSession.status)) {
		console.log(
			'[CAPTURE-PAYMENT] Invalid payment session status:',
			paymentSession.status,
		);
		return NextResponse.redirect(
			`${origin}/${countryCode}/cart?step=review&error=payment_failed`,
		);
	}

	// Try to place the order
	// Note: Webhook may have already completed it - handle that gracefully
	try {
		const order = await placeOrder(cartId);

		return NextResponse.redirect(
			`${origin}/${countryCode}/order/${order.id}/confirmed`,
		);
	} catch (error: any) {
		// NEXT_REDIRECT is thrown by redirect() in Server Actions - this is EXPECTED
		// The redirect happens inside placeOrder() after successful order placement
		if (error.message === 'NEXT_REDIRECT' || error.digest === 'NEXT_REDIRECT') {
			console.log(
				'[CAPTURE-PAYMENT] Order placed successfully, redirect in progress',
			);
			// The redirect is already happening, just re-throw it
			throw error;
		}

		// If order placement fails, webhook may have already completed it
		console.log('[CAPTURE-PAYMENT] placeOrder failed:', error.message);

		// If cart is already completed, redirect to orders page
		// Webhook is authoritative - this is expected behavior
		if (
			error.message?.includes('cart') ||
			error.message?.includes('completed')
		) {
			console.log(
				'[CAPTURE-PAYMENT] Cart already completed by webhook, redirecting to orders',
			);
			return NextResponse.redirect(`${origin}/${countryCode}/account/orders`);
		}

		// For other errors, go back to checkout
		console.error('[CAPTURE-PAYMENT] Unexpected error:', error);
		return NextResponse.redirect(
			`${origin}/${countryCode}/cart?step=review&error=payment_failed`,
		);
	}
}
