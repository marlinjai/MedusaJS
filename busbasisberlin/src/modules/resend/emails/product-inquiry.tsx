/**
 * product-inquiry.tsx
 * Email template for product inquiry requests (Artikel auf Anfrage)
 * Uses React Email components to ensure proper email client compatibility
 */

import {
	Body,
	Container,
	Heading,
	Html,
	Section,
	Text,
} from '@react-email/components';

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

// Main email component using React Email components
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
		<Html>
			<Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#ffffff' }}>
				<Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
					<Heading style={{ color: '#333', fontSize: '20px', marginBottom: '20px' }}>
						Neue Anfrage für ein Artikel
					</Heading>

					<Text
						style={{
							fontSize: '14px',
							lineHeight: '1.6',
							color: '#333',
							marginBottom: '20px',
						}}
					>
						Es wurde eine neue Anfrage für einen Artikel auf Anfrage eingegangen.
					</Text>

					<Section
						style={{
							backgroundColor: '#f5f5f5',
							border: '1px solid #ddd',
							borderRadius: '4px',
							padding: '15px',
							marginBottom: '20px',
						}}
					>
						<Heading
							as="h3"
							style={{
								fontSize: '16px',
								marginTop: '0',
								marginBottom: '15px',
								color: '#333',
							}}
						>
							Produktinformationen
						</Heading>
						<Text style={{ margin: '8px 0', fontSize: '14px', color: '#333' }}>
							<strong>Produkt:</strong> {product_title}
						</Text>
						<Text style={{ margin: '8px 0', fontSize: '14px', color: '#333' }}>
							<strong>Produkt-ID:</strong> {product_id}
						</Text>
						{product_handle && (
							<Text style={{ margin: '8px 0', fontSize: '14px', color: '#333' }}>
								<strong>Handle:</strong> {product_handle}
							</Text>
						)}
					</Section>

					<Section
						style={{
							backgroundColor: '#f5f5f5',
							border: '1px solid #ddd',
							borderRadius: '4px',
							padding: '15px',
							marginBottom: '20px',
						}}
					>
						<Heading
							as="h3"
							style={{
								fontSize: '16px',
								marginTop: '0',
								marginBottom: '15px',
								color: '#333',
							}}
						>
							Kundeninformationen
						</Heading>
						<Text style={{ margin: '8px 0', fontSize: '14px', color: '#333' }}>
							<strong>Name:</strong> {customer_name}
						</Text>
						<Text style={{ margin: '8px 0', fontSize: '14px', color: '#333' }}>
							<strong>E-Mail:</strong> {customer_email}
						</Text>
						{customer_phone && (
							<Text style={{ margin: '8px 0', fontSize: '14px', color: '#333' }}>
								<strong>Telefon:</strong> {customer_phone}
							</Text>
						)}
						{(customer_address || customer_city || customer_postal_code) && (
							<Text style={{ margin: '8px 0', fontSize: '14px', color: '#333' }}>
								<strong>Adresse:</strong>{' '}
								{customer_address && `${customer_address}, `}
								{customer_postal_code && `${customer_postal_code} `}
								{customer_city}
							</Text>
						)}
					</Section>

					{customer_message && (
						<Section
							style={{
								backgroundColor: '#f5f5f5',
								border: '1px solid #ddd',
								borderRadius: '4px',
								padding: '15px',
								marginBottom: '20px',
							}}
						>
							<Heading
								as="h3"
								style={{
									fontSize: '16px',
									marginTop: '0',
									marginBottom: '15px',
									color: '#333',
								}}
							>
								Nachricht vom Kunden
							</Heading>
							<Text
								style={{
									margin: '8px 0',
									fontSize: '14px',
									color: '#333',
									whiteSpace: 'pre-wrap',
								}}
							>
								{customer_message}
							</Text>
						</Section>
					)}

					<Text style={{ fontSize: '14px', lineHeight: '1.6', color: '#333' }}>
						Bitte kontaktieren Sie den Kunden zeitnah, um weitere Details zu besprechen und ein individuelles Angebot zu erstellen.
					</Text>
				</Container>
			</Body>
		</Html>
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

