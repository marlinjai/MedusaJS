// src/app/[countryCode]/(main)/account/@dashboard/orders/page.tsx
import { Metadata } from 'next';

import { listOrders } from '@lib/data/orders';
import OrderOverview from '@modules/account/components/order-overview';
import TransferRequestForm from '@modules/account/components/transfer-request-form';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
	title: 'Bestellungen - Mein Konto',
	description: 'Übersicht über Ihre bisherigen Bestellungen und deren Status.',
};

export default async function Orders() {
	const orders = await listOrders();

	if (!orders) {
		notFound();
	}

	return (
		<div className="w-full" data-testid="orders-page-wrapper">
			{/* Header */}
			<div className="mb-8 pb-6 border-b border-neutral-700">
				<h1 className="text-2xl font-bold text-white mb-2">
					Meine Bestellungen
				</h1>
				<p className="text-neutral-400">
					Verwalten Sie Ihre bisherigen Bestellungen und deren Status. Sie
					können auch Rücksendungen oder Umtausch für Ihre Bestellungen
					erstellen, falls erforderlich.
				</p>
			</div>

			<div className="space-y-8">
				<OrderOverview orders={orders} />
				<div className="border-t border-neutral-700 pt-8">
					<TransferRequestForm />
				</div>
			</div>
		</div>
	);
}
