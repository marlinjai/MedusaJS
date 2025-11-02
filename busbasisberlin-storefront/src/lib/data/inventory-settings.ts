// inventory-settings.ts
// Fetch inventory display settings from backend

'use server';

export type InventorySettings = {
	low_stock_threshold: number;
	show_exact_stock: boolean;
	hide_stock_on_backorder: boolean;
};

/**
 * Fetch inventory settings from backend
 * Returns defaults if unable to fetch
 */
export async function getInventorySettings(): Promise<InventorySettings> {
	const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;

	if (!backendUrl) {
		console.warn('NEXT_PUBLIC_MEDUSA_BACKEND_URL not set, using default inventory settings');
		return getDefaultSettings();
	}

	try {
		const response = await fetch(`${backendUrl}/admin/settings/inventory`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
			// Cache for 5 minutes to avoid excessive backend calls
			next: { revalidate: 300 },
		});

		if (!response.ok) {
			console.warn('Failed to fetch inventory settings, using defaults');
			return getDefaultSettings();
		}

		const data = await response.json();
		return data.settings || getDefaultSettings();
	} catch (error) {
		console.error('Error fetching inventory settings:', error);
		return getDefaultSettings();
	}
}

/**
 * Default inventory settings
 */
function getDefaultSettings(): InventorySettings {
	return {
		low_stock_threshold: 5,
		show_exact_stock: true,
		hide_stock_on_backorder: true,
	};
}


