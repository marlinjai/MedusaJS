'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import LocalizedClientLink from '@modules/common/components/localized-client-link';
import { mainNavItems } from '@modules/layout/config/navigation';

export default function NavClient() {
	const pathname = usePathname();
	const [currentHash, setCurrentHash] = useState<string>('');
	const observerRef = useRef<IntersectionObserver | null>(null);

	// Check if we're on the home page
	const isHomePage =
		pathname === '/' ||
		pathname === '/de' ||
		pathname === '/en' ||
		pathname?.match(/^\/[a-z]{2}$/);

	// Track hash changes in the URL and detect sections on scroll
	useEffect(() => {
		const updateHash = () => {
			setCurrentHash(window.location.hash);
		};

		// Set initial hash
		updateHash();

		// Listen for hash changes (when clicking links)
		window.addEventListener('hashchange', updateHash);

		// Use Intersection Observer to detect which section is in view when scrolling
		if (isHomePage) {
			// Wait for DOM to be ready
			const setupObserver = () => {
				const observerOptions = {
					root: null,
					rootMargin: '-20% 0px -60% 0px', // Trigger when section is in upper portion of viewport
					threshold: [0, 0.1, 0.5, 1],
				};

				const observerCallback = (
					entries: IntersectionObserverEntry[],
				) => {
					// Find the entry with the highest intersection ratio that's intersecting
					const visibleEntries = entries.filter(
						entry => entry.isIntersecting,
					);

					if (visibleEntries.length > 0) {
						const visibleEntry = visibleEntries.sort(
							(a, b) => b.intersectionRatio - a.intersectionRatio,
						)[0];

						if (visibleEntry) {
							const id = visibleEntry.target.id;
							if (id) {
								const newHash = `#${id}`;
								// Update state without changing URL (to avoid scroll jump)
								if (window.location.hash !== newHash) {
									// Use history.replaceState to update hash without scrolling
									window.history.replaceState(null, '', newHash);
									setCurrentHash(newHash);
								}
							}
						}
					}
				};

				observerRef.current = new IntersectionObserver(
					observerCallback,
					observerOptions,
				);

				// Observe all sections with IDs that match navigation items
				const sectionIds = ['services', 'contact', 'verein'];
				sectionIds.forEach(id => {
					const element = document.getElementById(id);
					if (element && observerRef.current) {
						observerRef.current.observe(element);
					}
				});
			};

			// Setup observer after a short delay to ensure DOM is ready
			const timeoutId = setTimeout(setupObserver, 100);

			return () => {
				window.removeEventListener('hashchange', updateHash);
				clearTimeout(timeoutId);
				if (observerRef.current) {
					observerRef.current.disconnect();
					observerRef.current = null;
				}
			};
		}

		return () => {
			window.removeEventListener('hashchange', updateHash);
		};
	}, [isHomePage]);

	// Check if a nav item is active
	const isActive = (href: string) => {
		if (href === '/store') {
			return pathname?.includes('/store') || pathname?.includes('/shop');
		}
		// For hash links, check if we're on the home page AND the hash matches
		if (href.startsWith('/#')) {
			const isHomePage =
				pathname === '/' ||
				pathname === '/de' ||
				pathname === '/en' ||
				pathname?.match(/^\/[a-z]{2}$/);
			if (!isHomePage) return false;

			const hrefHash = href.substring(1); // Remove the leading '/' -> '#services'
			// Check if current hash matches exactly
			return currentHash === hrefHash;
		}
		return pathname === href || pathname?.startsWith(href);
	};

	return (
		<div className="hidden small:flex items-center space-x-8">
			{mainNavItems.map(item => {
				const active = isActive(item.href);
				return (
					<LocalizedClientLink
						key={item.href}
						href={item.href}
						className={`transition-colors duration-200 text-sm md:text-lg max-w-sm ${
							active
								? 'text-white font-medium'
								: 'text-neutral-200 hover:text-white/80'
						}`}
					>
						{item.label}
					</LocalizedClientLink>
				);
			})}
		</div>
	);
}

