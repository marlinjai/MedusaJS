import { retrieveProduct } from '@lib/data/products';
import { getRegion } from '@lib/data/regions';
import { getBaseURL } from '@lib/util/env';
import ProductTemplate from '@modules/products/templates';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

type Props = {
	params: Promise<{ countryCode: string; handle: string }>;
};

// Force dynamic rendering for product pages
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateStaticParams() {
	// Skip static generation - we'll render dynamically
	return [];
}

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
	const { handle } = params;
	const region = await getRegion(params.countryCode);
	const baseUrl = getBaseURL();

	if (!region) {
		notFound();
	}

	const product = await retrieveProduct({
		handle,
		countryCode: params.countryCode,
	});

	if (!product) {
		notFound();
	}

	const description =
		product.description ||
		`${product.title} - Originalteile für Mercedes-Transporter bei BasisCamp Berlin kaufen.`;

	return {
		title: `${product.title} - Ersatzteil | BasisCamp Berlin`,
		description,
		alternates: {
			canonical: `${baseUrl}/${params.countryCode}/products/${handle}`,
		},
		openGraph: {
			title: `${product.title} - Ersatzteil | BasisCamp Berlin`,
			description,
			images: product.thumbnail ? [product.thumbnail] : [],
			type: 'website',
			locale: 'de_DE',
			siteName: 'BasisCamp Berlin',
		},
	};
}

export default async function ProductPage(props: Props) {
	const params = await props.params;
	const region = await getRegion(params.countryCode);

	if (!region) {
		notFound();
	}

	const pricedProduct = await retrieveProduct({
		handle: params.handle,
		countryCode: params.countryCode,
	});

	if (!pricedProduct) {
		notFound();
	}

	// Product JSON-LD Schema for rich snippets in search results
	const variant = pricedProduct.variants?.[0];
	const price = variant?.calculated_price?.calculated_amount;
	const productJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'Product',
		name: pricedProduct.title,
		description:
			pricedProduct.description ||
			`${pricedProduct.title} - Ersatzteil für Mercedes-Transporter`,
		image: pricedProduct.thumbnail || pricedProduct.images?.[0]?.url,
		sku: variant?.sku || pricedProduct.handle,
		brand: {
			'@type': 'Brand',
			name: 'BasisCamp Berlin',
		},
		offers: {
			'@type': 'Offer',
			url: `https://basiscampberlin.de/${params.countryCode}/products/${pricedProduct.handle}`,
			priceCurrency: 'EUR',
			price: price ? (price / 100).toFixed(2) : undefined,
			availability:
				(variant?.inventory_quantity ?? 0) > 0
					? 'https://schema.org/InStock'
					: 'https://schema.org/OutOfStock',
			seller: {
				'@type': 'Organization',
				name: 'BasisCamp Berlin GmbH',
			},
		},
	};

	return (
		<>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
			/>
			<ProductTemplate
				product={pricedProduct}
				region={region}
				countryCode={params.countryCode}
			/>
		</>
	);
}
