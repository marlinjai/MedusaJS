// src/app/[countryCode]/(main)/account/@dashboard/profile/page.tsx
import { Metadata } from 'next';

import ProfilePhone from '@modules/account//components/profile-phone';
import ProfileBillingAddress from '@modules/account/components/profile-billing-address';
import ProfileEmail from '@modules/account/components/profile-email';
import ProfileName from '@modules/account/components/profile-name';

import { retrieveCustomer } from '@lib/data/customer';
import { listRegions } from '@lib/data/regions';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
	title: 'Profil - Mein Konto',
	description: 'Verwalten Sie Ihre Profildaten und Kontoinformationen.',
};

export default async function Profile() {
	const customer = await retrieveCustomer();
	const regions = await listRegions();

	if (!customer || !regions) {
		notFound();
	}

	return (
		<div className="w-full" data-testid="profile-page-wrapper">
			{/* Header */}
			<div className="mb-8 pb-6 border-b border-neutral-700">
				<h1 className="text-2xl font-bold text-white mb-2">Profil verwalten</h1>
				<p className="text-neutral-400">
					Verwalten Sie Ihre persönlichen Informationen, einschließlich Name,
					E-Mail, Telefonnummer und Rechnungsadresse. Sie können auch Ihr
					Passwort ändern.
				</p>
			</div>

			{/* Profile Sections */}
			<div className="space-y-8">
				<ProfileName customer={customer} />
				<Divider />
				<ProfileEmail customer={customer} />
				<Divider />
				<ProfilePhone customer={customer} />
				<Divider />
				{/* <ProfilePassword customer={customer} />
        <Divider /> */}
				<ProfileBillingAddress customer={customer} regions={regions} />
			</div>
		</div>
	);
}

const Divider = () => {
	return <div className="w-full h-px bg-neutral-700" />;
};
``;
