/**
 * contact-form.tsx
 * Email template for contact form submissions
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

interface ContactFormEmailProps {
	customer_name: string;
	customer_email: string;
	customer_phone?: string;
	customer_message: string;
}

// Main email component using React Email components
function ContactFormEmailComponent(props: ContactFormEmailProps) {
	const { customer_name, customer_email, customer_phone, customer_message } =
		props;

	return (
		<Html>
			<Body
				style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#ffffff' }}
			>
				<Container
					style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}
				>
					<Heading
						style={{ color: '#333', fontSize: '20px', marginBottom: '20px' }}
					>
						Neue Kontaktanfrage
					</Heading>

					<Text
						style={{
							fontSize: '14px',
							lineHeight: '1.6',
							color: '#333',
							marginBottom: '20px',
						}}
					>
						Es wurde eine neue Kontaktanfrage über das Kontaktformular
						eingegangen.
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
							Kontaktinformationen
						</Heading>
						<Text style={{ margin: '8px 0', fontSize: '14px', color: '#333' }}>
							<strong>Name:</strong> {customer_name}
						</Text>
						<Text style={{ margin: '8px 0', fontSize: '14px', color: '#333' }}>
							<strong>E-Mail:</strong> {customer_email}
						</Text>
						{customer_phone && (
							<Text
								style={{ margin: '8px 0', fontSize: '14px', color: '#333' }}
							>
								<strong>Telefon:</strong> {customer_phone}
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
							Nachricht
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

					<Text style={{ fontSize: '14px', lineHeight: '1.6', color: '#333' }}>
						Bitte antworten Sie dem Kunden zeitnah auf seine Anfrage.
					</Text>
				</Container>
			</Body>
		</Html>
	);
}

// Export for Resend service
export const contactFormEmail = (props: ContactFormEmailProps) => (
	<ContactFormEmailComponent {...props} />
);

// Mock data for preview/development
const mockData: ContactFormEmailProps = {
	customer_name: 'Max Mustermann',
	customer_email: 'max.mustermann@example.com',
	customer_phone: '+49 30 12345678',
	customer_message:
		'Hallo,\n\nich interessiere mich für Ihre Dienstleistungen und würde gerne mehr Informationen erhalten.\n\nVielen Dank!\n\nMax Mustermann',
};

// Default export for React Email preview
export default () => <ContactFormEmailComponent {...mockData} />;
