import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Html,
	Link,
	Preview,
	Section,
	Tailwind,
	Text,
} from '@react-email/components';

type PasswordResetEmailProps = {
	url: string;
	email?: string;
};

function PasswordResetEmailComponent({ url, email }: PasswordResetEmailProps) {
	// Extrahiere den Namen der Website aus der URL
	const websiteName = 'BusBasis Berlin';

	return (
		<Tailwind>
			<Html className="font-sans bg-gray-100">
				<Head />
				<Preview>Passwort für {websiteName} zurücksetzen</Preview>
				<Body className="bg-white my-10 mx-auto w-full max-w-2xl border border-gray-200 rounded-lg shadow-sm">
					{/* Header */}
					<Section className="bg-[#1e40af] text-white px-6 py-8 rounded-t-lg">
						<Container className="text-center">
							<Heading className="text-2xl font-bold m-0 text-white">
								{websiteName}
							</Heading>
							<Text className="text-blue-100 mt-2 m-0 text-sm">
								Professionelle Mercedes-Transporter Service
							</Text>
						</Container>
					</Section>

					{/* Main Content */}
					<Container className="p-8">
						<Heading className="text-2xl font-bold text-gray-800 text-center mb-6">
							Passwort zurücksetzen
						</Heading>

						<Text className="text-gray-600 text-base leading-relaxed mb-6">
							Hallo{email ? ` ${email}` : ''},
						</Text>

						<Text className="text-gray-600 text-base leading-relaxed mb-6">
							Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts für Ihr{' '}
							{websiteName} Konto gestellt. Klicken Sie auf den Button unten, um
							ein neues Passwort zu erstellen.
						</Text>

						{/* Call-to-Action Button */}
						<Section className="text-center my-8">
							<Button
								href={url}
								className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-lg text-base transition-colors duration-200 no-underline"
							>
								Neues Passwort erstellen
							</Button>
						</Section>

						<Text className="text-gray-600 text-base leading-relaxed mb-4">
							Falls der Button nicht funktioniert, können Sie auch diesen Link
							kopieren und in Ihren Browser einfügen:
						</Text>

						<Section className="bg-gray-50 p-4 rounded-md mb-6">
							<Link
								href={url}
								className="text-blue-600 text-sm break-all hover:text-blue-800"
							>
								{url}
							</Link>
						</Section>

						{/* Security Notice */}
						<Section className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
							<Text className="text-amber-800 text-sm m-0 font-semibold mb-2">
								🔒 Sicherheitshinweis
							</Text>
							<Text className="text-amber-700 text-sm m-0 leading-relaxed">
								Aus Sicherheitsgründen ist dieser Link nur 24 Stunden gültig.
								Falls Sie diese Anfrage nicht gestellt haben, können Sie diese
								E-Mail ignorieren.
							</Text>
						</Section>

						<Text className="text-gray-600 text-base leading-relaxed mb-2">
							Bei Fragen können Sie uns gerne kontaktieren:
						</Text>

						<Text className="text-gray-600 text-sm">
							📧 E-Mail: support@busbasisberlin.de
							<br />
							📞 Telefon: +49 (0) 30 123456789
							<br />
							🌐 Website: www.busbasisberlin.de
						</Text>
					</Container>

					{/* Footer */}
					<Section className="bg-gray-50 px-8 py-6 text-center border-t border-gray-200 rounded-b-lg">
						<Text className="text-gray-500 text-sm m-0 mb-2">
							Diese E-Mail wurde automatisch generiert. Bitte antworten Sie
							nicht auf diese Nachricht.
						</Text>
						<Text className="text-gray-400 text-xs m-0">
							© {new Date().getFullYear()} {websiteName}. Alle Rechte
							vorbehalten.
						</Text>
					</Section>
				</Body>
			</Html>
		</Tailwind>
	);
}

// Mock für Development/Testing
const mockResetData = {
	url: 'https://busbasisberlin.de/reset-password?token=sample-token&email=test@busbasisberlin.de',
	email: 'test@busbasisberlin.de',
};

// @ts-ignore
export default () => <PasswordResetEmailComponent {...mockResetData} />;

// Export für den Service
export const passwordResetEmail = (props: PasswordResetEmailProps) => (
	<PasswordResetEmailComponent {...props} />
);
