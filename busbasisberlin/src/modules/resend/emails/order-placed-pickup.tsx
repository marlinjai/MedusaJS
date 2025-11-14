// busbasisberlin/src/modules/resend/emails/order-placed-pickup.tsx
// Email template for orders with pickup shipping and manual payment

import {
	BigNumberValue,
	CustomerDTO,
	OrderDTO,
} from '@medusajs/framework/types';
import {
	Body,
	Column,
	Container,
	Head,
	Heading,
	Html,
	Img,
	Link,
	Preview,
	Row,
	Section,
	Tailwind,
	Text,
} from '@react-email/components';
import { getCompanyInfo } from '../utils/company-info';

type OrderPlacedPickupEmailProps = {
	order: OrderDTO & {
		customer: CustomerDTO;
	};
	email_banner?: {
		body: string;
		title: string;
		url: string;
	};
};

function OrderPlacedPickupEmailComponent({
	order,
	email_banner,
}: OrderPlacedPickupEmailProps) {
	const company = getCompanyInfo();
	const shouldDisplayBanner = email_banner && 'title' in email_banner;

	const formatter = new Intl.NumberFormat('de-DE', {
		style: 'currency',
		currencyDisplay: 'narrowSymbol',
		currency: order.currency_code,
	});

	const formatPrice = (price: BigNumberValue) => {
		if (typeof price === 'number') {
			return formatter.format(price);
		}

		if (typeof price === 'string') {
			return formatter.format(parseFloat(price));
		}

		return price?.toString() || '';
	};

	return (
		<Tailwind>
			<Html className="font-sans bg-gray-100">
				<Head />
				<Preview>Bestellbestätigung - Abholung am Lager bei {company.name}</Preview>
				<Body className="bg-white my-10 mx-auto w-full max-w-2xl">
					{/* Header with Logo */}
					<Section
						className="text-white px-6 py-6 text-center"
						style={{ backgroundColor: company.primaryColor }}
					>
						{company.logoUrl ? (
							<Img
								src={company.logoUrl}
								alt={company.name}
								className="mx-auto"
								style={{ maxHeight: '60px', maxWidth: '250px' }}
							/>
						) : (
							<Heading className="text-2xl font-bold m-0 text-white">
								{company.name}
							</Heading>
						)}
					</Section>

					{/* Thank You Message - Customized for Pickup */}
					<Container className="p-6">
						<Heading className="text-2xl font-bold text-center text-gray-800">
							Vielen Dank für Ihre Bestellung,{' '}
							{order.customer?.first_name || order.shipping_address?.first_name}
							!
						</Heading>
						<Text className="text-center text-gray-600 mt-2">
							Ihre Bestellung ist zur Abholung am Lager bereit. Bitte vereinbaren Sie einen Termin zur Abholung.
						</Text>
					</Container>

					{/* Pickup Instructions - Highlighted Box */}
					<Container className="px-6 mb-6">
						<Section
							className="rounded-lg p-6 border-2"
							style={{
								backgroundColor: '#fff7ed',
								borderColor: '#fb923c',
							}}
						>
							<Heading className="text-xl font-semibold text-gray-800 mb-3">
								📦 Abholung am Lager
							</Heading>
							<Text className="text-gray-700 mb-3">
								<strong>Wichtig:</strong> Bitte vereinbaren Sie über unser Kontaktformular einen Termin zur Abholung Ihrer Bestellung.
							</Text>
							<Text className="text-gray-700 mb-3">
								<strong>Zahlung:</strong> Die Zahlung erfolgt bar bei Abholung. Bitte bringen Sie den Gesamtbetrag in bar mit.
							</Text>
							<Text className="text-gray-700">
								<strong>Abholadresse:</strong> {company.address}, {company.postalCode} {company.city}
							</Text>
							<Link
								href={`${company.website}/contact`}
								className="inline-block mt-4 px-4 py-2 rounded text-white font-semibold"
								style={{ backgroundColor: company.primaryColor }}
							>
								Termin vereinbaren
							</Link>
						</Section>
					</Container>

					{/* Promotional Banner */}
					{shouldDisplayBanner && (
						<Container
							className="mb-4 rounded-lg p-7"
							style={{
								background: 'linear-gradient(to right, #3b82f6, #4f46e5)',
							}}
						>
							<Section>
								<Row>
									<Column align="left">
										<Heading className="text-white text-xl font-semibold">
											{email_banner.title}
										</Heading>
										<Text className="text-white mt-2">{email_banner.body}</Text>
									</Column>
									<Column align="right">
										<Link
											href={email_banner.url}
											className="font-semibold px-2 text-white underline"
										>
											Shop Now
										</Link>
									</Column>
								</Row>
							</Section>
						</Container>
					)}

					{/* Order Items */}
					<Container className="px-6">
						<Heading className="text-xl font-semibold text-gray-800 mb-4">
							Ihre Artikel
						</Heading>
						<Row>
							<Column>
								<Text className="text-sm m-0 my-2 text-gray-500">
									Bestellnummer: #{order.display_id}
								</Text>
							</Column>
						</Row>
						{order.items?.map(item => (
							<Section key={item.id} className="border-b border-gray-200 py-4">
								<Row>
									<Column className="w-1/3">
										<Img
											src={item.thumbnail ?? ''}
											alt={item.product_title ?? ''}
											className="rounded-lg"
											width="100%"
										/>
									</Column>
									<Column className="w-2/3 pl-4">
										<Text className="text-lg font-semibold text-gray-800">
											{item.product_title}
										</Text>
										<Text className="text-gray-600">{item.variant_title}</Text>
										<Text className="text-gray-800 mt-2 font-bold">
											{formatPrice(item.total)}
										</Text>
									</Column>
								</Row>
							</Section>
						))}

						{/* Order Summary */}
						<Section className="mt-8">
							<Heading className="text-xl font-semibold text-gray-800 mb-4">
								Bestellübersicht
							</Heading>
							<Row className="text-gray-600">
								<Column className="w-1/2">
									<Text className="m-0">Zwischensumme</Text>
								</Column>
								<Column className="w-1/2 text-right">
									<Text className="m-0">{formatPrice(order.item_total)}</Text>
								</Column>
							</Row>
							{order.shipping_methods?.map(method => (
								<Row className="text-gray-600" key={method.id}>
									<Column className="w-1/2">
										<Text className="m-0">{method.name}</Text>
									</Column>
									<Column className="w-1/2 text-right">
										<Text className="m-0">{formatPrice(method.total)}</Text>
									</Column>
								</Row>
							))}
							<Row className="text-gray-600">
								<Column className="w-1/2">
									<Text className="m-0">MwSt.</Text>
								</Column>
								<Column className="w-1/2 text-right">
									<Text className="m-0">
										{formatPrice(order.tax_total || 0)}
									</Text>
								</Column>
							</Row>
							<Row className="border-t border-gray-200 mt-4 text-gray-800 font-bold">
								<Column className="w-1/2">
									<Text>Gesamt (bar bei Abholung)</Text>
								</Column>
								<Column className="w-1/2 text-right">
									<Text>{formatPrice(order.total)}</Text>
								</Column>
							</Row>
						</Section>
					</Container>

					{/* Footer */}
					<Section className="bg-gray-50 p-6 mt-10">
						<Text className="text-center text-gray-500 text-sm mb-2">
							Bei Fragen zu Ihrer Bestellung kontaktieren Sie uns gerne:
						</Text>
						<Text className="text-center text-gray-600 text-sm font-medium">
							📧 {company.supportEmail || company.email}
						</Text>
						<Text className="text-center text-gray-500 text-sm mt-1">
							📞 Telefon auf Anfrage per E-Mail
						</Text>
						<Text className="text-center text-gray-500 text-sm mt-4">
							📍 {company.address}, {company.postalCode} {company.city}
						</Text>
						<Text className="text-center text-gray-500 text-sm mt-4">
							Bestellnummer: #{order.display_id}
						</Text>
						<Text className="text-center text-gray-400 text-xs mt-4">
							© {new Date().getFullYear()} {company.name}. Alle Rechte
							vorbehalten.
						</Text>
					</Section>
				</Body>
			</Html>
		</Tailwind>
	);
}

export const orderPlacedPickupEmail = (props: OrderPlacedPickupEmailProps) => (
	<OrderPlacedPickupEmailComponent {...props} />
);

