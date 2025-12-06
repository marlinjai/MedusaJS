import { retrieveProduct } from '@lib/data/products';
import { getRegion } from '@lib/data/regions';
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

	return {
		title: `${product.title} | Medusa Store`,
		description: `${product.title}`,
		openGraph: {
			title: `${product.title} | Medusa Store`,
			description: `${product.title}`,
			images: product.thumbnail ? [product.thumbnail] : [],
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

	return (
		<ProductTemplate
			product={pricedProduct}
			region={region}
			countryCode={params.countryCode}
		/>
	);
}
