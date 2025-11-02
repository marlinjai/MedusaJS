/**
 * offer-completed.tsx
 * Email template for when an offer is completed/fulfilled
 */

import {
	EmailWrapper,
	EmailTitle,
	EmailText,
	EmailInfoBox,
} from '../utils/email-wrapper';

interface OfferCompletedEmailProps {
	offer_number: string;
	customer_name?: string;
	offer_id: string;
	status: string;
}

// Main email component
function OfferCompletedEmailComponent(props: OfferCompletedEmailProps) {
	const { offer_number, customer_name } = props;

	return (
		<EmailWrapper headerVariant="primary">
			<EmailTitle>🎉 Angebot erfolgreich abgeschlossen</EmailTitle>

			<EmailText>
				{customer_name
					? `Liebe/r ${customer_name},`
					: 'Sehr geehrte Damen und Herren,'}
			</EmailText>

			<EmailText>
				wir freuen uns, Ihnen mitteilen zu können, dass Ihr Auftrag{' '}
				<strong>{offer_number}</strong> erfolgreich abgeschlossen wurde.
			</EmailText>

			<EmailText>
				Alle vereinbarten Leistungen wurden erbracht. Das finale Angebot mit
				allen Details finden Sie als PDF-Datei im Anhang dieser E-Mail.
			</EmailText>

			<EmailInfoBox title="🎉 Projekt abgeschlossen" variant="success">
				<p style={{ margin: '8px 0', textAlign: 'center' }}>
					<strong>Angebotsnummer:</strong> {offer_number}
				</p>
				<p style={{ margin: '8px 0', textAlign: 'center' }}>
					<strong>Status:</strong> Abgeschlossen
				</p>
			</EmailInfoBox>

			<EmailText>
				<strong>Was passiert als nächstes:</strong>
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
				<li>
					Sie erhalten zeitnah die finale Rechnung für die erbrachten Leistungen
				</li>
				<li>
					Alle Projektunterlagen wurden entsprechend Ihrer Vereinbarung
					übermittelt
				</li>
				<li>Unser Support steht Ihnen auch weiterhin zur Verfügung</li>
			</ul>

			<EmailText>
				Wir bedanken uns für Ihr Vertrauen und die angenehme Zusammenarbeit.
				Gerne sind wir auch in Zukunft Ihr Partner für weitere Projekte.
			</EmailText>
		</EmailWrapper>
	);
}

// Export for Resend service
export const offerCompletedEmail = (props: OfferCompletedEmailProps) => (
	<OfferCompletedEmailComponent {...props} />
);

// Mock data for preview/development
const mockData: OfferCompletedEmailProps = {
	offer_number: 'ANG-2024-001',
	customer_name: 'Max Mustermann',
	offer_id: 'offer_123456',
	status: 'completed',
};

// Default export for React Email preview
export default () => <OfferCompletedEmailComponent {...mockData} />;
