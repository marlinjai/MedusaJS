import { Metadata } from 'next';

import { SortOptions } from '@modules/store/components/refinement-list/sort-products';
import StoreTemplate from '@modules/store/templates';

export const metadata: Metadata = {
	title: 'BasisCampBerlin - Onlineshop für Ersatzteile',
	description:
		'Ihr Spezialist für Mercedes-Transporter, Wohnmobile und Expeditionsfahrzeuge. Professionelle Wartung, Reparatur und individuelle Umbauten.',
};

type Params = {
	searchParams: Promise<{
		sortBy?: SortOptions;
		page?: string;
		q?: string; // Suchparameter hinzufügen
	}>;
	params: Promise<{
		countryCode: string;
	}>;
};

export default async function StorePage(props: Params) {
	const params = await props.params;
	const searchParams = await props.searchParams;
	const { sortBy, page, q } = searchParams;

	return (
		<StoreTemplate
			sortBy={sortBy}
			page={page}
			searchQuery={q} // Suchbegriff an Template übergeben
			countryCode={params.countryCode}
		/>
	);
}
