import { listRegions } from '@lib/data/regions';
import { StoreRegion } from '@medusajs/types';
import LocalizedClientLink from '@modules/common/components/localized-client-link';
import HeroAlert from '@modules/home/components/hero-alert';
import CartButton from '@modules/layout/components/cart-button';
import MobileMenu from '@modules/layout/components/mobile-menu';
import TransparentHeader from '@modules/layout/components/transparent-header';
import ConditionalSearch from '@modules/search/components/conditional-search';
import Image from 'next/image';
import { Suspense } from 'react';
import NavClient from './nav-client';

export default async function Nav() {
	const regions = await listRegions().then((regions: StoreRegion[]) => regions);

	return (
		<>
			<TransparentHeader />
			<div className="fixed top-0 inset-x-0 z-50 group bg-stone-950/40 backdrop-blur-md">
				<header className="nav-header relative py-4 mx-auto">
					<nav className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 txt-xsmall-plus text-white flex items-center justify-between h-full text-small-regular">
						{/* Logo */}
						<div className="flex items-center h-full flex-shrink-0 min-w-0">
							<LocalizedClientLink
								href="/"
								className="txt-compact-xlarge-plus hover:text-white/80 uppercase"
								data-testid="nav-store-link"
							>
								<Image
									//src="/logo basiscamp.png"
									className="w-auto h-10 md:h-16"
									src="/logo-with-font.png"
									alt="BusBasis Berlin"
									width={400}
									height={200}
								/>
							</LocalizedClientLink>
						</div>

						{/* Desktop Navigation */}
						<NavClient />

						{/* Right Section - Search, Account, Cart, & Mobile Menu */}
						<div className="flex items-center gap-x-3 md:gap-x-6 h-full flex-shrink-0">
							{/* Search Modal - Conditionally rendered based on settings */}
							<ConditionalSearch />

							{/* Account Link - Hidden below 1024px */}
							<div className="hidden small:flex items-center gap-x-6 h-full">
								<LocalizedClientLink
									className="hover:text-white/80 transition-colors duration-200 flex items-center"
									href="/account"
									data-testid="nav-account-link"
									aria-label="Konto"
								>
									<svg
										className="w-5 h-5"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										strokeWidth="2"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
										/>
									</svg>
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
				{/* Hero Alert - positioned below header, moves with header on scroll */}
				<HeroAlert />
			</div>
		</>
	);
}
