// mobile-header-icons/index.tsx
// Mobile header icons component - shows account, search (conditionally), and hamburger menu
// Search icon is hidden on store page

'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import LocalizedClientLink from '@modules/common/components/localized-client-link';
import SearchModal from '@modules/search/components/modal';

export default function MobileHeaderIcons() {
	const pathname = usePathname();
	const [searchOpen, setSearchOpen] = useState(false);
	const [searchEnabled, setSearchEnabled] = useState(true);

	// Check if we're on the store page
	const isStorePage =
		pathname?.includes('/store') || pathname?.includes('/shop');

	// Load search settings
	useEffect(() => {
		const loadSettings = async () => {
			try {
				const response = await fetch('/api/public/settings');
				if (response.ok) {
					const data = await response.json();
					setSearchEnabled(data.search?.enabled !== false);
				}
			} catch (error) {
				console.error('Failed to load search settings:', error);
				setSearchEnabled(true);
			}
		};
		loadSettings();
	}, []);

	return (
		<>
			{/* Mobile icons - only visible on mobile (below small breakpoint) */}
			<div className="small:hidden flex items-center gap-x-3">
				{/* Account Icon - always shown on mobile */}
				<LocalizedClientLink
					href="/account"
					className="text-white hover:text-white/80 transition-colors duration-200 flex items-center"
					aria-label="Konto"
					data-testid="mobile-account-link"
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

				{/* Search Icon - hidden on store page */}
				{!isStorePage && searchEnabled && (
					<button
						onClick={() => setSearchOpen(true)}
						className="text-white hover:text-white/80 transition-colors duration-200 flex items-center"
						aria-label="Suche öffnen"
						data-testid="mobile-search-button"
					>
						<svg
							className="w-5 h-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<circle cx="11" cy="11" r="8" />
							<path d="m21 21-4.35-4.35" />
						</svg>
					</button>
				)}
			</div>

			{/* Search Modal - only render on mobile to avoid duplicate with desktop ConditionalSearch */}
			{/* Desktop search is handled by ConditionalSearch component in nav */}
			{!isStorePage && searchEnabled && (
				<div className="small:hidden">
					<SearchModal
						externalIsOpen={searchOpen}
						externalSetIsOpen={setSearchOpen}
					/>
				</div>
			)}
		</>
	);
}

