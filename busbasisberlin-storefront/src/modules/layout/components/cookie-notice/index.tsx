/**
 * cookie-notice/index.tsx
 * Simple informational cookie notice banner
 * Since only essential cookies are used, this is informational only (no consent required)
 * Shows once per user and can be dismissed
 */
'use client';

import LocalizedClientLink from '@modules/common/components/localized-client-link';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

const COOKIE_NOTICE_KEY = 'cookie-notice-dismissed';

export default function CookieNotice() {
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		// Check if user has already dismissed the notice
		if (typeof window === 'undefined') {
			return;
		}

		const dismissed = localStorage.getItem(COOKIE_NOTICE_KEY);
		if (!dismissed) {
			// Small delay to avoid flash of content
			setTimeout(() => setIsVisible(true), 500);
		}
	}, []);

	// Add/remove class on body when cookie notice is visible
	// This adds bottom padding to prevent content from being hidden
	useEffect(() => {
		if (typeof window === 'undefined' || !document.body) {
			return;
		}

		if (isVisible) {
			document.body.classList.add('cookie-notice-visible');
		} else {
			document.body.classList.remove('cookie-notice-visible');
		}

		// Cleanup on unmount
		return () => {
			if (document.body) {
				document.body.classList.remove('cookie-notice-visible');
			}
		};
	}, [isVisible]);

	const handleDismiss = () => {
		if (typeof window === 'undefined') {
			return;
		}

		// Store dismissal preference
		localStorage.setItem(COOKIE_NOTICE_KEY, 'true');
		setIsVisible(false);
	};

	if (!isVisible) {
		return null;
	}

	return (
		<div className="fixed bottom-0 left-0 right-0 z-50 bg-ui-bg-base border-t border-ui-border-base shadow-lg">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					<div className="flex-1">
						<p className="text-sm text-ui-fg-base">
							<span className="font-semibold">Cookies:</span> Diese Website
							verwendet essentielle Cookies, um die Funktionalität zu
							gewährleisten (z.B. Warenkorb, Anmeldung). Diese Cookies sind für
							den Betrieb der Website erforderlich und erfordern keine
							Zustimmung.{' '}
							<LocalizedClientLink
								href="/privacy"
								className="underline hover:text-ui-fg-subtle transition-colors"
							>
								Mehr erfahren
							</LocalizedClientLink>
						</p>
					</div>
					<button
						onClick={handleDismiss}
						className="flex-shrink-0 p-2 text-ui-fg-subtle hover:text-ui-fg-base transition-colors rounded-md hover:bg-ui-bg-subtle-hover"
						aria-label="Cookie-Hinweis schließen"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
			</div>
		</div>
	);
}
