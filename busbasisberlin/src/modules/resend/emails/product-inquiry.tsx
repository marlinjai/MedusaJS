/**
 * product-inquiry.tsx
 * Email template for product inquiry requests (Artikel auf Anfrage)
 */

import {
	EmailWrapper,
	EmailTitle,
	EmailText,
	EmailInfoBox,
} from '../utils/email-wrapper';

interface ProductInquiryEmailProps {
	product_title: string;
	product_id: string;
	product_handle?: string;
	customer_name: string;
	customer_email: string;
	customer_phone?: string;
	customer_address?: string;
	customer_city?: string;
	customer_postal_code?: string;
	customer_message?: string;
}

// Main email component
function ProductInquiryEmailComponent(props: ProductInquiryEmailProps) {
	const {
		product_title,
		product_id,
		product_handle,
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
			<EmailTitle>📦 Neue Anfrage für ein Artikel</EmailTitle>

			<EmailText>
				Es wurde eine neue Anfrage für einen Artikel auf Anfrage eingegangen.
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
			</EmailInfoBox>

			<EmailInfoBox title="👤 Kundeninformationen" variant="info">
				<p style={{ margin: '8px 0' }}>
					<strong>Name:</strong> {customer_name}
				</p>
				<p style={{ margin: '8px 0' }}>
					<strong>E-Mail:</strong>{' '}
					<a
						href={`mailto:${customer_email}`}
						style={{ color: '#0066cc', textDecoration: 'none' }}
					>
						{customer_email}
					</a>
				</p>
				{customer_phone && (
					<p style={{ margin: '8px 0' }}>
						<strong>Telefon:</strong>{' '}
						<a
							href={`tel:${customer_phone}`}
							style={{ color: '#0066cc', textDecoration: 'none' }}
						>
							{customer_phone}
						</a>
					</p>
				)}
				{(customer_address || customer_city || customer_postal_code) && (
					<p style={{ margin: '8px 0' }}>
						<strong>Adresse:</strong>{' '}
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
				Bitte kontaktieren Sie den Kunden zeitnah, um weitere Details zu
				besprechen und ein individuelles Angebot zu erstellen.
			</EmailText>
		</EmailWrapper>
	);
}

// Export for Resend service
export const productInquiryEmail = (props: ProductInquiryEmailProps) => (
	<ProductInquiryEmailComponent {...props} />
);

// Mock data for preview/development
const mockData: ProductInquiryEmailProps = {
	product_title: 'Beispielprodukt',
	product_id: 'prod_123456',
	product_handle: 'beispielprodukt',
	customer_name: 'Max Mustermann',
	customer_email: 'max.mustermann@example.com',
	customer_phone: '+49 30 12345678',
	customer_address: 'Musterstraße 123',
	customer_city: 'Berlin',
	customer_postal_code: '10115',
	customer_message: 'Ich interessiere mich für dieses Produkt und benötige weitere Informationen.',
};

// Default export for React Email preview
export default () => <ProductInquiryEmailComponent {...mockData} />;

