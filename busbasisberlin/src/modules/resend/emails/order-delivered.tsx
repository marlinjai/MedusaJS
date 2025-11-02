/**
 * order-delivered.tsx
 * Email template for when an order is delivered
 */

import {
	EmailWrapper,
	EmailTitle,
	EmailText,
	EmailInfoBox,
} from '../utils/email-wrapper';

interface OrderDeliveredEmailProps {
	order_display_id: string;
	customer_name?: string;
	customer_email: string;
	delivery_date?: string;
}

// Main email component
function OrderDeliveredEmailComponent(props: OrderDeliveredEmailProps) {
	const { order_display_id, customer_name, delivery_date } = props;

	return (
		<EmailWrapper headerVariant="success">
			<EmailTitle>✅ Ihre Bestellung wurde zugestellt!</EmailTitle>

			<EmailText>
				{customer_name
					? `Liebe/r ${customer_name},`
					: 'Sehr geehrte Damen und Herren,'}
			</EmailText>

			<EmailText>
				wir freuen uns, Ihnen mitteilen zu können, dass Ihre Bestellung{' '}
				<strong>#{order_display_id}</strong> erfolgreich zugestellt wurde!
			</EmailText>

			<EmailInfoBox title="🎉 Zustellung erfolgreich" variant="success">
				<p style={{ margin: '8px 0', textAlign: 'center' }}>
					<strong>Bestellnummer:</strong> #{order_display_id}
				</p>
				{delivery_date && (
					<p style={{ margin: '8px 0', textAlign: 'center' }}>
						<strong>Zugestellt am:</strong> {delivery_date}
					</p>
				)}
			</EmailInfoBox>

			<EmailText>
				Wir hoffen, dass Sie mit Ihrer Bestellung zufrieden sind!
			</EmailText>

			<EmailText>
				<strong>Haben Sie Fragen oder Anliegen?</strong>
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
				<li>Kontaktieren Sie uns bei Problemen mit der Bestellung</li>
				<li>Ihr Feedback ist uns wichtig</li>
				<li>Wir sind jederzeit für Sie erreichbar</li>
			</ul>

			<div
				style={{
					marginTop: '30px',
					padding: '20px',
					backgroundColor: '#f8f9fa',
					borderRadius: '5px',
					textAlign: 'center',
				}}
			>
				<p
					style={{
						fontSize: '15px',
						color: '#666',
						margin: '0',
						fontStyle: 'italic',
					}}
				>
					💙 Vielen Dank für Ihr Vertrauen. Wir freuen uns auf Ihren nächsten
					Besuch!
				</p>
			</div>
		</EmailWrapper>
	);
}

// Export for Resend service
export const orderDeliveredEmail = (props: OrderDeliveredEmailProps) => (
	<OrderDeliveredEmailComponent {...props} />
);

// Mock data for preview/development
const mockData: OrderDeliveredEmailProps = {
	order_display_id: '1001',
	customer_name: 'Max Mustermann',
	customer_email: 'max@example.com',
	delivery_date: '12. November 2024, 14:30 Uhr',
};

// Default export for React Email preview
export default () => <OrderDeliveredEmailComponent {...mockData} />;
