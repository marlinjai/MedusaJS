import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getCategoryByHandle, listCategories } from '@lib/data/categories';
import { listRegions } from '@lib/data/regions';
import { StoreRegion } from '@medusajs/types';
import CategoryTemplate from '@modules/categories/templates';
import { SortOptions } from '@modules/store/components/refinement-list/sort-products';

type Props = {
	params: Promise<{ category: string[]; countryCode: string }>;
	searchParams: Promise<{
		sortBy?: SortOptions;
		page?: string;
	}>;
};

export async function generateStaticParams() {
	// Skip static generation during Docker build when backend isn't available
	if (process.env.DOCKER_BUILD === 'true') {
		return [];
	}

	const categoriesResponse = await listCategories();

	if (!categoriesResponse?.product_categories) {
		return [];
	}

	const countryCodes = await listRegions().then((regions: StoreRegion[]) =>
		regions?.map(r => r.countries?.map(c => c.iso_2)).flat(),
	);

	const categoryHandles = categoriesResponse.product_categories.map(
		(category: any) => category.handle,
	);

	const staticParams = countryCodes
		?.map((countryCode: string | undefined) =>
			categoryHandles.map((handle: any) => ({
				countryCode,
				category: [handle],
			})),
		)
		.flat();

	return staticParams;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
	try {
		// Join category array to get the handle string
		const categoryHandle = params.category.join('/');
		const productCategory = await getCategoryByHandle(categoryHandle);

		if (!productCategory) {
			notFound();
		}

		const title = productCategory.name + ' | Medusa Store';

		const description = productCategory.description ?? `${title} category.`;

		return {
			title: `${title} | Medusa Store`,
			description,
			alternates: {
				canonical: `${params.category.join('/')}`,
			},
		};
	} catch (error) {
		notFound();
	}
}

export default async function CategoryPage(props: Props) {
	const searchParams = await props.searchParams;
	const params = await props.params;
	const { sortBy, page } = searchParams;

	// Join category array to get the handle string
	const categoryHandle = params.category.join('/');
	const productCategory = await getCategoryByHandle(categoryHandle);

	if (!productCategory) {
		notFound();
	}

	return (
		<CategoryTemplate
			category={productCategory}
			sortBy={sortBy}
			page={page}
			countryCode={params.countryCode}
		/>
	);
}
