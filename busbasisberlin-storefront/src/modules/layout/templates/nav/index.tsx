import { listRegions } from '@lib/data/regions';
import { StoreRegion } from '@medusajs/types';
import LocalizedClientLink from '@modules/common/components/localized-client-link';
import CartButton from '@modules/layout/components/cart-button';
import MobileMenu from '@modules/layout/components/mobile-menu';
import TransparentHeader from '@modules/layout/components/transparent-header';
import { mainNavItems } from '@modules/layout/config/navigation';
import SearchModal from '@modules/search/components/modal';
import Image from 'next/image';
import { Suspense } from 'react';

export default async function Nav() {
	const regions = await listRegions().then((regions: StoreRegion[]) => regions);

	return (
		<>
			<TransparentHeader />
			<div className="fixed top-0 inset-x-0 z-50 group">
				<header className="nav-header relative py-4 mx-auto">
					<nav className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 txt-xsmall-plus text-white flex items-center justify-between h-full text-small-regular">
						{/* Logo */}
						<div className="flex items-center h-full">
							<LocalizedClientLink
								href="/"
								className="txt-compact-xlarge-plus hover:text-white/80 uppercase"
								data-testid="nav-store-link"
							>
								<Image
									//src="/logo basiscamp.png"
									className="w-auto h-16"
									src="/logo-with-font.png"
									alt="BusBasis Berlin"
									width={400}
									height={200}
								/>
							</LocalizedClientLink>
						</div>

						{/* Desktop Navigation */}
						<div className="hidden md:flex items-center space-x-8">
							{mainNavItems.map(item => (
								<LocalizedClientLink
									key={item.href}
									href={item.href}
									className="hover:text-white/80 transition-colors duration-200 text-neutral-200 text-sm md:text-lg max-w-sm"
								>
									{item.label}
								</LocalizedClientLink>
							))}
						</div>

						{/* Right Section - Search, Account, Cart, & Mobile Menu */}
						<div className="flex items-center gap-x-6 h-full">
							{/* Search Modal - Hidden on Mobile */}
							<SearchModal />

							{/* Account Link - Hidden on Mobile */}
							<div className="hidden md:flex items-center gap-x-6 h-full">
								<LocalizedClientLink
									className="hover:text-white/80 transition-colors duration-200"
									href="/account"
									data-testid="nav-account-link"
								>
									Konto
								</LocalizedClientLink>
							</div>

							{/* Cart Button */}
							<Suspense
								fallback={
									<LocalizedClientLink
										className="hover:text-white/80 flex gap-2 transition-colors duration-200"
										href="/cart"
										data-testid="nav-cart-link"
									>
										Warenkorb (0)
									</LocalizedClientLink>
								}
							>
								<CartButton />
							</Suspense>

							{/* Mobile Menu */}
							<MobileMenu />
						</div>
					</nav>
				</header>
			</div>
		</>
	);
}
