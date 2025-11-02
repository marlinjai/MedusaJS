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

type OrderPlacedEmailProps = {
	order: OrderDTO & {
		customer: CustomerDTO;
	};
	email_banner?: {
		body: string;
		title: string;
		url: string;
	};
};

function OrderPlacedEmailComponent({
	order,
	email_banner,
}: OrderPlacedEmailProps) {
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
				<Preview>Vielen Dank für Ihre Bestellung bei {company.name}</Preview>
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
						<Text className="text-white opacity-90 mt-2 m-0 text-sm">
							{company.address}, {company.postalCode} {company.city}
						</Text>
					</Section>

					{/* Thank You Message */}
					<Container className="p-6">
						<Heading className="text-2xl font-bold text-center text-gray-800">
							Vielen Dank für Ihre Bestellung,{' '}
							{order.customer?.first_name || order.shipping_address?.first_name}!
						</Heading>
						<Text className="text-center text-gray-600 mt-2">
							Wir bearbeiten Ihre Bestellung und benachrichtigen Sie, sobald sie
							versandt wird.
						</Text>
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
									<Text>Gesamt</Text>
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

const mockOrder = {
	order: {
		id: 'order_01JSNXDH9BPJWWKVW03B9E9KW8',
		display_id: 1,
		email: 'afsaf@gmail.com',
		currency_code: 'eur',
		total: 20,
		subtotal: 20,
		discount_total: 0,
		shipping_total: 10,
		tax_total: 0,
		item_subtotal: 10,
		item_total: 10,
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
					value: '10',
					precision: 20,
				},
				created_at: new Date(),
				updated_at: new Date(),
				deleted_at: null,
				tax_lines: [],
				adjustments: [],
				compare_at_unit_price: null,
				unit_price: 10,
				quantity: 1,
				raw_quantity: {
					value: '1',
					precision: 20,
				},
				detail: {
					id: 'orditem_01JSNXDH9DK1XMESEZPADYFWKY',
					version: 1,
					metadata: null,
					order_id: 'order_01JSNXDH9BPJWWKVW03B9E9KW8',
					raw_unit_price: null,
					raw_compare_at_unit_price: null,
					raw_quantity: {
						value: '1',
						precision: 20,
					},
					raw_fulfilled_quantity: {
						value: '0',
						precision: 20,
					},
					raw_delivered_quantity: {
						value: '0',
						precision: 20,
					},
					raw_shipped_quantity: {
						value: '0',
						precision: 20,
					},
					raw_return_requested_quantity: {
						value: '0',
						precision: 20,
					},
					raw_return_received_quantity: {
						value: '0',
						precision: 20,
					},
					raw_return_dismissed_quantity: {
						value: '0',
						precision: 20,
					},
					raw_written_off_quantity: {
						value: '0',
						precision: 20,
					},
					created_at: new Date(),
					updated_at: new Date(),
					deleted_at: null,
					item_id: 'ordli_01JSNXDH9C47KZ43WQ3TBFXZA9',
					unit_price: null,
					compare_at_unit_price: null,
					quantity: 1,
					fulfilled_quantity: 0,
					delivered_quantity: 0,
					shipped_quantity: 0,
					return_requested_quantity: 0,
					return_received_quantity: 0,
					return_dismissed_quantity: 0,
					written_off_quantity: 0,
				},
				subtotal: 10,
				total: 10,
				original_total: 10,
				discount_total: 0,
				discount_subtotal: 0,
				discount_tax_total: 0,
				tax_total: 0,
				original_tax_total: 0,
				refundable_total_per_unit: 10,
				refundable_total: 10,
				fulfilled_total: 0,
				shipped_total: 0,
				return_requested_total: 0,
				return_received_total: 0,
				return_dismissed_total: 0,
				write_off_total: 0,
				raw_subtotal: {
					value: '10',
					precision: 20,
				},
				raw_total: {
					value: '10',
					precision: 20,
				},
				raw_original_total: {
					value: '10',
					precision: 20,
				},
				raw_discount_total: {
					value: '0',
					precision: 20,
				},
				raw_discount_subtotal: {
					value: '0',
					precision: 20,
				},
				raw_discount_tax_total: {
					value: '0',
					precision: 20,
				},
				raw_tax_total: {
					value: '0',
					precision: 20,
				},
				raw_original_tax_total: {
					value: '0',
					precision: 20,
				},
				raw_refundable_total_per_unit: {
					value: '10',
					precision: 20,
				},
				raw_refundable_total: {
					value: '10',
					precision: 20,
				},
				raw_fulfilled_total: {
					value: '0',
					precision: 20,
				},
				raw_shipped_total: {
					value: '0',
					precision: 20,
				},
				raw_return_requested_total: {
					value: '0',
					precision: 20,
				},
				raw_return_received_total: {
					value: '0',
					precision: 20,
				},
				raw_return_dismissed_total: {
					value: '0',
					precision: 20,
				},
				raw_write_off_total: {
					value: '0',
					precision: 20,
				},
			},
		],
		shipping_address: {
			id: 'caaddr_01JSNXD6W0TGPH2JQD18K97B25',
			customer_id: null,
			company: '',
			first_name: 'safasf',
			last_name: 'asfaf',
			address_1: 'asfasf',
			address_2: '',
			city: 'asfasf',
			country_code: 'dk',
			province: '',
			postal_code: 'asfasf',
			phone: '',
			metadata: null,
			created_at: '2025-04-25T07:25:48.801Z',
			updated_at: '2025-04-25T07:25:48.801Z',
			deleted_at: null,
		},
		billing_address: {
			id: 'caaddr_01JSNXD6W0V7RNZH63CPG26K5W',
			customer_id: null,
			company: '',
			first_name: 'safasf',
			last_name: 'asfaf',
			address_1: 'asfasf',
			address_2: '',
			city: 'asfasf',
			country_code: 'dk',
			province: '',
			postal_code: 'asfasf',
			phone: '',
			metadata: null,
			created_at: '2025-04-25T07:25:48.801Z',
			updated_at: '2025-04-25T07:25:48.801Z',
			deleted_at: null,
		},
		shipping_methods: [
			{
				id: 'ordsm_01JSNXDH9B9DDRQXJT5J5AE5V1',
				name: 'Standard Shipping',
				description: null,
				is_tax_inclusive: false,
				is_custom_amount: false,
				shipping_option_id: 'so_01JSNXAQA64APG6BNHGCMCTN6V',
				data: {},
				metadata: null,
				raw_amount: {
					value: '10',
					precision: 20,
				},
				created_at: new Date(),
				updated_at: new Date(),
				deleted_at: null,
				tax_lines: [],
				adjustments: [],
				amount: 10,
				order_id: 'order_01JSNXDH9BPJWWKVW03B9E9KW8',
				detail: {
					id: 'ordspmv_01JSNXDH9B5RAF4FH3M1HH3TEA',
					version: 1,
					order_id: 'order_01JSNXDH9BPJWWKVW03B9E9KW8',
					return_id: null,
					exchange_id: null,
					claim_id: null,
					created_at: new Date(),
					updated_at: new Date(),
					deleted_at: null,
					shipping_method_id: 'ordsm_01JSNXDH9B9DDRQXJT5J5AE5V1',
				},
				subtotal: 10,
				total: 10,
				original_total: 10,
				discount_total: 0,
				discount_subtotal: 0,
				discount_tax_total: 0,
				tax_total: 0,
				original_tax_total: 0,
				raw_subtotal: {
					value: '10',
					precision: 20,
				},
				raw_total: {
					value: '10',
					precision: 20,
				},
				raw_original_total: {
					value: '10',
					precision: 20,
				},
				raw_discount_total: {
					value: '0',
					precision: 20,
				},
				raw_discount_subtotal: {
					value: '0',
					precision: 20,
				},
				raw_discount_tax_total: {
					value: '0',
					precision: 20,
				},
				raw_tax_total: {
					value: '0',
					precision: 20,
				},
				raw_original_tax_total: {
					value: '0',
					precision: 20,
				},
			},
		],
		customer: {
			id: 'cus_01JSNXD6VQC1YH56E4TGC81NWX',
			company_name: null,
			first_name: null,
			last_name: null,
			email: 'afsaf@gmail.com',
			phone: null,
			has_account: false,
			metadata: null,
			created_by: null,
			created_at: '2025-04-25T07:25:48.791Z',
			updated_at: '2025-04-25T07:25:48.791Z',
			deleted_at: null,
		},
	},
};
// @ts-ignore
export default () => <OrderPlacedEmailComponent {...mockOrder} />;

export const orderPlacedEmail = (props: OrderPlacedEmailProps) => (
	<OrderPlacedEmailComponent {...props} />
);
