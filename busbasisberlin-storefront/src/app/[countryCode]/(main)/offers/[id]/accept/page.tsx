/**
 * /offers/[id]/accept/page.tsx
 * Storefront page for customers to accept offers via email link
 */

'use client';

import { acceptOffer as acceptOfferAction } from '@lib/data/offers';
import { CheckCircleSolid, XCircleSolid } from '@medusajs/icons';
import { Button, Heading, Text } from '@medusajs/ui';
import { useTranslations } from 'next-intl';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function OfferAcceptPage() {
	const params = useParams();
	const searchParams = useSearchParams();
	const router = useRouter();
	const t = useTranslations('offers');

	const countryCode = (params?.countryCode as string) || 'de';
	const offerId = (params?.id as string) || '';
	const token = searchParams?.get('token') || null;
	const email = searchParams?.get('email') || null;

	const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
		'loading',
	);
	const [message, setMessage] = useState<string>('');
	const [offerNumber, setOfferNumber] = useState<string>('');

	useEffect(() => {
		if (!token || !email || !offerId) {
			setStatus('error');
			setMessage(t('invalidRequest'));
			return;
		}

		// Use Server Action - no CORS issues (runs on Next.js server)
		const handleAcceptOffer = async () => {
			try {
				const result = await acceptOfferAction(offerId, token, email);

				if (!result.success) {
					throw new Error(result.error || t('errorMessage'));
				}

				setStatus('success');
				setMessage(result.message || t('success'));
				setOfferNumber(result.offer?.offer_number || '');
			} catch (error: any) {
				console.error('Error accepting offer:', error);
				setStatus('error');
				setMessage(error.message || t('errorMessage'));
			}
		};

		handleAcceptOffer();
	}, [offerId, token, email, t]);

	return (
		<div className="min-h-screen flex items-center justify-center bg-muted px-4">
			<div className="max-w-2xl w-full bg-card rounded-lg shadow-xl p-8 md:p-12">
				{status === 'loading' && (
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
						<Heading level="h1" className="mb-4">
							{t('accepting')}
						</Heading>
						<Text className="text-muted-foreground">{t('pleaseWait')}</Text>
					</div>
				)}

				{status === 'success' && (
					<div className="text-center">
						<div className="flex justify-center mb-6">
							<div className="rounded-full bg-green-100 p-4">
								<CheckCircleSolid className="w-12 h-12 text-green-600" />
							</div>
						</div>
						<Heading level="h1" className="mb-4 text-green-600">
							{t('success')}
						</Heading>
						{offerNumber && (
							<Text className="text-lg mb-4">
								{t('offerNumber')}: <strong>{offerNumber}</strong>
							</Text>
						)}
						<Text className="text-muted-foreground mb-8">{t('thankYou')}</Text>
						<Button
							onClick={() => router.push(`/${countryCode}`)}
							size="large"
							className="w-full sm:w-auto"
						>
							{t('goToHome')}
						</Button>
					</div>
				)}

				{status === 'error' && (
					<div className="text-center">
						<div className="flex justify-center mb-6">
							<div className="rounded-full bg-red-100 p-4">
								<XCircleSolid className="w-12 h-12 text-red-600" />
							</div>
						</div>
						<Heading level="h1" className="mb-4 text-red-600">
							{t('error')}
						</Heading>
						<Text className="text-muted-foreground mb-8">{message}</Text>
						<div className="space-y-3">
							<Text className="text-sm text-muted-foreground">
								{t('contactUs')}
							</Text>
							<Text className="text-sm">
								<strong>E-Mail:</strong>{' '}
								<a
									href="mailto:info@basiscampberlin.de"
									className="text-primary hover:underline"
								>
									info@basiscampberlin.de
								</a>
							</Text>
							<Button
								onClick={() => router.push(`/${countryCode}`)}
								variant="secondary"
								size="large"
								className="w-full sm:w-auto mt-4"
							>
								{t('goToHome')}
							</Button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
