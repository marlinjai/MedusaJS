import { Metadata } from 'next';

import { SortOptions } from '@modules/store/components/refinement-list/sort-products';
import StoreTemplate from '@modules/store/templates';

export const metadata: Metadata = {
	title: 'Store',
	description: 'Explore all of our products.',
};

type Params = {
	searchParams: Promise<{
		sortBy?: SortOptions;
		page?: string;
		q?: string;
		category?: string;
		collection?: string;
		view?: 'grid' | 'list';
		perPage?: string;
		price_min?: string;
		price_max?: string;
		tags?: string;
		stock?: string;
	}>;
	params: Promise<{
		countryCode: string;
	}>;
};

export default async function StorePage(props: Params) {
	const params = await props.params;
	const searchParams = await props.searchParams;
	const {
		sortBy,
		page,
		q,
		category,
		collection,
		view,
		perPage,
		price_min,
		price_max,
		tags,
		stock,
	} = searchParams;

	// Parse price filters for potential future use
	const priceMin = price_min ? parseFloat(price_min) : undefined;
	const priceMax = price_max ? parseFloat(price_max) : undefined;

	// Parse tags for potential future use
	const tagsList = tags ? tags.split(',').filter(Boolean) : undefined;

	return (
		<StoreTemplate
			sortBy={sortBy}
			page={page}
			searchQuery={q}
			countryCode={params.countryCode}
			categoryId={category}
			collectionId={collection}
			viewMode={view}
			perPage={perPage ? parseInt(perPage) : 20}
			stockFilter={stock}
		/>
	);
}
