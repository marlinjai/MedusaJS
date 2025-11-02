/**
 * order-cancelled.tsx
 * Email template for when an order is cancelled
 */

import {
	EmailWrapper,
	EmailTitle,
	EmailText,
	EmailInfoBox,
} from '../utils/email-wrapper';

interface OrderCancelledEmailProps {
	order_display_id: string;
	customer_name?: string;
	customer_email: string;
	cancellation_reason?: string;
	refund_amount?: string;
	refund_method?: string;
}

// Main email component
function OrderCancelledEmailComponent(props: OrderCancelledEmailProps) {
	const {
		order_display_id,
		customer_name,
		cancellation_reason,
		refund_amount,
		refund_method,
	} = props;

	return (
		<EmailWrapper headerVariant="danger">
			<EmailTitle>❌ Bestellung storniert</EmailTitle>

			<EmailText>
				{customer_name
					? `Liebe/r ${customer_name},`
					: 'Sehr geehrte Damen und Herren,'}
			</EmailText>

			<EmailText>
				hiermit bestätigen wir die Stornierung Ihrer Bestellung{' '}
				<strong>#{order_display_id}</strong>.
			</EmailText>

			<EmailInfoBox title="❌ Stornierungsdetails" variant="danger">
				<p style={{ margin: '8px 0' }}>
					<strong>Bestellnummer:</strong> #{order_display_id}
				</p>
				{cancellation_reason && (
					<p style={{ margin: '8px 0' }}>
						<strong>Grund:</strong> {cancellation_reason}
					</p>
				)}
				<p style={{ margin: '8px 0' }}>
					<strong>Status:</strong> Storniert
				</p>
			</EmailInfoBox>

			{refund_amount && (
				<EmailInfoBox title="💰 Rückerstattung" variant="warning">
					<p style={{ margin: '8px 0' }}>
						<strong>Betrag:</strong> {refund_amount}
					</p>
					{refund_method && (
						<p style={{ margin: '8px 0' }}>
							<strong>Methode:</strong> {refund_method}
						</p>
					)}
					<p style={{ margin: '8px 0' }}>
						Die Rückerstattung wird innerhalb von 5-10 Werktagen auf Ihrem Konto
						gutgeschrieben.
					</p>
				</EmailInfoBox>
			)}

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
				<li>Alle Reservierungen wurden freigegeben</li>
				<li>Sie haben keine weiteren Verpflichtungen aus dieser Bestellung</li>
				<li>Eine neue Bestellung kann jederzeit aufgegeben werden</li>
			</ul>

			<EmailText>
				Falls Sie Fragen zur Stornierung haben oder erneut bestellen möchten,
				stehen wir Ihnen gerne zur Verfügung.
			</EmailText>
		</EmailWrapper>
	);
}

// Export for Resend service
export const orderCancelledEmail = (props: OrderCancelledEmailProps) => (
	<OrderCancelledEmailComponent {...props} />
);

// Mock data for preview/development
const mockData: OrderCancelledEmailProps = {
	order_display_id: '1001',
	customer_name: 'Max Mustermann',
	customer_email: 'max@example.com',
	cancellation_reason: 'Auf Kundenwunsch',
	refund_amount: '€ 149,99',
	refund_method: 'Rückerstattung auf ursprüngliche Zahlungsmethode',
};

// Default export for React Email preview
export default () => <OrderCancelledEmailComponent {...mockData} />;

