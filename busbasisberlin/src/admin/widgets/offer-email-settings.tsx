/**
 * offer-email-settings.tsx
 * Widget for configuring offer email notifications in admin settings
 * Allows admins to enable/disable automated emails for different offer events
 */

import { defineWidgetConfig } from '@medusajs/admin-sdk';
import {
	Button,
	Checkbox,
	Container,
	Heading,
	Text,
	toast,
} from '@medusajs/ui';
import { useEffect, useState } from 'react';

// Define available email notification types
const EMAIL_NOTIFICATION_TYPES = [
	{
		key: 'offer_created',
		label: 'Offer Created',
		description: 'Send email when a new offer is created (draft status)',
		defaultEnabled: false, // Usually don't email for draft offers
	},
	{
		key: 'offer_active',
		label: 'Offer Active',
		description:
			'Send email when offer becomes active (ready to send to customer)',
		defaultEnabled: true,
	},
	{
		key: 'offer_accepted',
		label: 'Offer Accepted',
		description: 'Send confirmation email when customer accepts the offer',
		defaultEnabled: true,
	},
	{
		key: 'offer_completed',
		label: 'Offer Completed',
		description: 'Send email when offer is fulfilled and completed',
		defaultEnabled: true,
	},
	{
		key: 'offer_cancelled',
		label: 'Offer Cancelled',
		description: 'Send notification when offer is cancelled',
		defaultEnabled: false, // Admin might not want to notify about cancellations
	},
];

interface EmailSettings {
	[key: string]: boolean;
}

const OfferEmailSettingsWidget = () => {
	const [emailSettings, setEmailSettings] = useState<EmailSettings>({});
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	// Load current settings on component mount
	useEffect(() => {
		loadEmailSettings();
	}, []);

	const loadEmailSettings = async () => {
		try {
			setLoading(true);

			// Try to fetch settings from backend
			const response = await fetch('/admin/settings/offer-email-notifications');

			if (response.ok) {
				const data = await response.json();
				setEmailSettings(data.settings || getDefaultSettings());
			} else {
				// If no settings exist yet, use defaults
				setEmailSettings(getDefaultSettings());
			}
		} catch (error) {
			console.error('Failed to load email settings:', error);
			// Fallback to defaults if API call fails
			setEmailSettings(getDefaultSettings());
		} finally {
			setLoading(false);
		}
	};

	const getDefaultSettings = (): EmailSettings => {
		const defaults: EmailSettings = {};
		EMAIL_NOTIFICATION_TYPES.forEach(type => {
			defaults[type.key] = type.defaultEnabled;
		});
		return defaults;
	};

	const handleToggle = (key: string) => {
		setEmailSettings(prev => ({
			...prev,
			[key]: !prev[key],
		}));
	};

	const saveSettings = async () => {
		try {
			setSaving(true);

			const response = await fetch(
				'/admin/settings/offer-email-notifications',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						settings: emailSettings,
					}),
				},
			);

			if (!response.ok) {
				throw new Error('Failed to save settings');
			}

			toast.success('Email notification settings saved successfully');
		} catch (error) {
			console.error('Failed to save email settings:', error);
			toast.error('Failed to save email notification settings');
		} finally {
			setSaving(false);
		}
	};

	const resetToDefaults = () => {
		setEmailSettings(getDefaultSettings());
		toast.info('Settings reset to defaults');
	};

	if (loading) {
		return (
			<Container className="divide-y p-0">
				<div className="flex items-center justify-between px-6 py-4">
					<Heading level="h2">Offer Email Notifications</Heading>
				</div>
				<div className="px-6 py-4">
					<Text className="text-ui-fg-subtle">Loading settings...</Text>
				</div>
			</Container>
		);
	}

	return (
		<Container className="divide-y p-0">
			{/* Header */}
			<div className="flex items-center justify-between px-6 py-4">
				<div>
					<Heading level="h2">Offer Email Notifications</Heading>
					<Text size="small" className="text-ui-fg-subtle mt-1">
						Configure which automated emails are sent for offer events
					</Text>
				</div>
			</div>

			{/* Settings List */}
			<div className="px-6 py-4">
				<div className="space-y-4">
					{EMAIL_NOTIFICATION_TYPES.map(emailType => (
						<div
							key={emailType.key}
							className="flex items-start gap-3 p-3 border border-ui-border-base rounded-lg"
						>
							<Checkbox
								id={emailType.key}
								checked={emailSettings[emailType.key] || false}
								onCheckedChange={() => handleToggle(emailType.key)}
								className="mt-1"
							/>
							<div className="flex-1">
								<label htmlFor={emailType.key} className="cursor-pointer">
									<Text weight="plus" className="text-ui-fg-base">
										{emailType.label}
									</Text>
									<Text size="small" className="text-ui-fg-subtle mt-1">
										{emailType.description}
									</Text>
								</label>
							</div>
							<div className="flex items-center">
								{emailSettings[emailType.key] ? (
									<span className="text-green-600 text-sm font-medium">
										Enabled
									</span>
								) : (
									<span className="text-gray-500 text-sm">Disabled</span>
								)}
							</div>
						</div>
					))}
				</div>

				{/* Action Buttons */}
				<div className="flex items-center gap-3 mt-6 pt-4 border-t border-ui-border-base">
					<Button variant="primary" onClick={saveSettings} disabled={saving}>
						{saving ? 'Saving...' : 'Save Settings'}
					</Button>
					<Button
						variant="secondary"
						onClick={resetToDefaults}
						disabled={saving}
					>
						Reset to Defaults
					</Button>
				</div>

				{/* Info Box */}
				<div className="mt-4 p-3 bg-ui-bg-subtle border border-ui-border-base rounded-lg">
					<Text size="small" className="text-ui-fg-subtle">
						<strong>Note:</strong> These settings control automated email
						notifications sent by the system. Manual PDF generation and
						downloads from the admin interface are not affected by these
						settings.
					</Text>
				</div>
			</div>
		</Container>
	);
};

// Configure widget to appear in settings page
export const config = defineWidgetConfig({
	zone: 'store.details.before',
});

export default OfferEmailSettingsWidget;
