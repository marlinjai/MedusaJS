/**
 * offer-accepted.tsx
 * Email template for when an offer is accepted by the customer
 */

import {
	EmailWrapper,
	EmailTitle,
	EmailText,
	EmailInfoBox,
} from '../utils/email-wrapper';

interface OfferAcceptedEmailProps {
	offer_number: string;
	customer_name?: string;
	offer_id: string;
	status: string;
}

// Main email component
function OfferAcceptedEmailComponent(props: OfferAcceptedEmailProps) {
	const { offer_number, customer_name } = props;

	return (
		<EmailWrapper headerVariant="success">
			<EmailTitle>✅ Angebot angenommen - Bestätigung</EmailTitle>

			<EmailText>
				{customer_name
					? `Liebe/r ${customer_name},`
					: 'Sehr geehrte Damen und Herren,'}
			</EmailText>

			<EmailText>
				vielen Dank für die Annahme unseres Angebots{' '}
				<strong>{offer_number}</strong>! Wir freuen uns sehr auf die
				Zusammenarbeit mit Ihnen.
			</EmailText>

			<EmailText>
				Mit dieser E-Mail bestätigen wir die Annahme Ihres Auftrags. Das
				aktualisierte Angebot finden Sie als PDF-Datei im Anhang.
			</EmailText>

			<EmailInfoBox title="✅ Angebot angenommen" variant="success">
				<p style={{ margin: '8px 0', textAlign: 'center' }}>
					<strong>Angebotsnummer:</strong> {offer_number}
				</p>
				<p style={{ margin: '8px 0', textAlign: 'center' }}>
					<strong>Status:</strong> Angenommen
				</p>
			</EmailInfoBox>

			<EmailText>
				<strong>Nächste Schritte:</strong>
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
				<li>Wir werden nun mit der Bearbeitung Ihres Auftrags beginnen</li>
				<li>Sie erhalten in Kürze weitere Informationen zum Projektablauf</li>
				<li>Bei Fragen stehen wir Ihnen jederzeit zur Verfügung</li>
			</ul>
		</EmailWrapper>
	);
}

// Export for Resend service
export const offerAcceptedEmail = (props: OfferAcceptedEmailProps) => (
	<OfferAcceptedEmailComponent {...props} />
);

// Mock data for preview/development
const mockData: OfferAcceptedEmailProps = {
	offer_number: 'ANG-2024-001',
	customer_name: 'Max Mustermann',
	offer_id: 'offer_123456',
	status: 'accepted',
};

// Default export for React Email preview
export default () => <OfferAcceptedEmailComponent {...mockData} />;
