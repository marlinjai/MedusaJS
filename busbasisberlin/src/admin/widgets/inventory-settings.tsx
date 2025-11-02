/**
 * inventory-settings.tsx
 * Widget for configuring inventory display settings in admin
 * Controls stock threshold, display options, and backorder handling
 */

import { defineWidgetConfig } from '@medusajs/admin-sdk';
import {
	Button,
	Checkbox,
	Container,
	Heading,
	Input,
	Label,
	Text,
	toast,
} from '@medusajs/ui';
import { useEffect, useState } from 'react';

interface InventorySettings {
	low_stock_threshold: number;
	show_exact_stock: boolean;
	hide_stock_on_backorder: boolean;
}

const InventorySettingsWidget = () => {
	const [settings, setSettings] = useState<InventorySettings>({
		low_stock_threshold: 5,
		show_exact_stock: true,
		hide_stock_on_backorder: true,
	});
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	// Load current settings on component mount
	useEffect(() => {
		loadSettings();
	}, []);

	const loadSettings = async () => {
		try {
			setLoading(true);

			const response = await fetch('/admin/settings/inventory');

			if (response.ok) {
				const data = await response.json();
				setSettings(data.settings || getDefaultSettings());
			} else {
				setSettings(getDefaultSettings());
			}
		} catch (error) {
			console.error('Failed to load inventory settings:', error);
			setSettings(getDefaultSettings());
		} finally {
			setLoading(false);
		}
	};

	const getDefaultSettings = (): InventorySettings => ({
		low_stock_threshold: 5,
		show_exact_stock: true,
		hide_stock_on_backorder: true,
	});

	const saveSettings = async () => {
		try {
			setSaving(true);

			const response = await fetch('/admin/settings/inventory', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					settings,
				}),
			});

			if (!response.ok) {
				throw new Error('Failed to save settings');
			}

			toast.success('Inventory settings saved successfully');
		} catch (error) {
			console.error('Failed to save inventory settings:', error);
			toast.error('Failed to save inventory settings');
		} finally {
			setSaving(false);
		}
	};

	const resetToDefaults = () => {
		setSettings(getDefaultSettings());
		toast.info('Settings reset to defaults');
	};

	if (loading) {
		return (
			<Container className="divide-y p-0">
				<div className="flex items-center justify-between px-6 py-4">
					<Heading level="h2">Inventory Display Settings</Heading>
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
					<Heading level="h2">Inventory Display Settings</Heading>
					<Text size="small" className="text-ui-fg-subtle mt-1">
						Configure how stock levels and availability are displayed to
						customers
					</Text>
				</div>
			</div>

			{/* Settings Form */}
			<div className="px-6 py-4 space-y-6">
				{/* Low Stock Threshold */}
				<div className="space-y-2">
					<Label htmlFor="low-stock-threshold" className="text-ui-fg-base">
						Low Stock Threshold
					</Label>
					<Input
						id="low-stock-threshold"
						type="number"
						min={1}
						max={20}
						value={settings.low_stock_threshold}
						onChange={e =>
							setSettings(prev => ({
								...prev,
								low_stock_threshold: Math.max(
									1,
									Math.min(20, Number(e.target.value)),
								),
							}))
						}
						className="w-32"
					/>
					<Text size="small" className="text-ui-fg-subtle">
						Products with stock at or below this level will show "Nur noch
						wenige verfügbar" warning. Range: 1-20 units.
					</Text>
				</div>

				{/* Display Options */}
				<div className="space-y-4 pt-4 border-t border-ui-border-base">
					<Text weight="plus" className="text-ui-fg-base">
						Display Options
					</Text>

					{/* Show Exact Stock */}
					<div className="flex items-start gap-3 p-3 border border-ui-border-base rounded-lg">
						<Checkbox
							id="show-exact-stock"
							checked={settings.show_exact_stock}
							onCheckedChange={() =>
								setSettings(prev => ({
									...prev,
									show_exact_stock: !prev.show_exact_stock,
								}))
							}
							className="mt-1"
						/>
						<div className="flex-1">
							<label htmlFor="show-exact-stock" className="cursor-pointer">
								<Text weight="plus" className="text-ui-fg-base">
									Show Exact Stock Quantity
								</Text>
								<Text size="small" className="text-ui-fg-subtle mt-1">
									Display exact number of units available (e.g., "5 Stück
									verfügbar"). If disabled, only shows availability status.
								</Text>
							</label>
						</div>
					</div>

					{/* Hide Stock on Backorder */}
					<div className="flex items-start gap-3 p-3 border border-ui-border-base rounded-lg">
						<Checkbox
							id="hide-stock-backorder"
							checked={settings.hide_stock_on_backorder}
							onCheckedChange={() =>
								setSettings(prev => ({
									...prev,
									hide_stock_on_backorder: !prev.hide_stock_on_backorder,
								}))
							}
							className="mt-1"
						/>
						<div className="flex-1">
							<label htmlFor="hide-stock-backorder" className="cursor-pointer">
								<Text weight="plus" className="text-ui-fg-base">
									Hide Stock Quantity for Backorder Items
								</Text>
								<Text size="small" className="text-ui-fg-subtle mt-1">
									When a product has backorder enabled and stock is 0, show
									"Verfügbar" without revealing the stock quantity. Recommended
									for better UX.
								</Text>
							</label>
						</div>
					</div>
				</div>

				{/* Action Buttons */}
				<div className="flex items-center gap-3 pt-4 border-t border-ui-border-base">
					<Button variant="primary" onClick={saveSettings} disabled={saving}>
						{saving ? 'Saving...' : 'Save Settings'}
					</Button>
					<Button variant="secondary" onClick={resetToDefaults} disabled={saving}>
						Reset to Defaults
					</Button>
				</div>

				{/* Info Box */}
				<div className="p-3 bg-ui-bg-subtle border border-ui-border-base rounded-lg">
					<Text size="small" className="text-ui-fg-subtle">
						<strong>Current Settings:</strong>
						<br />• Low Stock Warning: {settings.low_stock_threshold} units or
						less
						<br />• Exact Stock Display:{' '}
						{settings.show_exact_stock ? 'Enabled' : 'Disabled'}
						<br />• Hide Backorder Stock:{' '}
						{settings.hide_stock_on_backorder ? 'Enabled' : 'Disabled'}
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

export default InventorySettingsWidget;


