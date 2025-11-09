/**
 * quote-request.tsx
 * Email template for shipping quote requests (Sperrgut)
 */

import {
	EmailInfoBox,
	EmailText,
	EmailTitle,
	EmailWrapper,
} from '../utils/email-wrapper';

interface QuoteRequestEmailProps {
	product_title: string;
	product_id: string;
	product_handle?: string;
	variant_id?: string;
	customer_name: string;
	customer_email: string;
	customer_phone?: string;
	customer_address?: string;
	customer_city?: string;
	customer_postal_code?: string;
	customer_message?: string;
}

// Main email component
function QuoteRequestEmailComponent(props: QuoteRequestEmailProps) {
	const {
		product_title,
		product_id,
		product_handle,
		variant_id,
		customer_name,
		customer_email,
		customer_phone,
		customer_address,
		customer_city,
		customer_postal_code,
		customer_message,
	} = props;

	return (
		<EmailWrapper headerVariant="primary">
			<EmailTitle>📦 Neue Versandkosten-Anfrage (Sperrgut)</EmailTitle>

			<EmailText>
				Es wurde eine neue Anfrage für Versandkosten für ein Sperrgut-Produkt
				eingegangen.
			</EmailText>

			<EmailInfoBox title="📋 Produktinformationen" variant="info">
				<p style={{ margin: '8px 0' }}>
					<strong>Produkt:</strong> {product_title}
				</p>
				<p style={{ margin: '8px 0' }}>
					<strong>Produkt-ID:</strong> {product_id}
				</p>
				{product_handle && (
					<p style={{ margin: '8px 0' }}>
						<strong>Handle:</strong> {product_handle}
					</p>
				)}
				{variant_id && (
					<p style={{ margin: '8px 0' }}>
						<strong>Variante-ID:</strong> {variant_id}
					</p>
				)}
			</EmailInfoBox>

			<EmailInfoBox title="👤 Kundeninformationen" variant="info">
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
				{(customer_address || customer_city || customer_postal_code) && (
					<p style={{ margin: '8px 0' }}>
						<strong>Lieferadresse:</strong>{' '}
						{customer_address && `${customer_address}, `}
						{customer_postal_code && `${customer_postal_code} `}
						{customer_city}
					</p>
				)}
			</EmailInfoBox>

			{customer_message && (
				<EmailInfoBox title="💬 Nachricht vom Kunden" variant="info">
					<p style={{ margin: '8px 0', whiteSpace: 'pre-wrap' }}>
						{customer_message}
					</p>
				</EmailInfoBox>
			)}

			<EmailText>
				Bitte berechnen Sie die Versandkosten für dieses Sperrgut-Produkt und
				kontaktieren Sie den Kunden zeitnah mit einem Versandangebot.
			</EmailText>
		</EmailWrapper>
	);
}

// Export for Resend service
export const quoteRequestEmail = (props: QuoteRequestEmailProps) => (
	<QuoteRequestEmailComponent {...props} />
);

// Mock data for preview/development
const mockData: QuoteRequestEmailProps = {
	product_title: 'Beispiel Sperrgut',
	product_id: 'prod_123456',
	product_handle: 'beispiel-sperrgut',
	variant_id: 'variant_123456',
	customer_name: 'Max Mustermann',
	customer_email: 'max.mustermann@example.com',
	customer_phone: '+49 30 12345678',
	customer_address: 'Musterstraße 123',
	customer_city: 'Berlin',
	customer_postal_code: '10115',
	customer_message:
		'Ich benötige dieses Produkt dringend. Können Sie mir bitte die Versandkosten mitteilen?',
};

// Default export for React Email preview
export default () => <QuoteRequestEmailComponent {...mockData} />;
