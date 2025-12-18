// busbasisberlin-storefront/src/lib/context/store-settings-context.tsx
// Context provider for store settings including product display preferences

'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type ProductDisplaySettings = {
	show_subtitle_in_cards: boolean;
	show_subtitle_in_product_page: boolean;
};

type StoreSettings = {
	product_display: ProductDisplaySettings;
};

type StoreSettingsContextType = {
	settings: StoreSettings;
	loading: boolean;
};

const StoreSettingsContext = createContext<StoreSettingsContextType>({
	settings: {
		product_display: {
			show_subtitle_in_cards: false,
			show_subtitle_in_product_page: true,
		},
	},
	loading: true,
});

export function StoreSettingsProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [settings, setSettings] = useState<StoreSettings>({
		product_display: {
			show_subtitle_in_cards: false,
			show_subtitle_in_product_page: true,
		},
	});
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function fetchSettings() {
			try {
				const response = await fetch('/api/public/settings');
				if (response.ok) {
					const data = await response.json();
					setSettings({
						product_display: data.product_display || {
							show_subtitle_in_cards: false,
							show_subtitle_in_product_page: true,
						},
					});
				}
			} catch (error) {
				console.error('Failed to fetch store settings:', error);
			} finally {
				setLoading(false);
			}
		}

		fetchSettings();
	}, []);

	return (
		<StoreSettingsContext.Provider value={{ settings, loading }}>
			{children}
		</StoreSettingsContext.Provider>
	);
}

export function useStoreSettings() {
	return useContext(StoreSettingsContext);
}

