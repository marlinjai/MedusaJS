/**
 * route.ts
 * API endpoints for managing inventory display settings
 * GET: Retrieve current settings
 * POST: Save new settings
 */

import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import * as fs from 'fs';
import * as path from 'path';

const SETTINGS_FILE_PATH = path.join(
	process.cwd(),
	'data',
	'inventory-settings.json',
);

interface InventorySettings {
	low_stock_threshold: number;
	show_exact_stock: boolean;
	hide_stock_on_backorder: boolean;
}

interface SettingsRequest {
	settings: InventorySettings;
}

/**
 * GET /admin/settings/inventory
 * Retrieve current inventory display settings
 */
export async function GET(
	req: MedusaRequest,
	res: MedusaResponse,
): Promise<void> {
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	try {
		let settings: InventorySettings;

		// Try to read settings from file
		if (fs.existsSync(SETTINGS_FILE_PATH)) {
			const fileContent = fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8');
			const data = JSON.parse(fileContent);
			settings = data.settings;

			logger.info('[INVENTORY-SETTINGS] Loaded settings from file');
		} else {
			// Return default settings if file doesn't exist
			settings = {
				low_stock_threshold: 5,
				show_exact_stock: true,
				hide_stock_on_backorder: true,
			};

			logger.info('[INVENTORY-SETTINGS] Using default settings');
		}

		res.json({
			settings,
			lastModified: fs.existsSync(SETTINGS_FILE_PATH)
				? fs.statSync(SETTINGS_FILE_PATH).mtime.toISOString()
				: null,
		});
	} catch (error) {
		logger.error('[INVENTORY-SETTINGS] Error retrieving settings:', error);
		res.status(500).json({
			error: 'Internal server error',
			message: 'Failed to retrieve inventory settings',
		});
	}
}

/**
 * POST /admin/settings/inventory
 * Save inventory display settings
 */
export async function POST(
	req: MedusaRequest<SettingsRequest>,
	res: MedusaResponse,
): Promise<void> {
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	try {
		const { settings } = req.body;

		if (!settings) {
			res.status(400).json({
				error: 'Validation error',
				message: 'Settings object is required',
			});
			return;
		}

		// Validate settings structure
		const requiredKeys = [
			'low_stock_threshold',
			'show_exact_stock',
			'hide_stock_on_backorder',
		];
		const missingKeys = requiredKeys.filter(key => !(key in settings));

		if (missingKeys.length > 0) {
			res.status(400).json({
				error: 'Validation error',
				message: `Missing required settings: ${missingKeys.join(', ')}`,
			});
			return;
		}

		// Validate threshold range (1-20)
		if (
			settings.low_stock_threshold < 1 ||
			settings.low_stock_threshold > 20
		) {
			res.status(400).json({
				error: 'Validation error',
				message: 'Low stock threshold must be between 1 and 20',
			});
			return;
		}

		// Ensure data directory exists
		const dataDir = path.dirname(SETTINGS_FILE_PATH);
		if (!fs.existsSync(dataDir)) {
			fs.mkdirSync(dataDir, { recursive: true });
		}

		// Save settings to file
		const settingsData = {
			settings,
			updatedAt: new Date().toISOString(),
			version: '1.0',
		};

		fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(settingsData, null, 2));

		logger.info(
			`[INVENTORY-SETTINGS] Settings saved successfully: ${JSON.stringify(settings)}`,
		);

		res.json({
			success: true,
			message: 'Inventory settings saved successfully',
			settings,
		});
	} catch (error) {
		logger.error('[INVENTORY-SETTINGS] Error saving settings:', error);
		res.status(500).json({
			error: 'Internal server error',
			message: 'Failed to save inventory settings',
		});
	}
}


