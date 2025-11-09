'use client';

import { Button, Heading, Input, Label, Text } from '@medusajs/ui';
import LocalizedClientLink from '@modules/common/components/localized-client-link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// busbasisberlin-storefront/src/modules/account/templates/request-reset-template.tsx
// Template für Password Reset Anfrage - Kunde gibt Email ein
const RequestResetTemplate = () => {
	const [email, setEmail] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [error, setError] = useState('');
	const router = useRouter();

	// Formular Submit Handler
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!email.trim()) {
			setError('Bitte geben Sie Ihre E-Mail-Adresse ein.');
			return;
		}

		if (!email.includes('@')) {
			setError('Bitte geben Sie eine gültige E-Mail-Adresse ein.');
			return;
		}

		setIsLoading(true);
		setError('');

		try {
			// API Call to Medusa's built-in password reset endpoint
			// Following official Medusa v2 documentation:
			// POST /auth/{actor_type}/{auth_provider}/reset-password
			const backendUrl =
				process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';

			const response = await fetch(
				`${backendUrl}/auth/customer/emailpass/reset-password`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						identifier: email.trim(), // Medusa expects "identifier" not "email"
					}),
				},
			);

			setIsSubmitted(true);
		} catch (err: any) {
			console.error('Password reset request failed:', err);
			// For security reasons, always show success message
			// even if email doesn't exist (as per Medusa docs)
			setIsSubmitted(true);
		} finally {
			setIsLoading(false);
		}
	};

	// Erfolgs-Ansicht nach dem Absenden
	if (isSubmitted) {
		return (
			<div className="min-h-[75vh] md:min-h-[65vh] flex items-center justify-center py-12">
			<div className="w-full max-w-md mx-auto">
				<div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
					<div className="mb-4">
						<svg
							className="w-12 h-12 text-green-500 mx-auto"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>

					<Heading
						level="h2"
						className="text-xl font-semibold text-green-800 mb-3"
					>
						E-Mail versendet!
					</Heading>

					<Text className="text-green-700 mb-4">
						Falls ein Konto mit der E-Mail-Adresse <strong>{email}</strong>{' '}
						existiert, haben Sie eine E-Mail mit Anweisungen zum Zurücksetzen
						Ihres Passworts erhalten.
					</Text>

					<Text className="text-sm text-green-600 mb-6">
							Bitte überprüfen Sie auch Ihren Spam-Ordner. Der Link ist 24
							Stunden gültig.
					</Text>

					<div className="space-y-3">
						<Button
							onClick={() => {
								setIsSubmitted(false);
								setEmail('');
							}}
							variant="secondary"
							className="w-full"
						>
							Andere E-Mail verwenden
						</Button>

						<LocalizedClientLink
							href="/account"
							className="block w-full text-center"
						>
							<Button variant="primary" className="w-full">
								Zur Anmeldung
							</Button>
						</LocalizedClientLink>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Formular-Ansicht
	return (
		<div className="min-h-[75vh] md:min-h-[65vh] flex items-center justify-center py-12 px-4">
			<div className="w-full max-w-md">
			<div className="text-center mb-8">
					<Heading level="h1" className="text-3xl font-bold text-gray-100 mb-2">
					Passwort zurücksetzen
				</Heading>
					<Text className="text-gray-300">
						Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link
						zum Zurücksetzen Ihres Passworts.
				</Text>
			</div>

			<form onSubmit={handleSubmit} className="space-y-6">
				<div>
					<Label
						htmlFor="email"
							className="block text-sm font-medium text-gray-200 mb-2"
					>
						E-Mail-Adresse
					</Label>
					<Input
						id="email"
						type="email"
						value={email}
						onChange={e => setEmail(e.target.value)}
						placeholder="ihre.email@beispiel.de"
						className="w-full"
						required
						disabled={isLoading}
					/>
						{error && (
							<Text className="text-red-600 text-sm mt-2">{error}</Text>
						)}
				</div>

				<Button
					type="submit"
					className="w-full"
					disabled={isLoading || !email.trim()}
				>
					{isLoading ? (
						<div className="flex items-center justify-center">
							<svg
								className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeWidth="4"
									className="opacity-25"
								/>
								<path
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									className="opacity-75"
								/>
							</svg>
							E-Mail wird gesendet...
						</div>
					) : (
						'Passwort-Reset-Link senden'
					)}
				</Button>
			</form>

			<div className="mt-6 text-center">
					<Text className="text-gray-300 text-sm">
					Erinnern Sie sich wieder an Ihr Passwort?{' '}
					<LocalizedClientLink
						href="/account"
							className="text-blue-400 hover:text-blue-300 font-medium"
					>
						Zur Anmeldung
					</LocalizedClientLink>
				</Text>
				</div>
			</div>
		</div>
	);
};

export default RequestResetTemplate;
