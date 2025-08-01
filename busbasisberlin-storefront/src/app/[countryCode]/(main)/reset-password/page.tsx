import ResetPasswordTemplate from '@modules/account/templates/reset-password-template';
import { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Neues Passwort erstellen',
	description: 'Erstellen Sie ein neues Passwort für Ihr Konto.',
};

export default function ResetPasswordPage() {
	return <ResetPasswordTemplate />;
}
