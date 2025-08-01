import RequestResetTemplate from '@modules/account/templates/request-reset-template';
import { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Passwort zurücksetzen',
	description:
		'Geben Sie Ihre E-Mail-Adresse ein, um Ihr Passwort zurückzusetzen.',
};

export default function RequestResetPage() {
	return <RequestResetTemplate />;
}
