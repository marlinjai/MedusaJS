// src/modules/account/components/login/index.tsx
import { login } from '@lib/data/customer';
import { LOGIN_VIEW } from '@modules/account/templates/login-template';
import ErrorMessage from '@modules/checkout/components/error-message';
import { SubmitButton } from '@modules/checkout/components/submit-button';
import Input from '@modules/common/components/input';
import LocalizedClientLink from '@modules/common/components/localized-client-link';
import { useActionState } from 'react';

type Props = {
	setCurrentView: (view: LOGIN_VIEW) => void;
};

const Login = ({ setCurrentView }: Props) => {
	const [message, formAction] = useActionState(login, null);

	return (
		<div
			className="max-w-sm w-full flex flex-col items-center"
			data-testid="login-page"
		>
			<h1 className="text-2xl font-bold text-white mb-6">Willkommen zurück</h1>
			<p className="text-center text-neutral-400 mb-8">
				Melden Sie sich an, um ein verbessertes Einkaufserlebnis zu erhalten.
			</p>
			<form className="w-full" action={formAction}>
				<div className="flex flex-col gap-y-4 w-full">
					<Input
						label="E-Mail"
						name="email"
						type="email"
						title="Geben Sie eine gültige E-Mail-Adresse ein."
						autoComplete="email"
						required
						data-testid="email-input"
					/>
					<Input
						label="Passwort"
						name="password"
						type="password"
						autoComplete="current-password"
						required
						data-testid="password-input"
					/>
				</div>
				<ErrorMessage error={message} data-testid="login-error-message" />
				<SubmitButton
					data-testid="sign-in-button"
					className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
				>
					Anmelden
				</SubmitButton>
			</form>

			{/* Passwort vergessen Link */}
			<div className="text-center mt-6">
				<LocalizedClientLink
					href="/request-reset"
					className="text-sm text-neutral-400 hover:text-white underline transition-colors"
					data-testid="forgot-password-link"
				>
					Passwort vergessen?
				</LocalizedClientLink>
			</div>

			<div className="text-center text-neutral-400 text-sm mt-6">
				Noch kein Mitglied?{' '}
				<button
					onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
					className="text-blue-400 hover:text-blue-300 underline transition-colors"
					data-testid="register-button"
				>
					Jetzt registrieren
				</button>
			</div>
		</div>
	);
};

export default Login;
