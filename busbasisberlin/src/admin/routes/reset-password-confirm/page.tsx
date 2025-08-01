import { CheckCircleSolid, ExclamationCircleSolid } from '@medusajs/icons';
import { Button, Container, Heading, Input, Text } from '@medusajs/ui';
import { useEffect, useState } from 'react';

// busbasisberlin/src/admin/routes/reset-password-confirm/page.tsx
// Admin UI Route für Password Reset Confirmation mit Token
const AdminResetPasswordConfirmPage = () => {
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);
	const [error, setError] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	// Token und Email aus URL-Parametern extrahieren
	const [token, setToken] = useState('');
	const [email, setEmail] = useState('');

	useEffect(() => {
		// URL-Parameter extrahieren
		const urlParams = new URLSearchParams(window.location.search);
		const tokenParam = urlParams.get('token');
		const emailParam = urlParams.get('email');

		if (tokenParam && emailParam) {
			setToken(tokenParam);
			setEmail(emailParam);
		} else {
			setError(
				'Ungültiger oder abgelaufener Reset-Link. Bitte fordern Sie einen neuen an.',
			);
		}
	}, []);

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
			// API Call zum Medusa Backend - Reset Password für Admin-User
			const response = await fetch('/auth/user/emailpass/update', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`, // Token im Header wie in der Dokumentation
				},
				body: JSON.stringify({
					email: email,
					password: password,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || 'Reset failed');
			}

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
			<Container className="divide-y p-0">
				<div className="flex items-center justify-between px-6 py-4">
					<Heading level="h1">Password erfolgreich geändert</Heading>
				</div>

				<div className="px-6 py-8">
					<div className="max-w-md mx-auto text-center">
						<div className="mb-6">
							<CheckCircleSolid className="w-16 h-16 text-green-500 mx-auto" />
						</div>

						<Heading
							level="h2"
							className="text-xl font-semibold text-green-800 mb-4"
						>
							Passwort erfolgreich geändert!
						</Heading>

						<Text className="text-green-700 mb-6">
							Ihr Admin-Passwort wurde erfolgreich zurückgesetzt. Sie können
							sich jetzt mit Ihrem neuen Passwort anmelden.
						</Text>

						<Button
							onClick={() => (window.location.href = '/app')}
							className="w-full"
						>
							Zur Admin-Anmeldung
						</Button>
					</div>
				</div>
			</Container>
		);
	}

	// Fehler-Ansicht bei ungültigem Token
	if (!token || !email) {
		return (
			<Container className="divide-y p-0">
				<div className="flex items-center justify-between px-6 py-4">
					<Heading level="h1">Ungültiger Reset-Link</Heading>
				</div>

				<div className="px-6 py-8">
					<div className="max-w-md mx-auto text-center">
						<div className="mb-6">
							<ExclamationCircleSolid className="w-16 h-16 text-red-500 mx-auto" />
						</div>

						<Heading
							level="h2"
							className="text-xl font-semibold text-red-800 mb-4"
						>
							Ungültiger Link
						</Heading>

						<Text className="text-red-700 mb-6">
							Dieser Reset-Link ist ungültig oder abgelaufen. Bitte fordern Sie
							einen neuen Link an.
						</Text>

						<Button
							onClick={() => (window.location.href = '/app/reset-password')}
							className="w-full"
						>
							Neuen Reset-Link anfordern
						</Button>
					</div>
				</div>
			</Container>
		);
	}

	// Formular-Ansicht
	return (
		<Container className="divide-y p-0">
			<div className="flex items-center justify-between px-6 py-4">
				<Heading level="h1">Neues Admin Passwort erstellen</Heading>
			</div>

			<div className="px-6 py-8">
				<div className="max-w-md mx-auto">
					<div className="text-center mb-8">
						<Text className="text-gray-600 mb-4">
							Erstellen Sie ein sicheres Passwort für Ihr Admin-Konto.
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
							<label
								htmlFor="password"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Neues Passwort
							</label>
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
									className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
								>
									{showPassword ? '🙈' : '👁️'}
								</button>
							</div>
						</div>

						{/* Passwort bestätigen */}
						<div>
							<label
								htmlFor="confirmPassword"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Passwort bestätigen
							</label>
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
									className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
								>
									{showConfirmPassword ? '🙈' : '👁️'}
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
									className={`flex items-center ${password.length >= 8 ? 'text-green-600' : 'text-gray-400'}`}
								>
									<span className="mr-2">
										{password.length >= 8 ? '✓' : '○'}
									</span>
									Mindestens 8 Zeichen
								</li>
								<li
									className={`flex items-center ${/(?=.*[a-z])/.test(password) ? 'text-green-600' : 'text-gray-400'}`}
								>
									<span className="mr-2">
										{/(?=.*[a-z])/.test(password) ? '✓' : '○'}
									</span>
									Ein Kleinbuchstabe
								</li>
								<li
									className={`flex items-center ${/(?=.*[A-Z])/.test(password) ? 'text-green-600' : 'text-gray-400'}`}
								>
									<span className="mr-2">
										{/(?=.*[A-Z])/.test(password) ? '✓' : '○'}
									</span>
									Ein Großbuchstabe
								</li>
								<li
									className={`flex items-center ${/(?=.*\d)/.test(password) ? 'text-green-600' : 'text-gray-400'}`}
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
							{isLoading
								? 'Passwort wird geändert...'
								: 'Passwort zurücksetzen'}
						</Button>
					</form>

					<div className="mt-6 text-center">
						<Text className="text-gray-600 text-sm">
							Haben Sie Probleme?{' '}
							<a
								href="/app/reset-password"
								className="text-blue-600 hover:text-blue-800 font-medium"
							>
								Neuen Link anfordern
							</a>
						</Text>
					</div>
				</div>
			</div>
		</Container>
	);
};

export default AdminResetPasswordConfirmPage;

// Breadcrumb für bessere Navigation
export const handle = {
	breadcrumb: () => 'Neues Passwort erstellen',
};
