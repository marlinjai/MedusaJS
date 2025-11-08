/**
 * offer-active.tsx
 * Email template for when an offer becomes active (ready to send to customer)
 */

import {
	EmailInfoBox,
	EmailText,
	EmailTitle,
	EmailWrapper,
} from '../utils/email-wrapper';

interface OfferActiveEmailProps {
	offer_number: string;
	customer_name?: string;
	customer_email?: string;
	offer_id: string;
	status: string;
	acceptance_url?: string; // URL for accepting the offer
}

// Main email component
function OfferActiveEmailComponent(props: OfferActiveEmailProps) {
	const { offer_number, customer_name, acceptance_url } = props;

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

			{/* Acceptance Button */}
			{acceptance_url && (
				<div style={{ margin: '32px 0', textAlign: 'center' }}>
					<a
						href={acceptance_url}
						style={{
							display: 'inline-block',
							padding: '16px 32px',
							backgroundColor: '#0066cc',
							color: '#ffffff',
							textDecoration: 'none',
							borderRadius: '6px',
							fontWeight: 'bold',
							fontSize: '16px',
						}}
					>
						✅ Angebot annehmen
					</a>
				</div>
			)}

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

			{acceptance_url && (
				<p style={{ fontSize: '12px', color: '#666666', marginBottom: '15px' }}>
					Sie können das Angebot auch direkt über den obigen Button annehmen.
					Alternativ können Sie uns auch telefonisch oder per E-Mail
					kontaktieren.
				</p>
			)}
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
	customer_email: 'max.mustermann@example.com',
	offer_id: 'offer_123456',
	status: 'active',
	acceptance_url:
		'https://basiscamp-berlin.de/de/offers/offer_123456/accept?token=mocktoken&email=max.mustermann@example.com',
};

// Default export for React Email preview
export default () => <OfferActiveEmailComponent {...mockData} />;
