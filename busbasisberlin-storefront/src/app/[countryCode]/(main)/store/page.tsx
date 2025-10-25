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
		categories?: string;
		availability?: 'all' | 'in_stock' | 'out_of_stock';
		min_price?: string;
		max_price?: string;
		tags?: string;
		collections?: string;
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
		categories,
		availability,
		min_price,
		max_price,
		tags,
		collections,
	} = searchParams;

	// Parse filter parameters
	const filters = {
		categories: categories ? categories.split(',').filter(Boolean) : [],
		availability: availability || 'all',
		minPrice: min_price ? parseFloat(min_price) : undefined,
		maxPrice: max_price ? parseFloat(max_price) : undefined,
		tags: tags ? tags.split(',').filter(Boolean) : [],
		collections: collections ? collections.split(',').filter(Boolean) : [],
	};

	return (
		<StoreTemplate
			sortBy={sortBy}
			page={page}
			searchQuery={q}
			filters={filters}
			countryCode={params.countryCode}
		/>
	);
}
