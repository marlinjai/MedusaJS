import { getBaseURL } from '@lib/util/env';
import { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { StoreSettingsProvider } from '@lib/context/store-settings-context';
import '../styles/globals.css';

// Import German translations directly
import messages from '../../messages/de.json';

export const metadata: Metadata = {
	metadataBase: new URL(getBaseURL()),
	icons: {
		icon: [
			{ url: '/favicon.ico', sizes: 'any' },
			{ url: '/bbb_fav.png', type: 'image/png' },
		],
		shortcut: '/bbb_fav.png',
		apple: '/bbb_fav.png',
	},
};

// Organization/LocalBusiness JSON-LD Schema for Google Knowledge Panel
const organizationJsonLd = {
	'@context': 'https://schema.org',
	'@type': 'LocalBusiness',
	'@id': 'https://basiscampberlin.de',
	name: 'BasisCamp Berlin GmbH',
	alternateName: 'BasisCampBerlin',
	description:
		'Ihr Spezialist für Mercedes-Transporter, Wohnmobile und Expeditionsfahrzeuge. Professionelle Wartung, Reparatur und individuelle Umbauten.',
	url: 'https://basiscampberlin.de',
	logo: 'https://basiscampberlin.de/bbb_fav.png',
	image: 'https://basiscampberlin.de/logo-with-font.png',
	telephone: '+49 3303 5365540',
	email: 'info@basiscampberlin.de',
	address: {
		'@type': 'PostalAddress',
		streetAddress: 'Hauptstraße 51',
		addressLocality: 'Birkenwerder',
		postalCode: '16547',
		addressCountry: 'DE',
	},
	geo: {
		'@type': 'GeoCoordinates',
		latitude: 52.6967,
		longitude: 13.2833,
	},
	openingHoursSpecification: [
		{
			'@type': 'OpeningHoursSpecification',
			dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
			opens: '08:00',
			closes: '16:00',
		},
	],
	priceRange: '€€',
	paymentAccepted: 'Cash, Credit Card, Bank Transfer',
	sameAs: [],
};

export default function RootLayout(props: { children: React.ReactNode }) {
	return (
		<html lang="de" data-mode="dark" className="dark overflow-x-hidden">
			<head>
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
				/>
			</head>
			<body className="overflow-x-hidden">
				<NextIntlClientProvider locale="de" messages={messages}>
					<StoreSettingsProvider>
						<main className="relative overflow-x-hidden">{props.children}</main>
					</StoreSettingsProvider>
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
