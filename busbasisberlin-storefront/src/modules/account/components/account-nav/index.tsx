// src/modules/account/components/account-nav/index.tsx
'use client';

import { ArrowRightOnRectangle } from '@medusajs/icons';
import { clx } from '@medusajs/ui';
import { useParams, usePathname } from 'next/navigation';

import { signout } from '@lib/data/customer';
import { HttpTypes } from '@medusajs/types';
import LocalizedClientLink from '@modules/common/components/localized-client-link';
import ChevronDown from '@modules/common/icons/chevron-down';
import MapPin from '@modules/common/icons/map-pin';
import Package from '@modules/common/icons/package';
import User from '@modules/common/icons/user';

const AccountNav = ({
	customer,
}: {
	customer: HttpTypes.StoreCustomer | null;
}) => {
	const route = usePathname();
	const { countryCode } = useParams() as { countryCode: string };

	const handleLogout = async () => {
		await signout(countryCode);
	};

	return (
		<div>
			{/* Mobile Navigation */}
			<div className="lg:hidden" data-testid="mobile-account-nav">
				{route !== `/${countryCode}/account` ? (
					<LocalizedClientLink
						href="/account"
						className="flex items-center gap-x-2 text-sm py-2 text-neutral-300 hover:text-white transition-colors"
						data-testid="account-main-link"
					>
						<>
							<ChevronDown className="transform rotate-90" />
							<span>Konto</span>
						</>
					</LocalizedClientLink>
				) : (
					<>
						<div className="text-xl font-semibold mb-6 px-4 text-white">
							Hallo {customer?.first_name}
						</div>
						<div className="bg-neutral-800 rounded-lg overflow-hidden">
							<ul className="divide-y divide-neutral-700">
								<li>
									<LocalizedClientLink
										href="/account/profile"
										className="flex items-center justify-between p-4 hover:bg-neutral-700 transition-colors"
										data-testid="profile-link"
									>
										<>
											<div className="flex items-center gap-x-3">
												<User size={20} className="text-blue-400" />
												<span className="text-white">Profil</span>
											</div>
											<ChevronDown className="transform -rotate-90 text-neutral-400" />
										</>
									</LocalizedClientLink>
								</li>
								<li>
									<LocalizedClientLink
										href="/account/addresses"
										className="flex items-center justify-between p-4 hover:bg-neutral-700 transition-colors"
										data-testid="addresses-link"
									>
										<>
											<div className="flex items-center gap-x-3">
												<MapPin size={20} className="text-blue-400" />
												<span className="text-white">Adressen</span>
											</div>
											<ChevronDown className="transform -rotate-90 text-neutral-400" />
										</>
									</LocalizedClientLink>
								</li>
								<li>
									<LocalizedClientLink
										href="/account/orders"
										className="flex items-center justify-between p-4 hover:bg-neutral-700 transition-colors"
										data-testid="orders-link"
									>
										<div className="flex items-center gap-x-3">
											<Package size={20} className="text-blue-400" />
											<span className="text-white">Bestellungen</span>
										</div>
										<ChevronDown className="transform -rotate-90 text-neutral-400" />
									</LocalizedClientLink>
								</li>
								<li>
									<button
										type="button"
										className="flex items-center justify-between p-4 w-full hover:bg-neutral-700 transition-colors text-left"
										onClick={handleLogout}
										data-testid="logout-button"
									>
										<div className="flex items-center gap-x-3">
											<ArrowRightOnRectangle className="text-red-400" />
											<span className="text-white">Abmelden</span>
										</div>
										<ChevronDown className="transform -rotate-90 text-neutral-400" />
									</button>
								</li>
							</ul>
						</div>
					</>
				)}
			</div>

			{/* Desktop Navigation */}
			<div className="hidden lg:block" data-testid="account-nav">
				<div className="bg-neutral-800 rounded-xl p-6">
					<div className="pb-4 mb-6 border-b border-neutral-700">
						<h3 className="text-lg font-semibold text-white">Konto</h3>
						{customer && (
							<p className="text-sm text-neutral-400 mt-1">
								Hallo, {customer.first_name}
							</p>
						)}
					</div>
					<nav>
						<ul className="space-y-2">
							<li>
								<AccountNavLink
									href="/account"
									route={route!}
									data-testid="overview-link"
									icon={<Package size={18} />}
								>
									Übersicht
								</AccountNavLink>
							</li>
							<li>
								<AccountNavLink
									href="/account/profile"
									route={route!}
									data-testid="profile-link"
									icon={<User size={18} />}
								>
									Profil
								</AccountNavLink>
							</li>
							<li>
								<AccountNavLink
									href="/account/addresses"
									route={route!}
									data-testid="addresses-link"
									icon={<MapPin size={18} />}
								>
									Adressen
								</AccountNavLink>
							</li>
							<li>
								<AccountNavLink
									href="/account/orders"
									route={route!}
									data-testid="orders-link"
									icon={<Package size={18} />}
								>
									Bestellungen
								</AccountNavLink>
							</li>
							<li className="pt-4 mt-4 border-t border-neutral-700">
								<button
									type="button"
									onClick={handleLogout}
									data-testid="logout-button"
									className="flex items-center gap-x-3 w-full p-3 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
								>
									<ArrowRightOnRectangle className="w-[18px] h-[18px]" />
									<span>Abmelden</span>
								</button>
							</li>
						</ul>
					</nav>
				</div>
			</div>
		</div>
	);
};

type AccountNavLinkProps = {
	href: string;
	route: string;
	children: React.ReactNode;
	icon?: React.ReactNode;
	'data-testid'?: string;
};

const AccountNavLink = ({
	href,
	route,
	children,
	icon,
	'data-testid': dataTestId,
}: AccountNavLinkProps) => {
	const { countryCode }: { countryCode: string } = useParams();

	const active = route.split(countryCode)[1] === href;
	return (
		<LocalizedClientLink
			href={href}
			className={clx(
				'flex items-center gap-x-3 p-3 rounded-lg transition-colors',
				{
					'bg-blue-600 text-white': active,
					'text-neutral-300 hover:text-white hover:bg-neutral-700': !active,
				},
			)}
			data-testid={dataTestId}
		>
			{icon && (
				<span
					className={clx({
						'text-white': active,
						'text-blue-400': !active,
					})}
				>
					{icon}
				</span>
			)}
			{children}
		</LocalizedClientLink>
	);
};

export default AccountNav;
