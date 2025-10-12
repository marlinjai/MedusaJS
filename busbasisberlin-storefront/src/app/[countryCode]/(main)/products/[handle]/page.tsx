import { listProductsForBuild } from '@lib/data/products';
import { getRegion, listRegionsForBuild } from '@lib/data/regions';
import ProductTemplate from '@modules/products/templates';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

type Props = {
	params: Promise<{ countryCode: string; handle: string }>;
};

export async function generateStaticParams() {
	// Skip static generation during Docker build when backend isn't available
	if (process.env.DOCKER_BUILD === 'true') {
		return [];
	}

	try {
		const regions = await listRegionsForBuild();
		const countryCodes = regions
			?.map(r => r.countries?.map(c => c.iso_2))
			.flat();

		if (!countryCodes) {
			return [];
		}

		const products = await listProductsForBuild({
			limit: 200,
		});

		return countryCodes
			.map(countryCode =>
				products.map(product => ({
					countryCode,
					handle: product.handle,
				})),
			)
			.flat()
			.filter(param => param.handle);
	} catch (error) {
		console.error(
			`Failed to generate static paths for product pages: ${
				error instanceof Error ? error.message : 'Unknown error'
			}.`,
		);
		return [];
	}
}

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
	const { handle } = params;
	const region = await getRegion(params.countryCode);

	if (!region) {
		notFound();
	}

	const product = await listProducts({
		countryCode: params.countryCode,
		queryParams: { handle },
	}).then(({ response }) => response.products[0]);

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

	const pricedProduct = await listProducts({
		countryCode: params.countryCode,
		queryParams: { handle: params.handle },
	}).then(({ response }) => response.products[0]);

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
