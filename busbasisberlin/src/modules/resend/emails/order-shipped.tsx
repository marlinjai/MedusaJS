/**
 * order-shipped.tsx
 * Email template for when an order is shipped
 */

import {
	EmailWrapper,
	EmailTitle,
	EmailText,
	EmailButton,
	EmailInfoBox,
} from '../utils/email-wrapper';

interface OrderShippedEmailProps {
	order_display_id: string;
	customer_name?: string;
	customer_email: string;
	tracking_number?: string;
	tracking_url?: string;
	carrier?: string;
	estimated_delivery?: string;
}

// Main email component
function OrderShippedEmailComponent(props: OrderShippedEmailProps) {
	const {
		order_display_id,
		customer_name,
		tracking_number,
		tracking_url,
		carrier,
		estimated_delivery,
	} = props;

	return (
		<EmailWrapper headerVariant="primary">
			<EmailTitle>📦 Ihre Bestellung wurde versandt!</EmailTitle>

			<EmailText>
				{customer_name
					? `Liebe/r ${customer_name},`
					: 'Sehr geehrte Damen und Herren,'}
			</EmailText>

			<EmailText>
				gute Nachrichten! Ihre Bestellung <strong>#{order_display_id}</strong>{' '}
				wurde soeben versandt und ist auf dem Weg zu Ihnen.
			</EmailText>

			<EmailInfoBox title="📋 Versandinformationen" variant="info">
				<p style={{ margin: '8px 0' }}>
					<strong>Bestellnummer:</strong> #{order_display_id}
				</p>
				{carrier && (
					<p style={{ margin: '8px 0' }}>
						<strong>Versanddienstleister:</strong> {carrier}
					</p>
				)}
				{tracking_number && (
					<p style={{ margin: '8px 0' }}>
						<strong>Sendungsnummer:</strong> {tracking_number}
					</p>
				)}
				{estimated_delivery && (
					<p style={{ margin: '8px 0' }}>
						<strong>Voraussichtliche Lieferung:</strong> {estimated_delivery}
					</p>
				)}
			</EmailInfoBox>

			{tracking_url && (
				<EmailButton href={tracking_url}>📍 Sendung verfolgen</EmailButton>
			)}

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
					Sie erhalten eine Benachrichtigung, sobald das Paket zugestellt wurde
				</li>
				<li>
					Mit der Sendungsnummer können Sie den aktuellen Status jederzeit
					verfolgen
				</li>
				<li>Bei Fragen zur Lieferung stehen wir Ihnen gerne zur Verfügung</li>
			</ul>
		</EmailWrapper>
	);
}

// Export for Resend service
export const orderShippedEmail = (props: OrderShippedEmailProps) => (
	<OrderShippedEmailComponent {...props} />
);

// Mock data for preview/development
const mockData: OrderShippedEmailProps = {
	order_display_id: '1001',
	customer_name: 'Max Mustermann',
	customer_email: 'max@example.com',
	tracking_number: 'DHL1234567890',
	tracking_url: 'https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=DHL1234567890',
	carrier: 'DHL',
	estimated_delivery: '15. November 2024',
};

// Default export for React Email preview
export default () => <OrderShippedEmailComponent {...mockData} />;

