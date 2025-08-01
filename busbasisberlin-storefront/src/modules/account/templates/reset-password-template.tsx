'use client';

import { sdk } from '@lib/config';
import { Button, Heading, Input, Label, Text } from '@medusajs/ui';
import LocalizedClientLink from '@modules/common/components/localized-client-link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

// busbasisberlin-storefront/src/modules/account/templates/reset-password-template.tsx
// Template für Password Reset - Kunde gibt neues Passwort mit Token ein
const ResetPasswordTemplate = () => {
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);
	const [error, setError] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	const router = useRouter();
	const searchParams = useSearchParams();

	// Token und Email aus URL-Parametern extrahieren
	const token = searchParams.get('token');
	const email = searchParams.get('email');

	// Validierung beim Laden der Seite
	useEffect(() => {
		if (!token || !email) {
			setError(
				'Ungültiger oder abgelaufener Reset-Link. Bitte fordern Sie einen neuen an.',
			);
		}
	}, [token, email]);

	// Passwort-Validierung
	const validatePassword = (pwd: string) => {
		if (pwd.length < 8) {
			return 'Das Passwort muss mindestens 8 Zeichen lang sein.';
		}
		if (!/(?=.*[a-z])/.test(pwd)) {
			return 'Das Passwort muss mindestens einen Kleinbuchstaben enthalten.';
		}
		if (!/(?=.*[A-Z])/.test(pwd)) {
			return 'Das Passwort muss mindestens einen Großbuchstaben enthalten.';
		}
		if (!/(?=.*\d)/.test(pwd)) {
			return 'Das Passwort muss mindestens eine Ziffer enthalten.';
		}
		return '';
	};

	// Formular Submit Handler
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!token || !email) {
			setError('Ungültiger Reset-Link.');
			return;
		}

		// Passwort-Validierung
		const passwordError = validatePassword(password);
		if (passwordError) {
			setError(passwordError);
			return;
		}

		if (password !== confirmPassword) {
			setError('Die Passwörter stimmen nicht überein.');
			return;
		}

		setIsLoading(true);
		setError('');

		try {
			// API Call zur Medusa Backend - Reset Password
			await sdk.auth.resetPassword(
				{
					email: email,
					password: password,
				},
				{
					// Token im Authorization Header (wie in der Dokumentation beschrieben)
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			);

			setIsSuccess(true);
		} catch (err: any) {
			console.error('Password reset failed:', err);

			if (
				err.message?.includes('expired') ||
				err.message?.includes('invalid')
			) {
				setError(
					'Ihr Reset-Link ist abgelaufen oder ungültig. Bitte fordern Sie einen neuen an.',
				);
			} else {
				setError(
					'Fehler beim Zurücksetzen des Passworts. Bitte versuchen Sie es erneut.',
				);
			}
		} finally {
			setIsLoading(false);
		}
	};

	// Erfolgs-Ansicht nach erfolgreichem Reset
	if (isSuccess) {
		return (
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
						Passwort erfolgreich geändert!
					</Heading>

					<Text className="text-green-700 mb-6">
						Ihr Passwort wurde erfolgreich zurückgesetzt. Sie können sich jetzt
						mit Ihrem neuen Passwort anmelden.
					</Text>

					<LocalizedClientLink href="/account">
						<Button className="w-full">Zur Anmeldung</Button>
					</LocalizedClientLink>
				</div>
			</div>
		);
	}

	// Fehler-Ansicht bei ungültigem Token
	if (!token || !email) {
		return (
			<div className="w-full max-w-md mx-auto">
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<div className="mb-4">
						<svg
							className="w-12 h-12 text-red-500 mx-auto"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
							/>
						</svg>
					</div>

					<Heading
						level="h2"
						className="text-xl font-semibold text-red-800 mb-3"
					>
						Ungültiger Link
					</Heading>

					<Text className="text-red-700 mb-6">
						Dieser Reset-Link ist ungültig oder abgelaufen. Bitte fordern Sie
						einen neuen Link an.
					</Text>

					<LocalizedClientLink href="/request-reset">
						<Button className="w-full">Neuen Reset-Link anfordern</Button>
					</LocalizedClientLink>
				</div>
			</div>
		);
	}

	// Formular-Ansicht
	return (
		<div className="w-full max-w-md mx-auto">
			<div className="text-center mb-8">
				<Heading level="h1" className="text-3xl font-bold text-gray-900 mb-2">
					Neues Passwort erstellen
				</Heading>
				<Text className="text-gray-600 mb-4">
					Erstellen Sie ein sicheres Passwort für Ihr Konto.
				</Text>
				{email && (
					<Text className="text-sm text-gray-500">
						Für: <strong>{email}</strong>
					</Text>
				)}
			</div>

			<form onSubmit={handleSubmit} className="space-y-6">
				{/* Neues Passwort */}
				<div>
					<Label
						htmlFor="password"
						className="block text-sm font-medium text-gray-700 mb-2"
					>
						Neues Passwort
					</Label>
					<div className="relative">
						<Input
							id="password"
							type={showPassword ? 'text' : 'password'}
							value={password}
							onChange={e => setPassword(e.target.value)}
							placeholder="Mindestens 8 Zeichen"
							className="w-full pr-10"
							required
							disabled={isLoading}
						/>
						<button
							type="button"
							onClick={() => setShowPassword(!showPassword)}
							className="absolute inset-y-0 right-0 flex items-center pr-3"
						>
							<svg
								className="w-5 h-5 text-gray-400 hover:text-gray-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								{showPassword ? (
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464m1.414 1.414L19.5 19.5"
									/>
								) : (
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
									/>
								)}
							</svg>
						</button>
					</div>
				</div>

				{/* Passwort bestätigen */}
				<div>
					<Label
						htmlFor="confirmPassword"
						className="block text-sm font-medium text-gray-700 mb-2"
					>
						Passwort bestätigen
					</Label>
					<div className="relative">
						<Input
							id="confirmPassword"
							type={showConfirmPassword ? 'text' : 'password'}
							value={confirmPassword}
							onChange={e => setConfirmPassword(e.target.value)}
							placeholder="Passwort wiederholen"
							className="w-full pr-10"
							required
							disabled={isLoading}
						/>
						<button
							type="button"
							onClick={() => setShowConfirmPassword(!showConfirmPassword)}
							className="absolute inset-y-0 right-0 flex items-center pr-3"
						>
							<svg
								className="w-5 h-5 text-gray-400 hover:text-gray-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								{showConfirmPassword ? (
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464m1.414 1.414L19.5 19.5"
									/>
								) : (
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
									/>
								)}
							</svg>
						</button>
					</div>
				</div>

				{/* Passwort-Anforderungen */}
				<div className="bg-gray-50 p-4 rounded-lg">
					<Text className="text-sm font-medium text-gray-700 mb-2">
						Passwort-Anforderungen:
					</Text>
					<ul className="text-sm text-gray-600 space-y-1">
						<li
							className={`flex items-center ${
								password.length >= 8 ? 'text-green-600' : 'text-gray-400'
							}`}
						>
							<span className="mr-2">{password.length >= 8 ? '✓' : '○'}</span>
							Mindestens 8 Zeichen
						</li>
						<li
							className={`flex items-center ${
								/(?=.*[a-z])/.test(password)
									? 'text-green-600'
									: 'text-gray-400'
							}`}
						>
							<span className="mr-2">
								{/(?=.*[a-z])/.test(password) ? '✓' : '○'}
							</span>
							Ein Kleinbuchstabe
						</li>
						<li
							className={`flex items-center ${
								/(?=.*[A-Z])/.test(password)
									? 'text-green-600'
									: 'text-gray-400'
							}`}
						>
							<span className="mr-2">
								{/(?=.*[A-Z])/.test(password) ? '✓' : '○'}
							</span>
							Ein Großbuchstabe
						</li>
						<li
							className={`flex items-center ${
								/(?=.*\d)/.test(password) ? 'text-green-600' : 'text-gray-400'
							}`}
						>
							<span className="mr-2">
								{/(?=.*\d)/.test(password) ? '✓' : '○'}
							</span>
							Eine Ziffer
						</li>
					</ul>
				</div>

				{error && (
					<div className="bg-red-50 border border-red-200 rounded-lg p-3">
						<Text className="text-red-700 text-sm">{error}</Text>
					</div>
				)}

				<Button
					type="submit"
					className="w-full"
					disabled={
						isLoading ||
						!password ||
						!confirmPassword ||
						password !== confirmPassword
					}
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
							Passwort wird geändert...
						</div>
					) : (
						'Passwort zurücksetzen'
					)}
				</Button>
			</form>

			<div className="mt-6 text-center">
				<Text className="text-gray-600 text-sm">
					Haben Sie Probleme?{' '}
					<LocalizedClientLink
						href="/request-reset"
						className="text-blue-600 hover:text-blue-800 font-medium"
					>
						Neuen Link anfordern
					</LocalizedClientLink>
				</Text>
			</div>
		</div>
	);
};

export default ResetPasswordTemplate;
