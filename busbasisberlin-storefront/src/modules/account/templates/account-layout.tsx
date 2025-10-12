// src/modules/account/templates/account-layout.tsx
import React from 'react';

import UnderlineLink from '@modules/common/components/interactive-link';

import { HttpTypes } from '@medusajs/types';
import AccountNav from '../components/account-nav';

interface AccountLayoutProps {
	customer: HttpTypes.StoreCustomer | null;
	children: React.ReactNode;
}

const AccountLayout: React.FC<AccountLayoutProps> = ({
	customer,
	children,
}) => {
	return (
		<div
			className="min-h-screen bg-neutral-950 text-white relative"
			data-testid="account-page"
		>
			{/* Content Overlay */}
			<div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
				{/* Header Section */}
				<div className="mb-12">
					<h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
						Mein Konto
					</h1>
					<p className="text-neutral-400 text-lg">
						Verwalten Sie Ihre Kontoinformationen und Bestellungen
					</p>
				</div>

				<div className="grid grid-cols-1 gap-8">
					{/* Navigation Sidebar */}
					<div className="lg:sticky lg:top-8 lg:self-start">
						{customer && <AccountNav customer={customer} />}
					</div>

					{/* Main Content */}
					<div className="flex-1">
						<div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 md:p-8">
							{children}
						</div>
					</div>
				</div>

				{/* Help Section */}
				<div className="mt-16 pt-8 border-t border-neutral-800">
					<div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
						<div>
							<h3 className="text-xl font-semibold mb-2 text-white">
								Haben Sie Fragen?
							</h3>
							<p className="text-neutral-400">
								Häufig gestellte Fragen und Antworten finden Sie auf unserer
								Kundenservice-Seite.
							</p>
						</div>
						<div>
							<UnderlineLink
								href="/customer-service"
								className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
							>
								Kundenservice
							</UnderlineLink>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default AccountLayout;
