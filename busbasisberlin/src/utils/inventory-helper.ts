/**
 * inventory-helper.ts
 * Utility functions for inventory display logic and shipping information
 */

import * as fs from 'fs';
import * as path from 'path';

const SETTINGS_FILE_PATH = path.join(
	process.cwd(),
	'data',
	'inventory-settings.json',
);

export type InventorySettings = {
	low_stock_threshold: number;
	show_exact_stock: boolean;
	hide_stock_on_backorder: boolean;
};

export type StockDisplayInfo = {
	showQuantity: boolean;
	stockLevel: number;
	isLowStock: boolean;
	isInStock: boolean;
	displayMessage: string;
	statusClass: 'available' | 'low-stock' | 'backorder' | 'out-of-stock';
};

export type ShippingTimeInfo = {
	deliveryDays: string;
	shippingClass: 'standard' | 'extended' | 'oversized';
	displayMessage: string;
	hasExtendedShipping: boolean;
};

/**
 * Get inventory settings from file or return defaults
 */
export async function getInventorySettings(): Promise<InventorySettings> {
	try {
		if (fs.existsSync(SETTINGS_FILE_PATH)) {
			const fileContent = fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8');
			const data = JSON.parse(fileContent);
			return data.settings;
		}
	} catch (error) {
		console.error('Error reading inventory settings:', error);
	}

	// Return defaults if file doesn't exist or error occurred
	return {
		low_stock_threshold: 5,
		show_exact_stock: true,
		hide_stock_on_backorder: true,
	};
}

/**
 * Synchronous version for cases where async is not possible
 */
export function getInventorySettingsSync(): InventorySettings {
	try {
		if (fs.existsSync(SETTINGS_FILE_PATH)) {
			const fileContent = fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8');
			const data = JSON.parse(fileContent);
			return data.settings;
		}
	} catch (error) {
		console.error('Error reading inventory settings:', error);
	}

	return {
		low_stock_threshold: 5,
		show_exact_stock: true,
		hide_stock_on_backorder: true,
	};
}

/**
 * Calculate stock display information for a variant
 */
export function getStockDisplayInfo(
	variant: any,
	settings?: InventorySettings,
): StockDisplayInfo {
	const config = settings || {
		low_stock_threshold: 5,
		show_exact_stock: true,
		hide_stock_on_backorder: true,
	};

	const stockQty = variant?.inventory_quantity || 0;
	const allowBackorder = variant?.allow_backorder || false;
	const manageInventory = variant?.manage_inventory !== false;

	// Determine if product is in stock
	const isInStock =
		!manageInventory || // Inventory not managed = always available
		stockQty > 0 || // Has stock
		allowBackorder; // Backorder allowed

	// Determine if we should show the exact quantity
	const isBackorderWithNoStock = allowBackorder && stockQty === 0;
	const showQuantity =
		config.show_exact_stock &&
		!(config.hide_stock_on_backorder && isBackorderWithNoStock) &&
		stockQty > 0;

	// Check if stock is low
	const isLowStock =
		manageInventory && stockQty > 0 && stockQty <= config.low_stock_threshold;

	// Determine status class and message
	let statusClass: StockDisplayInfo['statusClass'];
	let displayMessage: string;

	if (!manageInventory) {
		statusClass = 'available';
		displayMessage = 'Verfügbar';
	} else if (stockQty > config.low_stock_threshold) {
		statusClass = 'available';
		displayMessage = showQuantity ? `${stockQty} Stück verfügbar` : 'Verfügbar';
	} else if (isLowStock) {
		statusClass = 'low-stock';
		displayMessage = showQuantity
			? `${stockQty} Stück verfügbar`
			: 'Nur noch wenige verfügbar';
	} else if (isBackorderWithNoStock) {
		statusClass = 'backorder';
		displayMessage = 'Verfügbar'; // Hide stock quantity for backorder
	} else if (stockQty === 0 && !allowBackorder) {
		statusClass = 'out-of-stock';
		displayMessage = 'Zurzeit nicht lieferbar';
	} else {
		statusClass = 'available';
		displayMessage = 'Verfügbar';
	}

	return {
		showQuantity,
		stockLevel: stockQty,
		isLowStock,
		isInStock,
		displayMessage,
		statusClass,
	};
}

/**
 * Determine shipping time information based on shipping profile
 */
export function getShippingTimeInfo(
	shippingProfile: any,
	isBackorder: boolean = false,
): ShippingTimeInfo {
	const profileName = shippingProfile?.name?.toLowerCase() || '';

	// Check for oversized/special shipping (Sperrgut)
	if (
		profileName.includes('sperrgut') ||
		profileName.includes('speergut') ||
		shippingProfile?.type === 'oversized'
	) {
		return {
			deliveryDays: 'Auf Anfrage',
			shippingClass: 'oversized',
			displayMessage: 'Versandkosten auf Anfrage',
			hasExtendedShipping: true,
		};
	}

	// Check for extended delivery time
	const hasExtendedShipping =
		profileName.includes('längere lieferzeit') ||
		profileName.includes('langere lieferzeit') ||
		isBackorder;

	if (hasExtendedShipping) {
		return {
			deliveryDays: '7-10',
			shippingClass: 'extended',
			displayMessage: 'Lieferzeit: 7-10 Werktage',
			hasExtendedShipping: true,
		};
	}

	// Standard shipping
	return {
		deliveryDays: '2-3',
		shippingClass: 'standard',
		displayMessage: 'Lieferzeit: 2-3 Werktage',
		hasExtendedShipping: false,
	};
}

/**
 * Calculate delivery days based on shipping profile and stock status
 */
export function calculateDeliveryDays(shippingProfile: any): string {
	const shippingInfo = getShippingTimeInfo(shippingProfile, false);
	return shippingInfo.deliveryDays;
}
