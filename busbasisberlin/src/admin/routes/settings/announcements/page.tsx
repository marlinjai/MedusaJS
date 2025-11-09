// busbasisberlin/src/admin/routes/settings/announcements/page.tsx
// Admin UI for managing announcement banners

import { defineRouteConfig } from '@medusajs/admin-sdk';
import {
	Button,
	Container,
	Heading,
	Input,
	Label,
	Select,
	Switch,
	Text,
	toast,
} from '@medusajs/ui';
import { ArrowLeft, Megaphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface AnnouncementSettings {
	announcement_banner_enabled: boolean;
	announcement_banner_text: string;
	announcement_banner_color: string;
	announcement_banner_font_size: 'small' | 'medium' | 'large';
	hero_alert_enabled: boolean;
	hero_alert_text: string;
}

export default function AnnouncementSettingsPage() {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [settings, setSettings] = useState<AnnouncementSettings>({
		announcement_banner_enabled: false,
		announcement_banner_text: '',
		announcement_banner_color: '#dc2626', // Default red
		announcement_banner_font_size: 'medium',
		hero_alert_enabled: false,
		hero_alert_text: '',
	});

	useEffect(() => {
		loadSettings();
	}, []);

	const loadSettings = async () => {
		try {
			setLoading(true);
			const response = await fetch('/admin/stores', {
				credentials: 'include',
			});

			if (response.ok) {
				const data = await response.json();
				const store = data.stores?.[0];

				if (store?.metadata) {
					setSettings({
						announcement_banner_enabled:
							store.metadata.announcement_banner_enabled === true,
						announcement_banner_text:
							(store.metadata.announcement_banner_text as string) || '',
						announcement_banner_color:
							(store.metadata.announcement_banner_color as string) || '#dc2626',
						announcement_banner_font_size:
							(store.metadata.announcement_banner_font_size as
								| 'small'
								| 'medium'
								| 'large') || 'medium',
						hero_alert_enabled: store.metadata.hero_alert_enabled === true,
						hero_alert_text: (store.metadata.hero_alert_text as string) || '',
					});
				}
			}
		} catch (error) {
			console.error('Failed to load settings:', error);
			toast.error('Fehler beim Laden der Einstellungen');
		} finally {
			setLoading(false);
		}
	};

	const saveSettings = async () => {
		try {
			setSaving(true);

			// Get store ID first
			const storesResponse = await fetch('/admin/stores', {
				credentials: 'include',
			});

			if (!storesResponse.ok) {
				throw new Error('Failed to fetch stores');
			}

			const storesData = await storesResponse.json();
			const store = storesData.stores?.[0];

			if (!store) {
				throw new Error('No store found');
			}

			// Update store metadata
			const response = await fetch(`/admin/stores/${store.id}`, {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					metadata: {
						...store.metadata,
						announcement_banner_enabled: settings.announcement_banner_enabled,
						announcement_banner_text: settings.announcement_banner_text,
						announcement_banner_color: settings.announcement_banner_color,
						announcement_banner_font_size:
							settings.announcement_banner_font_size,
						hero_alert_enabled: settings.hero_alert_enabled,
						hero_alert_text: settings.hero_alert_text,
					},
				}),
			});

			if (!response.ok) {
				throw new Error('Failed to update settings');
			}

			toast.success('Einstellungen erfolgreich gespeichert');
		} catch (error) {
			console.error('Failed to save settings:', error);
			toast.error('Fehler beim Speichern der Einstellungen');
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<Container>
				<div className="flex items-center justify-center h-64">
					<Text size="small" className="text-ui-fg-muted">
						Wird geladen...
					</Text>
				</div>
			</Container>
		);
	}

	return (
		<Container>
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div>
					<Button
						variant="secondary"
						size="small"
						onClick={() => navigate('/settings')}
						className="mb-4"
					>
						<ArrowLeft className="w-4 h-4 mr-2" />
						Zurück
					</Button>
					<Heading level="h1" className="text-3xl font-bold">
						Ankündigungsbanner
					</Heading>
					<Text size="small" className="text-ui-fg-subtle mt-2">
						Verwalten Sie Ankündigungen auf der Startseite
					</Text>
				</div>
			</div>

			<div className="space-y-8">
				{/* Marquee Banner Section */}
				<Container className="p-6">
					<div className="space-y-6">
						<div className="flex items-center justify-between">
							<div>
								<Heading level="h2" className="text-xl font-semibold mb-2">
									Horizontales Laufband
								</Heading>
								<Text size="small" className="text-ui-fg-subtle">
									Banner zwischen Hero-Section und Services
								</Text>
							</div>
							<Switch
								checked={settings.announcement_banner_enabled}
								onCheckedChange={checked =>
									setSettings(prev => ({
										...prev,
										announcement_banner_enabled: checked,
									}))
								}
							/>
						</div>

						{settings.announcement_banner_enabled && (
							<div className="space-y-4 pt-4 border-t border-ui-border-base">
								<div>
									<Label htmlFor="banner-text">Bannertext</Label>
									<Input
										id="banner-text"
										value={settings.announcement_banner_text}
										onChange={e =>
											setSettings(prev => ({
												...prev,
												announcement_banner_text: e.target.value,
											}))
										}
										placeholder="z.B. Werkstatt geschlossen vom 20.-27. Dezember"
										className="mt-2"
									/>
								</div>

								<div>
									<Label htmlFor="banner-color">Hintergrundfarbe</Label>
									<div className="flex items-center gap-3 mt-2">
										<Input
											id="banner-color"
											type="color"
											value={settings.announcement_banner_color}
											onChange={e =>
												setSettings(prev => ({
													...prev,
													announcement_banner_color: e.target.value,
												}))
											}
											className="w-20 h-10 cursor-pointer"
										/>
										<Input
											type="text"
											value={settings.announcement_banner_color}
											onChange={e =>
												setSettings(prev => ({
													...prev,
													announcement_banner_color: e.target.value,
												}))
											}
											placeholder="#dc2626"
											className="flex-1"
										/>
									</div>
								</div>

								<div>
									<Label htmlFor="banner-font-size">Schriftgröße</Label>
									<Select
										value={settings.announcement_banner_font_size}
										onValueChange={value =>
											setSettings(prev => ({
												...prev,
												announcement_banner_font_size: value as
													| 'small'
													| 'medium'
													| 'large',
											}))
										}
									>
										<Select.Trigger className="mt-2">
											<Select.Value />
										</Select.Trigger>
										<Select.Content>
											<Select.Item value="small">
												<Text size="small">Klein</Text>
											</Select.Item>
											<Select.Item value="medium">
												<Text size="small">Mittel</Text>
											</Select.Item>
											<Select.Item value="large">
												<Text size="small">Groß</Text>
											</Select.Item>
										</Select.Content>
									</Select>
								</div>

								{/* Preview */}
								<div className="pt-4">
									<Text size="small" className="text-ui-fg-subtle mb-2">
										Vorschau:
									</Text>
									<div
										className="rounded-lg overflow-hidden text-white px-4 py-3"
										style={{
											backgroundColor: settings.announcement_banner_color,
										}}
									>
										<Text
											size={
												settings.announcement_banner_font_size === 'small'
													? 'xsmall'
													: settings.announcement_banner_font_size === 'large'
														? 'base'
														: 'small'
											}
											className="font-medium"
										>
											{settings.announcement_banner_text ||
												'Ihr Bannertext hier...'}
										</Text>
									</div>
								</div>
							</div>
						)}
					</div>
				</Container>

				{/* Hero Alert Section */}
				<Container className="p-6">
					<div className="space-y-6">
						<div className="flex items-center justify-between">
							<div>
								<Heading level="h2" className="text-xl font-semibold mb-2">
									Header-Bereich Alert
								</Heading>
								<Text size="small" className="text-ui-fg-subtle">
									Alert-Box im Header-Bereich mit rotem Hintergrund
								</Text>
							</div>
							<Switch
								checked={settings.hero_alert_enabled}
								onCheckedChange={checked =>
									setSettings(prev => ({
										...prev,
										hero_alert_enabled: checked,
									}))
								}
							/>
						</div>

						{settings.hero_alert_enabled && (
							<div className="space-y-4 pt-4 border-t border-ui-border-base">
								<div>
									<Label htmlFor="alert-text">Alert-Text</Label>
									<Input
										id="alert-text"
										value={settings.hero_alert_text}
										onChange={e =>
											setSettings(prev => ({
												...prev,
												hero_alert_text: e.target.value,
											}))
										}
										placeholder="z.B. ⚠️ Wichtig: Lieferungen verzögern sich um 2-3 Tage"
										className="mt-2"
									/>
								</div>

								{/* Preview */}
								<div className="pt-4">
									<Text size="small" className="text-ui-fg-subtle mb-2">
										Vorschau:
									</Text>
									<div className="bg-red-600/30 backdrop-blur-sm border border-red-500/50 rounded-lg px-6 py-3">
										<Text size="small" className="text-white font-medium">
											{settings.hero_alert_text || 'Ihr Alert-Text hier...'}
										</Text>
									</div>
								</div>
							</div>
						)}
					</div>
				</Container>

				{/* Save Button */}
				<div className="flex justify-end">
					<Button onClick={saveSettings} disabled={saving}>
						{saving ? 'Wird gespeichert...' : 'Einstellungen speichern'}
					</Button>
				</div>
			</div>
		</Container>
	);
}

// Route configuration for admin navigation
export const config = defineRouteConfig({
	label: 'Ankündigungen',
	icon: Megaphone,
});
