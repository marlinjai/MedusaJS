// busbasisberlin-storefront/src/modules/home/components/hero-alert/index.tsx
// Alert banner below header with semi-transparent red background

'use client';

import { useEffect, useState } from 'react';

type HeroAlertData = {
	enabled: boolean;
	text: string;
};

const HeroAlert = () => {
	const [alert, setAlert] = useState<HeroAlertData | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchAlertSettings = async () => {
			try {
				const backendUrl =
					process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';
				const response = await fetch(`${backendUrl}/public/settings`, {
					cache: 'no-store',
				});

				if (response.ok) {
					const data = await response.json();
					setAlert(data.hero_alert);
				}
			} catch (error) {
				console.error('[HERO-ALERT] Failed to load alert:', error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchAlertSettings();
	}, []);

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
