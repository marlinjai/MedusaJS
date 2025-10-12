// src/app/[countryCode]/(main)/account/@dashboard/addresses/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import AddressBook from '@modules/account/components/address-book';

import { retrieveCustomer } from '@lib/data/customer';
import { getRegion } from '@lib/data/regions';

export const metadata: Metadata = {
	title: 'Adressen - Mein Konto',
	description: 'Verwalten Sie Ihre Liefer- und Rechnungsadressen',
};

export default async function Addresses(props: {
	params: Promise<{ countryCode: string }>;
}) {
	const params = await props.params;
	const { countryCode } = params;
	const customer = await retrieveCustomer();
	const region = await getRegion(countryCode);

	if (!customer || !region) {
		notFound();
	}

	return (
		<div className="w-full" data-testid="addresses-page-wrapper">
			{/* Header */}
			<div className="mb-8 pb-6 border-b border-neutral-700">
				<h1 className="text-2xl font-bold text-white mb-2">Meine Adressen</h1>
				<p className="text-neutral-400">
					Verwalten Sie Ihre Lieferadressen. Sie können beliebig viele
					hinzufügen. Das Speichern Ihrer Adressen macht sie beim Checkout
					verfügbar.
				</p>
			</div>

			<AddressBook customer={customer} region={region} />
		</div>
	);
}
