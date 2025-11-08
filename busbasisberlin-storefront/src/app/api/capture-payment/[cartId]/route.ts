// capture-payment/[cartId]/route.ts
// Handles redirect callbacks from Stripe payment methods (PayPal, iDEAL, etc.)
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
	const countryCode = searchParams.get('country_code') || 'de';

	const cart = await retrieveCart(cartId);

	if (!cart) {
		console.error('[capture-payment] Cart not found:', cartId);
		return NextResponse.redirect(`${origin}/${countryCode}`);
	}

	const paymentSession = cart.payment_collection?.payment_sessions?.find(
		payment => payment.data.id === paymentIntent,
	);

	// Log for debugging
	console.log('[capture-payment] Payment validation:', {
		cartId,
		paymentIntent,
		redirectStatus,
		paymentSessionFound: !!paymentSession,
		paymentSessionStatus: paymentSession?.status,
		clientSecretMatch:
			paymentSession?.data.client_secret === paymentIntentClientSecret,
	});

	// Validate payment session exists and client secret matches
	if (!paymentSession) {
		console.error('[capture-payment] Payment session not found for:', paymentIntent);
		return NextResponse.redirect(
			`${origin}/${countryCode}/cart?step=review&error=payment_session_not_found`,
		);
	}

	if (paymentSession.data.client_secret !== paymentIntentClientSecret) {
		console.error('[capture-payment] Client secret mismatch');
		return NextResponse.redirect(
			`${origin}/${countryCode}/cart?step=review&error=payment_validation_failed`,
		);
	}

	// Accept successful redirect statuses (succeeded, pending, or empty for some payment methods)
	// For requires_capture, redirect_status might be 'succeeded' even though capture is pending
	const validRedirectStatuses = ['succeeded', 'pending', ''];
	if (!validRedirectStatuses.includes(redirectStatus)) {
		console.error('[capture-payment] Invalid redirect status:', redirectStatus);
		return NextResponse.redirect(
			`${origin}/${countryCode}/cart?step=review&error=payment_failed&status=${redirectStatus}`,
		);
	}

	// Accept payment session statuses that indicate successful authorization
	// 'authorized' means payment is authorized and ready for capture
	// 'pending' means payment is still processing but authorized
	const validPaymentSessionStatuses = ['pending', 'authorized'];
	if (!validPaymentSessionStatuses.includes(paymentSession.status)) {
		console.error('[capture-payment] Invalid payment session status:', paymentSession.status);
		return NextResponse.redirect(
			`${origin}/${countryCode}/cart?step=review&error=payment_not_authorized&session_status=${paymentSession.status}`,
		);
	}

	// All validations passed - place the order
	// For redirect-based payments, the webhook might arrive slightly after the redirect
	// Wait a moment for the webhook to process, then retry if needed
	try {
		let order;
		let retries = 3;
		let delay = 1000; // Start with 1 second delay to allow webhook to process

		for (let attempt = 0; attempt < retries; attempt++) {
			// Wait before each attempt to allow webhook to process (including first attempt)
			if (attempt > 0) {
				console.log(`[capture-payment] Attempt ${attempt + 1}/${retries}: Waiting ${delay}ms for webhook to process...`);
				await new Promise(resolve => setTimeout(resolve, delay));
				delay *= 1.5; // Increase delay for next retry
			} else {
				// First attempt: wait a short time for webhook
				console.log('[capture-payment] First attempt: Waiting 500ms for webhook to process...');
				await new Promise(resolve => setTimeout(resolve, 500));
			}

			// Refresh cart to get latest payment session status
			const refreshedCart = await retrieveCart(cartId);
			if (refreshedCart) {
				const refreshedSession = refreshedCart.payment_collection?.payment_sessions?.find(
					payment => payment.data.id === paymentIntent,
				);
				console.log('[capture-payment] Payment session status:', refreshedSession?.status, 'Payment collection status:', refreshedCart.payment_collection?.status);
			}

			try {
				order = await placeOrder(cartId);

				if (order?.id) {
					console.log('[capture-payment] Order placed successfully:', order.id);
					return NextResponse.redirect(
						`${origin}/${countryCode}/order/${order.id}/confirmed`,
					);
				}
			} catch (error: any) {
				// If it's the last attempt, throw the error
				if (attempt === retries - 1) {
					throw error;
				}
				// Otherwise, log and continue to next retry
				console.log(`[capture-payment] Order placement failed (attempt ${attempt + 1}/${retries}):`, error.message);
			}
		}

		// If we get here, all retries failed
		console.error('[capture-payment] Order placement failed after all retries');
		return NextResponse.redirect(
			`${origin}/${countryCode}/cart?step=review&error=order_placement_failed`,
		);
	} catch (error: any) {
		console.error('[capture-payment] Error placing order:', error);
		return NextResponse.redirect(
			`${origin}/${countryCode}/cart?step=review&error=order_placement_error&message=${encodeURIComponent(error.message || 'Unknown error')}`,
		);
	}
}
