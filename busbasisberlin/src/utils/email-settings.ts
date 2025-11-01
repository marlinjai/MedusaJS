/**
 * email-settings.ts
 * Utility functions for checking email notification settings
 */

import * as fs from 'fs';
import * as path from 'path';

const SETTINGS_FILE_PATH = path.join(
	process.cwd(),
	'data',
	'offer-email-settings.json',
);

export interface EmailNotificationSettings {
	offer_created: boolean;
	offer_active: boolean;
	offer_accepted: boolean;
	offer_completed: boolean;
	offer_cancelled: boolean;
}

/**
 * Get current email notification settings
 * Returns default settings if file doesn't exist
 */
export function getEmailNotificationSettings(): EmailNotificationSettings {
	try {
		if (fs.existsSync(SETTINGS_FILE_PATH)) {
			const fileContent = fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8');
			const data = JSON.parse(fileContent);
			return data.settings;
		}
	} catch (error) {
		console.error('[EMAIL-SETTINGS] Error reading settings file:', error);
	}

	// Return default settings if file doesn't exist or can't be read
	return {
		offer_created: false,
		offer_active: true,
		offer_accepted: true,
		offer_completed: true,
		offer_cancelled: false,
	};
}

/**
 * Check if email notifications are enabled for a specific offer event
 */
export function isEmailNotificationEnabled(
	eventType: keyof EmailNotificationSettings,
): boolean {
	const settings = getEmailNotificationSettings();
	return settings[eventType] === true;
}

/**
 * Get email notification status for offer status transitions
 */
export function shouldSendEmailForStatusChange(
	previousStatus?: string,
	newStatus?: string,
): boolean {
	if (!previousStatus || !newStatus) return false;

	// Map status transitions to email settings
	const statusToSettingMap: { [key: string]: keyof EmailNotificationSettings } =
		{
			active: 'offer_active',
			accepted: 'offer_accepted',
			completed: 'offer_completed',
			cancelled: 'offer_cancelled',
		};

	const settingKey = statusToSettingMap[newStatus];
	if (!settingKey) return false;

	return isEmailNotificationEnabled(settingKey);
}

/**
 * Get email notification status for offer creation
 */
export function shouldSendEmailForOfferCreation(): boolean {
	return isEmailNotificationEnabled('offer_created');
}

/**
 * Check if email should be sent for a specific offer, considering both global and per-offer settings
 * Logic:
 * - Global OFF → No email (master kill switch)
 * - Global ON + Offer OFF → No email
 * - Global ON + Offer ON (or null) → Email sent
 */
export function shouldSendEmailForOffer(
	eventType: keyof EmailNotificationSettings,
	offerEmailNotifications?: EmailNotificationSettings | null,
): boolean {
	// Check global settings first (master switch)
	const globalEnabled = isEmailNotificationEnabled(eventType);

	if (!globalEnabled) {
		return false; // Global disabled = no emails
	}

	// If offer has specific settings, use them
	if (
		offerEmailNotifications &&
		offerEmailNotifications[eventType] !== undefined
	) {
		return offerEmailNotifications[eventType];
	}

	// Default to global setting if offer has no preference (backward compatibility)
	return true;
}
