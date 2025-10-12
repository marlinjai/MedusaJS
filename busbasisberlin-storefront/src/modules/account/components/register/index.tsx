// src/modules/account/components/register/index.tsx
'use client';

import { signup } from '@lib/data/customer';
import { LOGIN_VIEW } from '@modules/account/templates/login-template';
import ErrorMessage from '@modules/checkout/components/error-message';
import { SubmitButton } from '@modules/checkout/components/submit-button';
import Input from '@modules/common/components/input';
import LocalizedClientLink from '@modules/common/components/localized-client-link';
import { useActionState } from 'react';

type Props = {
	setCurrentView: (view: LOGIN_VIEW) => void;
};

const Register = ({ setCurrentView }: Props) => {
	const [message, formAction] = useActionState(signup, null);

	return (
		<div
			className="max-w-sm flex flex-col items-center"
			data-testid="register-page"
		>
			<h1 className="text-2xl font-bold text-white mb-6">
				Werden Sie Mitglied bei BasisCamp Berlin
			</h1>
			<p className="text-center text-neutral-400 mb-6">
				Erstellen Sie Ihr Kundenprofil und erhalten Sie Zugang zu einem
				verbesserten Einkaufserlebnis.
			</p>
			<form className="w-full" action={formAction}>
				<div className="flex flex-col gap-y-4 w-full">
					<Input
						label="Vorname"
						name="first_name"
						required
						autoComplete="given-name"
						data-testid="first-name-input"
					/>
					<Input
						label="Nachname"
						name="last_name"
						required
						autoComplete="family-name"
						data-testid="last-name-input"
					/>
					<Input
						label="E-Mail"
						name="email"
						required
						type="email"
						autoComplete="email"
						data-testid="email-input"
					/>
					<Input
						label="Telefon"
						name="phone"
						type="tel"
						autoComplete="tel"
						data-testid="phone-input"
					/>
					<Input
						label="Passwort"
						name="password"
						required
						type="password"
						autoComplete="new-password"
						data-testid="password-input"
					/>
				</div>
				<ErrorMessage error={message} data-testid="register-error" />
				<div className="text-center text-neutral-400 text-sm mt-6">
					Mit der Erstellung eines Kontos stimmen Sie unseren{' '}
					<LocalizedClientLink
						href="/content/privacy-policy"
						className="text-blue-400 hover:text-blue-300 underline transition-colors"
					>
						Datenschutzbestimmungen
					</LocalizedClientLink>{' '}
					und{' '}
					<LocalizedClientLink
						href="/content/terms-of-use"
						className="text-blue-400 hover:text-blue-300 underline transition-colors"
					>
						Nutzungsbedingungen
					</LocalizedClientLink>{' '}
					zu.
				</div>
				<SubmitButton
					className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
					data-testid="register-button"
				>
					Konto erstellen
				</SubmitButton>
			</form>
			<div className="text-center text-neutral-400 text-sm mt-6">
				Bereits Mitglied?{' '}
				<button
					onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
					className="text-blue-400 hover:text-blue-300 underline transition-colors"
				>
					Hier anmelden
				</button>
			</div>
		</div>
	);
};

export default Register;
