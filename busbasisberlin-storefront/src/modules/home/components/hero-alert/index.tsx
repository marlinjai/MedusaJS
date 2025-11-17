// busbasisberlin-storefront/src/modules/home/components/hero-alert/index.tsx
// Alert banner below header with semi-transparent red background

'use client';

import { useEffect, useRef, useState } from 'react';

type HeroAlertData = {
	enabled: boolean;
	text: string;
};

const HeroAlert = () => {
	const [alert, setAlert] = useState<HeroAlertData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const previousVisibilityRef = useRef<boolean | null>(null);

	useEffect(() => {
		const fetchAlertSettings = async () => {
			try {
				// Use the API proxy route which handles backend URL correctly
				const response = await fetch('/api/public/settings', {
					cache: 'no-store',
				});

				if (response.ok) {
					const data = await response.json();
					setAlert(data.hero_alert);
				} else {
					console.error('[HERO-ALERT] Failed to load alert:', response.status, response.statusText);
				}
			} catch (error) {
				console.error('[HERO-ALERT] Failed to load alert:', error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchAlertSettings();
	}, []);

	// Add/remove class on body when banner is visible
	// Only update when visibility actually changes to prevent infinite loops
	useEffect(() => {
		if (typeof window === 'undefined' || !document.body) {
			return;
		}

		const isVisible =
			!isLoading && alert && alert.enabled && !!alert.text?.trim();

		// Only update if visibility has changed
		if (previousVisibilityRef.current === isVisible) {
			return;
		}

		previousVisibilityRef.current = isVisible;

		if (isVisible) {
			document.body.classList.add('hero-alert-visible');
		} else {
			document.body.classList.remove('hero-alert-visible');
		}

		// Cleanup on unmount
		return () => {
			if (document.body) {
				document.body.classList.remove('hero-alert-visible');
			}
			previousVisibilityRef.current = null;
		};
	}, [isLoading, alert?.enabled, alert?.text]);

	// Don't render if loading, disabled, or empty text
	if (isLoading || !alert || !alert.enabled || !alert.text.trim()) {
		return null;
	}

	return (
		<div className="w-full bg-red-600/30 backdrop-blur-sm border-b border-red-500/50 relative z-50">
			<div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3">
				<p className="text-white text-center text-sm md:text-base font-medium">
					{alert.text}
				</p>
			</div>
		</div>
	);
};

export default HeroAlert;
