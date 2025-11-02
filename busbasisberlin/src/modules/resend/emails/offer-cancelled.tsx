/**
 * offer-cancelled.tsx
 * Email template for when an offer is cancelled
 */

import {
	EmailWrapper,
	EmailTitle,
	EmailText,
	EmailInfoBox,
} from '../utils/email-wrapper';

interface OfferCancelledEmailProps {
	offer_number: string;
	customer_name?: string;
	offer_id: string;
	status: string;
}

// Main email component
function OfferCancelledEmailComponent(props: OfferCancelledEmailProps) {
	const { offer_number, customer_name } = props;

	return (
		<EmailWrapper headerVariant="danger">
			<EmailTitle>❌ Angebot storniert</EmailTitle>

			<EmailText>
				{customer_name
					? `Liebe/r ${customer_name},`
					: 'Sehr geehrte Damen und Herren,'}
			</EmailText>

			<EmailText>
				hiermit bestätigen wir die Stornierung des Angebots{' '}
				<strong>{offer_number}</strong>.
			</EmailText>

			<EmailText>
				Das stornierte Angebot finden Sie zur Dokumentation als PDF-Datei im
				Anhang dieser E-Mail.
			</EmailText>

			<EmailInfoBox title="❌ Angebot storniert" variant="danger">
				<p style={{ margin: '8px 0', textAlign: 'center' }}>
					<strong>Angebotsnummer:</strong> {offer_number}
				</p>
				<p style={{ margin: '8px 0', textAlign: 'center' }}>
					<strong>Status:</strong> Storniert
				</p>
			</EmailInfoBox>

			<EmailText>
				<strong>Wichtige Hinweise:</strong>
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
				<li>Alle Reservierungen wurden automatisch freigegeben</li>
				<li>Es entstehen Ihnen keine Kosten durch diese Stornierung</li>
				<li>Das Angebot kann nicht mehr aktiviert werden</li>
			</ul>

			<EmailText>
				Falls Sie zu einem späteren Zeitpunkt Interesse an unseren Leistungen
				haben, erstellen wir gerne ein neues Angebot für Sie.
			</EmailText>
		</EmailWrapper>
	);
}

// Export for Resend service
export const offerCancelledEmail = (props: OfferCancelledEmailProps) => (
	<OfferCancelledEmailComponent {...props} />
);

// Mock data for preview/development
const mockData: OfferCancelledEmailProps = {
	offer_number: 'ANG-2024-001',
	customer_name: 'Max Mustermann',
	offer_id: 'offer_123456',
	status: 'cancelled',
};

// Default export for React Email preview
export default () => <OfferCancelledEmailComponent {...mockData} />;
