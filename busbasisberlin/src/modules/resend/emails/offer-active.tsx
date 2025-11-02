/**
 * offer-active.tsx
 * Email template for when an offer becomes active (ready to send to customer)
 */

import {
	EmailWrapper,
	EmailTitle,
	EmailText,
	EmailInfoBox,
} from '../utils/email-wrapper';

interface OfferActiveEmailProps {
	offer_number: string;
	customer_name?: string;
	offer_id: string;
	status: string;
}

// Main email component
function OfferActiveEmailComponent(props: OfferActiveEmailProps) {
	const { offer_number, customer_name } = props;

	return (
		<EmailWrapper headerVariant="primary">
			<EmailTitle>📄 Ihr Angebot ist bereit</EmailTitle>

			<EmailText>
				{customer_name
					? `Liebe/r ${customer_name},`
					: 'Sehr geehrte Damen und Herren,'}
			</EmailText>

			<EmailText>
				vielen Dank für Ihr Interesse an unseren Leistungen. Wir freuen uns,
				Ihnen hiermit unser Angebot <strong>{offer_number}</strong> vorlegen zu
				können.
			</EmailText>

			<EmailText>
				Das detaillierte Angebot finden Sie als PDF-Datei im Anhang dieser
				E-Mail. Gerne stehen wir Ihnen für Rückfragen zur Verfügung.
			</EmailText>

			<EmailInfoBox title="📋 Angebots-Details" variant="info">
				<p style={{ margin: '8px 0' }}>
					<strong>Angebotsnummer:</strong> {offer_number}
				</p>
				<p style={{ margin: '8px 0' }}>
					<strong>Status:</strong> Aktiv
				</p>
				<p style={{ margin: '8px 0' }}>
					<strong>Anhang:</strong> PDF-Angebot im Anhang dieser E-Mail
				</p>
			</EmailInfoBox>
		</EmailWrapper>
	);
}

// Export for Resend service
export const offerActiveEmail = (props: OfferActiveEmailProps) => (
	<OfferActiveEmailComponent {...props} />
);

// Mock data for preview/development
const mockData: OfferActiveEmailProps = {
	offer_number: 'ANG-2024-001',
	customer_name: 'Max Mustermann',
	offer_id: 'offer_123456',
	status: 'active',
};

// Default export for React Email preview
export default () => <OfferActiveEmailComponent {...mockData} />;
