/**
 * contact-form.tsx
 * Email template for contact form submissions
 */

import {
	EmailInfoBox,
	EmailText,
	EmailTitle,
	EmailWrapper,
} from '../utils/email-wrapper';

interface ContactFormEmailProps {
	customer_name: string;
	customer_email: string;
	customer_phone?: string;
	customer_message: string;
}

// Main email component
function ContactFormEmailComponent(props: ContactFormEmailProps) {
	const { customer_name, customer_email, customer_phone, customer_message } =
		props;

	return (
		<EmailWrapper headerVariant="primary">
			<EmailTitle>📧 Neue Kontaktanfrage</EmailTitle>

			<EmailText>
				Es wurde eine neue Kontaktanfrage über das Kontaktformular auf der
				Website eingegangen.
			</EmailText>

			<EmailInfoBox title="👤 Kontaktinformationen" variant="info">
				<p style={{ margin: '8px 0' }}>
					<strong>Name:</strong> {customer_name}
				</p>
				<p style={{ margin: '8px 0' }}>
					<strong>E-Mail:</strong> {customer_email}
				</p>
				{customer_phone && (
					<p style={{ margin: '8px 0' }}>
						<strong>Telefon:</strong> {customer_phone}
					</p>
				)}
			</EmailInfoBox>

			<EmailInfoBox title="💬 Nachricht" variant="info">
				<p style={{ margin: '8px 0', whiteSpace: 'pre-wrap' }}>
					{customer_message}
				</p>
			</EmailInfoBox>

			<EmailText>
				Bitte antworten Sie dem Kunden zeitnah auf seine Anfrage.
			</EmailText>
		</EmailWrapper>
	);
}

// Export for Resend service
export const contactFormEmail = (props: ContactFormEmailProps) => (
	<ContactFormEmailComponent {...props} />
);

// Mock data for preview/development
const mockData: ContactFormEmailProps = {
	customer_name: 'Max Mustermann',
	customer_email: 'max.mustermann@example.com',
	customer_phone: '+49 30 12345678',
	customer_message:
		'Hallo,\n\nich interessiere mich für Ihre Dienstleistungen und würde gerne mehr Informationen erhalten.\n\nVielen Dank!\n\nMax Mustermann',
};

// Default export for React Email preview
export default () => <ContactFormEmailComponent {...mockData} />;
