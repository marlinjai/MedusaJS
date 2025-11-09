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
		console.log('[CAPTURE-PAYMENT] Cart not found - likely already converted to order by webhook');
		return NextResponse.redirect(`${origin}/${countryCode}`);
	}

	const paymentSession = cart.payment_collection?.payment_sessions?.find(
		payment => payment.data.id === paymentIntent,
	);

	// If payment session is missing or client secret doesn't match, redirect to cart
	if (
		!paymentSession ||
		paymentSession.data.client_secret !== paymentIntentClientSecret
	) {
		return NextResponse.redirect(
			`${origin}/${countryCode}/cart?step=review&error=payment_failed`,
		);
	}

	// If Stripe redirect failed, go back to checkout
	if (!['pending', 'succeeded'].includes(redirectStatus)) {
		return NextResponse.redirect(
			`${origin}/${countryCode}/cart?step=review&error=payment_failed`,
		);
	}

	// Allow payment session in any valid payment state (not just pending/authorized)
	// Stripe may have already moved the session to 'captured' or other states
	if (!['pending', 'authorized', 'captured'].includes(paymentSession.status)) {
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
		// If order placement fails, webhook may have already completed it
		console.log('[CAPTURE-PAYMENT] placeOrder failed:', error.message);
		
		// If cart is already completed, redirect to orders page
		// Webhook is authoritative - this is expected behavior
		if (error.message?.includes('cart') || error.message?.includes('completed')) {
			console.log('[CAPTURE-PAYMENT] Cart already completed by webhook, redirecting to orders');
			return NextResponse.redirect(`${origin}/${countryCode}/account/orders`);
		}
		
		// For other errors, go back to checkout
		return NextResponse.redirect(
			`${origin}/${countryCode}/cart?step=review&error=payment_failed`,
		);
	}
}
