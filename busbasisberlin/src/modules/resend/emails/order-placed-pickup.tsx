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
							Ihre Bestellung ist zur Abholung am Lager bereit. Bitte kommen Sie zu unseren Öffnungszeiten vorbei.
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
								<strong>Wichtig:</strong> Bitte kommen Sie zu unseren Öffnungszeiten vorbei, um Ihre Bestellung abzuholen.
							</Text>
							<Text className="text-gray-700 mb-2">
								<strong>Öffnungszeiten:</strong>
							</Text>
							<Text className="text-gray-700 mb-1" style={{ paddingLeft: '16px' }}>
								{company.openingHours?.weekdays || 'Montag - Freitag: 08:00–16:00'}
							</Text>
							<Text className="text-gray-700 mb-3" style={{ paddingLeft: '16px' }}>
								{company.openingHours?.weekend || 'Samstag - Sonntag: Geschlossen'}
							</Text>
							<Text className="text-gray-700 mb-3">
								<strong>Zahlung:</strong> Die Zahlung erfolgt bar bei Abholung. Bitte bringen Sie den Gesamtbetrag in bar mit.
							</Text>
							<Text className="text-gray-700">
								<strong>Abholadresse:</strong> {company.address}, {company.postalCode} {company.city}
							</Text>
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

// Mock data for preview/development
const mockOrder = {
	order: {
		id: 'order_01JSNXDH9BPJWWKVW03B9E9KW8',
		display_id: 1,
		email: 'customer@example.com',
		currency_code: 'eur',
		total: 20,
		subtotal: 20,
		discount_total: 0,
		shipping_total: 0,
		tax_total: 0,
		item_subtotal: 20,
		item_total: 20,
		item_tax_total: 0,
		customer_id: 'cus_01JSNXD6VQC1YH56E4TGC81NWX',
		items: [
			{
				id: 'ordli_01JSNXDH9C47KZ43WQ3TBFXZA9',
				title: 'L',
				subtitle: 'Medusa Sweatshirt',
				thumbnail:
					'https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-front.png',
				variant_id: 'variant_01JSNXAQCZ5X81A3NRSVFJ3ZHQ',
				product_id: 'prod_01JSNXAQBQ6MFV5VHKN420NXQW',
				product_title: 'Medusa Sweatshirt',
				product_description:
					'Reimagine the feeling of a classic sweatshirt. With our cotton sweatshirt, everyday essentials no longer have to be ordinary.',
				product_subtitle: null,
				product_type: null,
				product_type_id: null,
				product_collection: null,
				product_handle: 'sweatshirt',
				variant_sku: 'SWEATSHIRT-L',
				variant_barcode: null,
				variant_title: 'L',
				variant_option_values: null,
				requires_shipping: true,
				is_giftcard: false,
				is_discountable: true,
				is_tax_inclusive: false,
				is_custom_price: false,
				metadata: {},
				raw_compare_at_unit_price: null,
				raw_unit_price: {
					value: '20',
					precision: 20,
				},
				created_at: new Date(),
				updated_at: new Date(),
				deleted_at: null,
				tax_lines: [],
				adjustments: [],
				compare_at_unit_price: null,
				unit_price: 20,
				quantity: 1,
				raw_quantity: {
					value: '1',
					precision: 20,
				},
				subtotal: 20,
				total: 20,
				original_total: 20,
				discount_total: 0,
				discount_subtotal: 0,
				discount_tax_total: 0,
				tax_total: 0,
				original_tax_total: 0,
				refundable_total_per_unit: 20,
				refundable_total: 20,
				fulfilled_total: 0,
				shipped_total: 0,
				return_requested_total: 0,
				return_received_total: 0,
				return_dismissed_total: 0,
				write_off_total: 0,
			},
		],
		shipping_address: {
			id: 'caaddr_01JSNXD6W0TGPH2JQD18K97B25',
			customer_id: null,
			company: '',
			first_name: 'Max',
			last_name: 'Mustermann',
			address_1: 'Musterstraße 123',
			address_2: '',
			city: 'Berlin',
			country_code: 'de',
			province: '',
			postal_code: '10115',
			phone: '+49 30 12345678',
			metadata: null,
			created_at: '2025-04-25T07:25:48.801Z',
			updated_at: '2025-04-25T07:25:48.801Z',
			deleted_at: null,
		},
		billing_address: {
			id: 'caaddr_01JSNXD6W0V7RNZH63CPG26K5W',
			customer_id: null,
			company: '',
			first_name: 'Max',
			last_name: 'Mustermann',
			address_1: 'Musterstraße 123',
			address_2: '',
			city: 'Berlin',
			country_code: 'de',
			province: '',
			postal_code: '10115',
			phone: '+49 30 12345678',
			metadata: null,
			created_at: '2025-04-25T07:25:48.801Z',
			updated_at: '2025-04-25T07:25:48.801Z',
			deleted_at: null,
		},
		shipping_methods: [
			{
				id: 'ordsm_01JSNXDH9B9DDRQXJT5J5AE5V1',
				name: 'Abholung am Lager',
				description: null,
				is_tax_inclusive: false,
				is_custom_amount: false,
				shipping_option_id: 'so_01JSNXAQA64APG6BNHGCMCTN6V',
				data: {},
				metadata: null,
				raw_amount: {
					value: '0',
					precision: 20,
				},
				created_at: new Date(),
				updated_at: new Date(),
				deleted_at: null,
				tax_lines: [],
				adjustments: [],
				amount: 0,
				order_id: 'order_01JSNXDH9BPJWWKVW03B9E9KW8',
				subtotal: 0,
				total: 0,
				original_total: 0,
				discount_total: 0,
				discount_subtotal: 0,
				discount_tax_total: 0,
				tax_total: 0,
				original_tax_total: 0,
			},
		],
		customer: {
			id: 'cus_01JSNXD6VQC1YH56E4TGC81NWX',
			company_name: null,
			first_name: 'Max',
			last_name: 'Mustermann',
			email: 'customer@example.com',
			phone: '+49 30 12345678',
			has_account: false,
			metadata: null,
			created_by: null,
			created_at: '2025-04-25T07:25:48.791Z',
			updated_at: '2025-04-25T07:25:48.791Z',
			deleted_at: null,
		},
	},
};

// Default export for React Email preview
// @ts-ignore
export default () => <OrderPlacedPickupEmailComponent {...mockOrder} />;

