// src/modules/account/components/overview/index.tsx

import { convertToLocale } from '@lib/util/money';
import { HttpTypes } from '@medusajs/types';
import LocalizedClientLink from '@modules/common/components/localized-client-link';
import ChevronDown from '@modules/common/icons/chevron-down';

type OverviewProps = {
	customer: HttpTypes.StoreCustomer | null;
	orders: HttpTypes.StoreOrder[] | null;
};

const Overview = ({ customer, orders }: OverviewProps) => {
	return (
		<div data-testid="overview-page-wrapper">
			<div className="hidden lg:block">
				{/* Welcome Header */}
				<div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 pb-6 border-b border-neutral-700">
					<div>
						<h2
							className="text-2xl font-bold text-white mb-2"
							data-testid="welcome-message"
							data-value={customer?.first_name}
						>
							Willkommen zurück, {customer?.first_name}!
						</h2>
						<p className="text-neutral-400">
							Hier ist eine Übersicht über Ihr Konto
						</p>
					</div>
					<div className="mt-4 lg:mt-0">
						<span className="text-sm text-neutral-400">Angemeldet als: </span>
						<span
							className="font-medium text-white"
							data-testid="customer-email"
							data-value={customer?.email}
						>
							{customer?.email}
						</span>
					</div>
				</div>

				{/* Stats Cards */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
					<div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold text-white">Profil</h3>
							<div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
								<svg
									className="w-6 h-6 text-blue-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
									/>
								</svg>
							</div>
						</div>
						<div className="flex items-end gap-x-2">
							<span
								className="text-3xl font-bold text-white"
								data-testid="customer-profile-completion"
								data-value={getProfileCompletion(customer)}
							>
								{getProfileCompletion(customer)}%
							</span>
							<span className="uppercase text-sm text-neutral-400 mb-1">
								Vollständig
							</span>
						</div>
						<p className="text-neutral-400 text-sm mt-2">
							Vervollständigen Sie Ihr Profil für ein besseres Einkaufserlebnis
						</p>
					</div>

					<div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold text-white">Adressen</h3>
							<div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
								<svg
									className="w-6 h-6 text-green-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
									/>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
									/>
								</svg>
							</div>
						</div>
						<div className="flex items-end gap-x-2">
							<span
								className="text-3xl font-bold text-white"
								data-testid="addresses-count"
								data-value={customer?.addresses?.length || 0}
							>
								{customer?.addresses?.length || 0}
							</span>
							<span className="uppercase text-sm text-neutral-400 mb-1">
								Gespeichert
							</span>
						</div>
						<p className="text-neutral-400 text-sm mt-2">
							Verwalten Sie Ihre Liefer- und Rechnungsadressen
						</p>
					</div>

					<div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold text-white">Bestellungen</h3>
							<div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
								<svg
									className="w-6 h-6 text-purple-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
									/>
								</svg>
							</div>
						</div>
						<div className="flex items-end gap-x-2">
							<span className="text-3xl font-bold text-white">
								{orders?.length || 0}
							</span>
							<span className="uppercase text-sm text-neutral-400 mb-1">
								Gesamt
							</span>
						</div>
						<p className="text-neutral-400 text-sm mt-2">
							Verfolgen Sie Ihre aktuellen und vergangenen Bestellungen
						</p>
					</div>
				</div>

				{/* Recent Orders */}
				<div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700">
					<div className="flex items-center justify-between mb-6">
						<h3 className="text-xl font-semibold text-white">
							Letzte Bestellungen
						</h3>
						<LocalizedClientLink
							href="/account/orders"
							className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
						>
							Alle anzeigen →
						</LocalizedClientLink>
					</div>

					<div className="space-y-4" data-testid="orders-wrapper">
						{orders && orders.length > 0 ? (
							orders.slice(0, 3).map(order => {
								return (
									<div
										key={order.id}
										data-testid="order-wrapper"
										data-value={order.id}
										className="bg-neutral-900 rounded-lg border border-neutral-700 hover:border-neutral-600 transition-colors"
									>
										<LocalizedClientLink
											href={`/account/orders/details/${order.id}`}
											className="block p-4"
										>
											<div className="flex items-center justify-between">
												<div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
													<div>
														<span className="text-sm font-medium text-neutral-400">
															Bestelldatum
														</span>
														<p
															className="text-white"
															data-testid="order-created-date"
														>
															{new Date(order.created_at).toLocaleDateString(
																'de-DE',
															)}
														</p>
													</div>
													<div>
														<span className="text-sm font-medium text-neutral-400">
															Bestellnummer
														</span>
														<p
															className="text-white font-mono"
															data-testid="order-id"
															data-value={order.display_id}
														>
															#{order.display_id}
														</p>
													</div>
													<div>
														<span className="text-sm font-medium text-neutral-400">
															Gesamtbetrag
														</span>
														<p
															className="text-white font-semibold"
															data-testid="order-amount"
														>
															{convertToLocale({
																amount: order.total,
																currency_code: order.currency_code,
															})}
														</p>
													</div>
												</div>
												<button
													className="ml-4 p-2 text-neutral-400 hover:text-white transition-colors"
													data-testid="open-order-button"
												>
													<span className="sr-only">
														Zur Bestellung #{order.display_id}
													</span>
													<ChevronDown className="-rotate-90 w-5 h-5" />
												</button>
											</div>
										</LocalizedClientLink>
									</div>
								);
							})
						) : (
							<div className="text-center py-12">
								<div className="w-16 h-16 bg-neutral-700 rounded-full flex items-center justify-center mx-auto mb-4">
									<svg
										className="w-8 h-8 text-neutral-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
										/>
									</svg>
								</div>
								<p className="text-neutral-400" data-testid="no-orders-message">
									Noch keine Bestellungen vorhanden
								</p>
								<p className="text-sm text-neutral-500 mt-2">
									Entdecken Sie unser Sortiment und tätigen Sie Ihre erste
									Bestellung
								</p>
								<LocalizedClientLink
									href="/store"
									className="inline-flex items-center px-4 py-2 mt-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
								>
									Jetzt einkaufen
								</LocalizedClientLink>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

const getProfileCompletion = (customer: HttpTypes.StoreCustomer | null) => {
	let count = 0;

	if (!customer) {
		return 0;
	}

	if (customer.email) {
		count++;
	}

	if (customer.first_name && customer.last_name) {
		count++;
	}

	if (customer.phone) {
		count++;
	}

	const billingAddress = customer.addresses?.find(
		addr => addr.is_default_billing,
	);

	if (billingAddress) {
		count++;
	}

	return (count / 4) * 100;
};

export default Overview;
