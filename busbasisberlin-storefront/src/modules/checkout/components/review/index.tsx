'use client';

import { Heading, clx } from '@medusajs/ui';

import { useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import PaymentButton from '../payment-button';

const Review = ({ cart }: { cart: any }) => {
	const t = useTranslations('checkout.review');
	const searchParams = useSearchParams();
	const params = useParams();
	const countryCode = (params?.countryCode as string) || 'de';

	const isOpen = searchParams?.get('step') === 'review';
	const [termsAccepted, setTermsAccepted] = useState(false);

	const paidByGiftcard =
		cart?.gift_cards && cart?.gift_cards?.length > 0 && cart?.total === 0;

	const previousStepsCompleted =
		cart.shipping_address &&
		cart.shipping_methods.length > 0 &&
		(cart.payment_collection || paidByGiftcard);

	return (
		<div className="bg-card">
			<div className="flex flex-row items-center justify-between mb-6">
				<Heading
					level="h2"
					className={clx(
						'flex flex-row text-3xl-regular gap-x-2 items-baseline',
						{
							'opacity-50 pointer-events-none select-none': !isOpen,
						},
					)}
				>
					{t('title')}
				</Heading>
			</div>
			{isOpen && previousStepsCompleted && (
				<>
					{/* Terms and Conditions Checkbox */}
					<div className="mb-6">
						<label className="flex items-start gap-3 group">
							<input
								type="checkbox"
								checked={termsAccepted}
								onChange={e => setTermsAccepted(e.target.checked)}
								className="mt-1 w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
								required
								data-testid="terms-checkbox"
							/>
							<span className="text-ui-fg-base text-small-regular leading-relaxed">
								{t('termsAgreeStart')}{' '}
								<a
									href={`/${countryCode}/terms`}
									target="_blank"
									rel="noopener noreferrer"
									className="underline hover:text-blue-400 transition-colors"
								>
									{t('termsLink')}
								</a>{' '}
								{t('and')} {t('cancellationPolicy')} {t('termsAgreeEnd')}
							</span>
						</label>
					</div>
					<PaymentButton
						cart={cart}
						termsAccepted={termsAccepted}
						data-testid="submit-order-button"
					/>
				</>
			)}
		</div>
	);
};

export default Review;
