// use-hero-alert-padding.ts
// Hook to dynamically apply padding based on hero alert visibility
// This ensures padding adjusts when the hero alert banner is shown/hidden

'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to check if hero alert is visible and return appropriate padding classes
 * @returns boolean indicating if hero alert is visible
 */
export function useHeroAlertVisible(): boolean {
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		// Check initial state
		const checkVisibility = () => {
			if (typeof window !== 'undefined' && document.body) {
				setIsVisible(document.body.classList.contains('hero-alert-visible'));
			}
		};

		checkVisibility();

		// Watch for class changes on body
		const observer = new MutationObserver(checkVisibility);
		if (document.body) {
			observer.observe(document.body, {
				attributes: true,
				attributeFilter: ['class'],
			});
		}

		return () => {
			observer.disconnect();
		};
	}, []);

	return isVisible;
}

/**
 * Get padding classes based on hero alert visibility
 */
export function useHeroAlertPadding() {
	const isVisible = useHeroAlertVisible();

	return {
		standard: isVisible ? 'pt-32' : 'pt-24',
		large: isVisible ? 'pt-44 lg:pt-48' : 'pt-32 lg:pt-24',
		xlarge: isVisible ? 'pt-48' : 'pt-40',
	};
}
