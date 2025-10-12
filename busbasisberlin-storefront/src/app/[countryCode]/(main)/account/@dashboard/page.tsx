// src/app/[countryCode]/(main)/account/@dashboard/page.tsx
import { Metadata } from 'next';

import { retrieveCustomer } from '@lib/data/customer';
import { listOrders } from '@lib/data/orders';
import Overview from '@modules/account/components/overview';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
	title: 'Konto-Übersicht',
	description: 'Übersicht über Ihre Kontoaktivitäten und Bestellungen.',
};

export default async function OverviewTemplate() {
	const customer = await retrieveCustomer().catch(() => null);
	const orders = (await listOrders().catch(() => null)) || null;

	if (!customer) {
		notFound();
	}

	return <Overview customer={customer} orders={orders} />;
}
