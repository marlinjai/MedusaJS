/**
 * route.ts
 * API endpoints for managing offer email notification settings
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
	'offer-email-settings.json',
);

interface EmailNotificationSettings {
	offer_created: boolean;
	offer_active: boolean;
	offer_accepted: boolean;
	offer_completed: boolean;
	offer_cancelled: boolean;
}

interface SettingsRequest {
	settings: EmailNotificationSettings;
}

/**
 * GET /admin/settings/offer-email-notifications
 * Retrieve current email notification settings
 */
export async function GET(
	req: MedusaRequest,
	res: MedusaResponse,
): Promise<void> {
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	try {
		let settings: EmailNotificationSettings;

		// Try to read settings from file
		if (fs.existsSync(SETTINGS_FILE_PATH)) {
			const fileContent = fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8');
			const data = JSON.parse(fileContent);
			settings = data.settings;

			logger.info('[EMAIL-SETTINGS] Loaded settings from file');
		} else {
			// Return default settings if file doesn't exist
			settings = {
				offer_created: false,
				offer_active: true,
				offer_accepted: true,
				offer_completed: true,
				offer_cancelled: false,
			};

			logger.info('[EMAIL-SETTINGS] Using default settings');
		}

		res.json({
			settings,
			lastModified: fs.existsSync(SETTINGS_FILE_PATH)
				? fs.statSync(SETTINGS_FILE_PATH).mtime.toISOString()
				: null,
		});
	} catch (error) {
		logger.error('[EMAIL-SETTINGS] Error retrieving settings:', error);
		res.status(500).json({
			error: 'Internal server error',
			message: 'Failed to retrieve email notification settings',
		});
	}
}

/**
 * POST /admin/settings/offer-email-notifications
 * Save email notification settings
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
			'offer_created',
			'offer_active',
			'offer_accepted',
			'offer_completed',
			'offer_cancelled',
		];
		const missingKeys = requiredKeys.filter(key => !(key in settings));

		if (missingKeys.length > 0) {
			res.status(400).json({
				error: 'Validation error',
				message: `Missing required settings: ${missingKeys.join(', ')}`,
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
			`[EMAIL-SETTINGS] Settings saved successfully: ${JSON.stringify(settings)}`,
		);

		res.json({
			success: true,
			message: 'Email notification settings saved successfully',
			settings,
		});
	} catch (error) {
		logger.error('[EMAIL-SETTINGS] Error saving settings:', error);
		res.status(500).json({
			error: 'Internal server error',
			message: 'Failed to save email notification settings',
		});
	}
}
