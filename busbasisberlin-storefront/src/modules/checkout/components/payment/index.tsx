'use client';

import {
	isManual,
	isStripe as isStripeFunc,
	paymentInfoMap,
} from '@lib/constants';
import { initiatePaymentSession } from '@lib/data/cart';
import { CheckCircleSolid, CreditCard } from '@medusajs/icons';
import { HttpTypes } from '@medusajs/types';
import { Button, Container, Heading, Text, clx } from '@medusajs/ui';
import ErrorMessage from '@modules/checkout/components/error-message';
import Divider from '@modules/common/components/divider';
import {
	PaymentElement,
	useElements,
	useStripe,
} from '@stripe/react-stripe-js';
import { StripePaymentElementChangeEvent } from '@stripe/stripe-js';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useContext, useEffect, useState } from 'react';
import { StripeContext } from '../payment-wrapper/stripe-wrapper';

const Payment = ({
	cart,
	availablePaymentMethods,
	availableShippingMethods,
}: {
	cart: any;
	availablePaymentMethods: any[];
	availableShippingMethods?: HttpTypes.StoreCartShippingOption[] | null;
}) => {
	const t = useTranslations('checkout.payment');
	const activeSession = cart.payment_collection?.payment_sessions?.find(
		(paymentSession: any) => paymentSession.status === 'pending',
	);
	const stripeReady = useContext(StripeContext);

	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [stripeComplete, setStripeComplete] = useState(false);
	const [selectedPaymentMethod, setSelectedPaymentMethod] =
		useState<string>('');

	const stripe = stripeReady ? useStripe() : null;
	const elements = stripeReady ? useElements() : null;

	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();

	const isOpen = searchParams?.get('step') === 'payment';

	const handlePaymentElementChange = async (
		event: StripePaymentElementChangeEvent,
	) => {
		// Catches the selected payment method and sets it to state
		if (event.value.type) {
			setSelectedPaymentMethod(event.value.type);
		}

		// Sets stripeComplete on form completion
		setStripeComplete(event.complete);

		// Clears any errors on successful completion
		if (event.complete) {
			setError(null);
		}
	};

	const setPaymentMethod = async (method: string) => {
		setError(null);
		setSelectedPaymentMethod(method);
		if (isStripeFunc(method)) {
			await initiatePaymentSession(cart, {
				provider_id: method,
			});
		} else if (isManual(method)) {
			// Initialize manual payment session for pickup orders
			await initiatePaymentSession(cart, {
				provider_id: method,
			});
		}
	};

	const paidByGiftcard =
		cart?.gift_cards && cart?.gift_cards?.length > 0 && cart?.total === 0;

	// Check if selected shipping method is pickup
	const selectedShippingMethodId =
		cart?.shipping_methods?.at(-1)?.shipping_option_id;
	const isPickupShipping =
		selectedShippingMethodId &&
		availableShippingMethods?.some(
			sm =>
				sm.id === selectedShippingMethodId &&
				(sm as any).service_zone?.fulfillment_set?.type === 'pickup',
		);

	// Filter payment methods: show manual payment (pp_system) only for pickup
	const filteredPaymentMethods = isPickupShipping
		? availablePaymentMethods?.filter(pm => isManual(pm.id)) || []
		: availablePaymentMethods?.filter(pm => !isManual(pm.id)) || [];

	const paymentReady =
		(activeSession && cart?.shipping_methods.length !== 0) || paidByGiftcard;

	const createQueryString = useCallback(
		(name: string, value: string) => {
			const params = new URLSearchParams(searchParams?.toString() || '');
			params.set(name, value);

			return params.toString();
		},
		[searchParams],
	);

	const handleEdit = () => {
		router.push(pathname + '?' + createQueryString('step', 'payment'), {
			scroll: false,
		});
	};

	const handleSubmit = async () => {
		setIsLoading(true);
		setError(null);

		try {
			// For pickup orders with manual payment, skip Stripe validation
			if (isPickupShipping && isManual(activeSession?.provider_id)) {
				// Manual payment for pickup - just navigate to review
				router.push(pathname + '?' + createQueryString('step', 'review'), {
					scroll: false,
				});
				return;
			}

			// For regular shipping with Stripe, validate payment
			// Check if the necessary context is ready
			if (!stripe || !elements) {
				setError(t('notReady'));
				return;
			}

			// Submit the payment method details
			await elements.submit().catch(err => {
				console.error(err);
				setError(err.message || 'An error occurred with the payment');
				return;
			});

			// Navigate to the final checkout step
			router.push(pathname + '?' + createQueryString('step', 'review'), {
				scroll: false,
			});
		} catch (err: any) {
			setError(err.message);
		} finally {
			setIsLoading(false);
		}
	};

	const initPaymentSession = async () => {
		try {
			// Initialize manual payment for pickup, Stripe for regular shipping
			const providerId = isPickupShipping ? 'pp_system' : 'pp_stripe_stripe';

			// Check if we already have a payment session for this provider
			// If so, don't create a new one to avoid deleting succeeded PaymentIntents
			const existingSession = cart.payment_collection?.payment_sessions?.find(
				(session: any) => session.provider_id === providerId,
			);

			if (existingSession) {
				// Session already exists for this provider, skip initialization
				console.log(
					'[PAYMENT] Reusing existing payment session:',
					existingSession.id,
				);
				return;
			}

			await initiatePaymentSession(cart, {
				provider_id: providerId,
			});
		} catch (err) {
			console.error('Failed to initialize payment session:', err);
			setError(t('initFailed'));
		}
	};

	useEffect(() => {
		if (!activeSession && isOpen) {
			initPaymentSession();
		}
	}, [cart, isOpen, activeSession, isPickupShipping]);

	useEffect(() => {
		setError(null);
	}, [isOpen]);

	return (
		<div className="">
			<div className="flex flex-row items-center justify-between mb-6">
				<Heading
					level="h2"
					className={clx(
						'flex flex-row text-3xl-regular gap-x-2 items-baseline',
						{
							'opacity-50 pointer-events-none select-none':
								!isOpen && !paymentReady,
						},
					)}
				>
					{t('title')}
					{!isOpen && paymentReady && <CheckCircleSolid />}
				</Heading>
				{!isOpen && paymentReady && (
					<Text>
						<button
							onClick={handleEdit}
							className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
							data-testid="edit-payment-button"
						>
							{t('edit')}
						</button>
					</Text>
				)}
			</div>
			<div>
				<div className={isOpen ? 'block' : 'hidden'}>
					{!paidByGiftcard &&
						!isPickupShipping &&
						filteredPaymentMethods?.length &&
						stripeReady && (
							<div className="mt-5 transition-all duration-150 ease-in-out">
								<PaymentElement
									onChange={handlePaymentElementChange}
									options={{
										layout: 'accordion',
									}}
								/>
							</div>
						)}

					{!paidByGiftcard && isPickupShipping && (
						<div className="mt-5">
							<Text className="txt-medium text-ui-fg-subtle">
								{t('pickupPaymentNote') ||
									'Bei Abholung am Lager erfolgt die Zahlung direkt vor Ort.'}
							</Text>
						</div>
					)}

					{paidByGiftcard && (
						<div className="flex flex-col w-1/3">
							<Text className="txt-medium-plus text-ui-fg-base mb-1">
								{t('paymentMethod')}
							</Text>
							<Text
								className="txt-medium text-ui-fg-subtle"
								data-testid="payment-method-summary"
							>
								{t('giftCard')}
							</Text>
						</div>
					)}

					<ErrorMessage
						error={error}
						data-testid="payment-method-error-message"
					/>

					<Button
						size="large"
						className="mt-6"
						onClick={handleSubmit}
						isLoading={isLoading}
						disabled={
							// For pickup: only need active session (manual payment)
							// For regular shipping: need Stripe completion
							isPickupShipping
								? !activeSession && !paidByGiftcard
								: !stripeComplete ||
								  !stripe ||
								  !elements ||
								  (!selectedPaymentMethod && !paidByGiftcard)
						}
						data-testid="submit-payment-button"
					>
						{t('continueToReview')}
					</Button>
				</div>

				<div className={isOpen ? 'hidden' : 'block'}>
					{cart && paymentReady && activeSession && selectedPaymentMethod ? (
						<div className="flex items-start gap-x-1 w-full">
							<div className="flex flex-col w-1/3">
								<Text className="txt-medium-plus text-ui-fg-base mb-1">
									{t('paymentMethod')}
								</Text>
								<Text
									className="txt-medium text-ui-fg-subtle"
									data-testid="payment-method-summary"
								>
									{paymentInfoMap[activeSession?.provider_id]?.title ||
										activeSession?.provider_id}
								</Text>
							</div>
							<div className="flex flex-col w-1/3">
								<Text className="txt-medium-plus text-ui-fg-base mb-1">
									{t('paymentDetails')}
								</Text>
								<div
									className="flex gap-2 txt-medium text-ui-fg-subtle items-center"
									data-testid="payment-details-summary"
								>
									<Container className="flex items-center h-7 w-fit p-2 bg-ui-button-neutral-hover">
										{paymentInfoMap[selectedPaymentMethod]?.icon || (
											<CreditCard />
										)}
									</Container>
									<Text>{t('anotherStep')}</Text>
								</div>
							</div>
						</div>
					) : paidByGiftcard ? (
						<div className="flex flex-col w-1/3">
							<Text className="txt-medium-plus text-ui-fg-base mb-1">
								{t('paymentMethod')}
							</Text>
							<Text
								className="txt-medium text-ui-fg-subtle"
								data-testid="payment-method-summary"
							>
								{t('giftCard')}
							</Text>
						</div>
					) : null}
				</div>
			</div>
			<Divider className="mt-8" />
		</div>
	);
};

export default Payment;
