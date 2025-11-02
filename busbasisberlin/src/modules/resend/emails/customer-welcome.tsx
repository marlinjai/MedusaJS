/**
 * customer-welcome.tsx
 * Welcome email template for new customer registrations
 */

import { getCompanyInfo } from '../utils/company-info';
import {
	EmailButton,
	EmailInfoBox,
	EmailText,
	EmailTitle,
	EmailWrapper,
} from '../utils/email-wrapper';

interface CustomerWelcomeEmailProps {
	customer_name?: string;
	customer_email: string;
	customer_id: string;
}

// Main email component
function CustomerWelcomeEmailComponent(props: CustomerWelcomeEmailProps) {
	const { customer_name, customer_email } = props;
	const company = getCompanyInfo();

	return (
		<EmailWrapper headerVariant="primary">
			<EmailTitle>🎉 Willkommen bei {company.name}!</EmailTitle>

			<EmailText>
				{customer_name
					? `Liebe/r ${customer_name},`
					: 'Sehr geehrte Damen und Herren,'}
			</EmailText>

			<EmailText>
				herzlich willkommen bei {company.name}! Wir freuen uns sehr, dass Sie
				sich für ein Kundenkonto bei uns entschieden haben.
			</EmailText>

			<EmailInfoBox
				title="✨ Ihre Vorteile als registrierter Kunde"
				variant="info"
			>
				<ul style={{ paddingLeft: '20px', margin: '10px 0' }}>
					<li>Schnellerer Checkout bei Ihrer nächsten Bestellung</li>
					<li>Übersicht über alle Ihre Bestellungen</li>
					<li>Verwaltung Ihrer Lieferadressen</li>
					<li>Persönliche Angebote und Sonderaktionen</li>
					<li>Bestellstatus-Tracking in Echtzeit</li>
				</ul>
			</EmailInfoBox>

			<EmailText>
				<strong>Ihre Zugangsdaten:</strong>
			</EmailText>

			<div
				style={{
					backgroundColor: '#f8f9fa',
					border: '1px solid #dee2e6',
					borderRadius: '5px',
					padding: '15px',
					marginBottom: '20px',
				}}
			>
				<p style={{ margin: '8px 0', fontSize: '14px', color: '#555' }}>
					<strong>E-Mail:</strong> {customer_email}
				</p>
				<p style={{ margin: '8px 0', fontSize: '14px', color: '#555' }}>
					<strong>Passwort:</strong> Das von Ihnen gewählte Passwort
				</p>
			</div>

			<EmailText>
				<strong>So geht es weiter:</strong>
			</EmailText>

			<ul
				style={{
					fontSize: '14px',
					color: '#555',
					lineHeight: '1.8',
					paddingLeft: '20px',
					marginBottom: '20px',
				}}
			>
				<li>Durchstöbern Sie unser vielfältiges Sortiment</li>
				<li>Legen Sie Produkte in Ihren Warenkorb</li>
				<li>Profitieren Sie von unserem schnellen Versand</li>
				<li>Bewerten Sie Ihre Bestellungen und teilen Sie Ihr Feedback</li>
			</ul>

			<EmailButton href={company.website || 'https://basiscampberlin.de'}>
				🛒 Jetzt einkaufen
			</EmailButton>
		</EmailWrapper>
	);
}

// Export for Resend service
export const customerWelcomeEmail = (props: CustomerWelcomeEmailProps) => (
	<CustomerWelcomeEmailComponent {...props} />
);

// Mock data for preview/development
const mockData: CustomerWelcomeEmailProps = {
	customer_name: 'Max Mustermann',
	customer_email: 'max.mustermann@example.com',
	customer_id: 'cus_123456',
};

// Default export for React Email preview
export default () => <CustomerWelcomeEmailComponent {...mockData} />;
