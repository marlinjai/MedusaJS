// busbasisberlin-storefront/src/modules/home/components/hero-alert/index.tsx
// Alert banner below header with semi-transparent red background

'use client';

import { useEffect, useRef, useState } from 'react';

type HeroAlertData = {
	enabled: boolean;
	text: string;
};

// Simple hash function to create a unique identifier from alert text
// This ensures banner reappears when text changes
const getAlertHash = (text: string): string => {
	if (!text) return '';
	// Use first 50 chars as identifier for simplicity and readability
	return text.slice(0, 50).replace(/\s+/g, '-');
};

const HeroAlert = () => {
	const [alert, setAlert] = useState<HeroAlertData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isDismissed, setIsDismissed] = useState(false);
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
					console.log('[HERO-ALERT] Settings data:', data);
					console.log('[HERO-ALERT] Hero alert data:', data.hero_alert);
					setAlert(data.hero_alert);
				} else {
					console.error(
						'[HERO-ALERT] Failed to load alert:',
						response.status,
						response.statusText,
					);
				}
			} catch (error) {
				console.error('[HERO-ALERT] Failed to load alert:', error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchAlertSettings();
	}, []);

	// Check sessionStorage for dismissal state when alert text is loaded
	// Using sessionStorage means banner reappears when user returns to site in new tab/session
	useEffect(() => {
		if (!alert?.text || typeof window === 'undefined') {
			return;
		}

		const alertHash = getAlertHash(alert.text);
		const storageKey = `hero-alert-dismissed-${alertHash}`;
		// Check sessionStorage instead of localStorage
		// This means dismissal only persists for current browser session
		const dismissed = sessionStorage.getItem(storageKey) === 'true';
		setIsDismissed(dismissed);
	}, [alert?.text]);

	// Add/remove class on body when banner is visible
	// Only update when visibility actually changes to prevent infinite loops
	useEffect(() => {
		if (typeof window === 'undefined' || !document.body) {
			return;
		}

		// Banner is visible if enabled, has text, not loading, and not dismissed
		const isVisible =
			!isLoading && alert && alert.enabled && !!alert.text?.trim() && !isDismissed;

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
	}, [isLoading, alert?.enabled, alert?.text, isDismissed]);

	// Handle close button click
	const handleClose = () => {
		if (!alert?.text) return;

		const alertHash = getAlertHash(alert.text);
		const storageKey = `hero-alert-dismissed-${alertHash}`;

		// Save dismissal to sessionStorage (not localStorage)
		// This means banner will reappear when user opens site in new tab/session
		sessionStorage.setItem(storageKey, 'true');

		// Update state to hide banner immediately
		setIsDismissed(true);
	};

	// Debug logging
	if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
		console.log('[HERO-ALERT] Render check:', {
			isLoading,
			alert,
			enabled: alert?.enabled,
			text: alert?.text,
			isDismissed,
			willRender: !isLoading && alert && alert.enabled && !!alert.text?.trim() && !isDismissed,
		});
	}

	// Don't render if loading, disabled, empty text, or dismissed
	if (isLoading || !alert || !alert.enabled || !alert.text?.trim() || isDismissed) {
		return null;
	}

	return (
		<div className="w-full bg-red-600/20 backdrop-blur-md border-b border-red-500/30 relative z-50">
			<div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3">
				{/* Container for text and close button */}
				<div className="relative flex items-center justify-center">
					{/* Alert text - centered with padding on right for close button */}
					<p className="text-white text-center text-sm md:text-base font-medium pr-12">
						{alert.text}
					</p>

					{/* Close button - absolute positioned on the right */}
					<button
						onClick={handleClose}
						aria-label="Banner schließen"
						className="absolute right-0 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-full transition-colors duration-200 group"
					>
						{/* X icon - simple SVG cross */}
						<svg
							className="w-5 h-5 text-white group-hover:text-white/80"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth="2"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>
			</div>
		</div>
	);
};

export default HeroAlert;
