// busbasisberlin/src/admin/routes/settings/store-ui/page.tsx
// Admin UI for managing all storefront UI settings

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
import { ArrowLeft, Layout, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type FAQItem = {
	question: string;
	answer: string;
};

interface StoreUISettings {
	// Search settings
	search_enabled: boolean;
	search_sort_order:
		| 'price_asc'
		| 'price_desc'
		| 'name_asc'
		| 'name_desc'
		| 'relevance';
	// Announcement banner settings
	announcement_banner_enabled: boolean;
	announcement_banner_text: string;
	announcement_banner_color: string;
	announcement_banner_font_size: 'small' | 'medium' | 'large';
	// Hero alert settings
	hero_alert_enabled: boolean;
	hero_alert_text: string;
	// FAQ settings
	faq_enabled: boolean;
	faqs: FAQItem[];
}

export default function StoreUISettingsPage() {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [settings, setSettings] = useState<StoreUISettings>({
		search_enabled: true,
		search_sort_order: 'price_asc',
		announcement_banner_enabled: false,
		announcement_banner_text: '',
		announcement_banner_color: '#dc2626',
		announcement_banner_font_size: 'medium',
		hero_alert_enabled: false,
		hero_alert_text: '',
		faq_enabled: false,
		faqs: [],
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
					// Parse FAQs from metadata (stored as JSON string or array)
					let faqs: FAQItem[] = [];
					if (store.metadata.faqs) {
						try {
							faqs =
								typeof store.metadata.faqs === 'string'
									? JSON.parse(store.metadata.faqs)
									: (store.metadata.faqs as FAQItem[]);
						} catch (e) {
							console.error('Failed to parse FAQs:', e);
							faqs = [];
						}
					}

					setSettings({
						search_enabled:
							store.metadata.search_enabled !== false, // Default to true
						search_sort_order:
							(store.metadata.search_sort_order as StoreUISettings['search_sort_order']) ||
							'price_asc',
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
						faq_enabled: store.metadata.faq_enabled === true,
						faqs: faqs || [],
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

			// Update store metadata with all settings
			const response = await fetch(`/admin/stores/${store.id}`, {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					metadata: {
						...store.metadata,
						// Search settings
						search_enabled: settings.search_enabled,
						search_sort_order: settings.search_sort_order,
						// Announcement banner settings
						announcement_banner_enabled: settings.announcement_banner_enabled,
						announcement_banner_text: settings.announcement_banner_text,
						announcement_banner_color: settings.announcement_banner_color,
						announcement_banner_font_size: settings.announcement_banner_font_size,
						// Hero alert settings
						hero_alert_enabled: settings.hero_alert_enabled,
						hero_alert_text: settings.hero_alert_text,
						// FAQ settings
						faq_enabled: settings.faq_enabled,
						faqs: JSON.stringify(settings.faqs),
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
						Store-UI Einstellungen
					</Heading>
					<Text size="small" className="text-ui-fg-subtle mt-2">
						Verwalten Sie alle UI-Elemente des Storefronts
					</Text>
				</div>
			</div>

			<div className="space-y-8">
				{/* Search Section */}
				<Container className="p-6">
					<div className="space-y-6">
						<div className="flex items-center justify-between">
							<div>
								<Heading level="h2" className="text-xl font-semibold mb-2">
									Suche
								</Heading>
								<Text size="small" className="text-ui-fg-subtle">
									Suche-Funktionalität auf der Website verwalten
								</Text>
							</div>
							<Switch
								checked={settings.search_enabled}
								onCheckedChange={checked =>
									setSettings(prev => ({
										...prev,
										search_enabled: checked,
									}))
								}
							/>
						</div>

						{settings.search_enabled && (
							<div className="space-y-4 pt-4 border-t border-ui-border-base">
								<div>
									<Label htmlFor="sort-order">Standard-Sortierung</Label>
									<Select
										value={settings.search_sort_order}
										onValueChange={value =>
											setSettings(prev => ({
												...prev,
												search_sort_order: value as StoreUISettings['search_sort_order'],
											}))
										}
									>
										<Select.Trigger className="mt-2">
											<Select.Value />
										</Select.Trigger>
										<Select.Content>
											<Select.Item value="price_asc">
												<Text size="small">Preis: Niedrig bis Hoch</Text>
											</Select.Item>
											<Select.Item value="price_desc">
												<Text size="small">Preis: Hoch bis Niedrig</Text>
											</Select.Item>
											<Select.Item value="name_asc">
												<Text size="small">Name: A-Z</Text>
											</Select.Item>
											<Select.Item value="name_desc">
												<Text size="small">Name: Z-A</Text>
											</Select.Item>
											<Select.Item value="relevance">
												<Text size="small">Relevanz</Text>
											</Select.Item>
										</Select.Content>
									</Select>
								</div>
							</div>
						)}
					</div>
				</Container>

				{/* Announcement Banner Section */}
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

				{/* FAQ Section */}
				<Container className="p-6">
					<div className="space-y-6">
						<div className="flex items-center justify-between">
							<div>
								<Heading level="h2" className="text-xl font-semibold mb-2">
									FAQ-Bereich
								</Heading>
								<Text size="small" className="text-ui-fg-subtle">
									Häufig gestellte Fragen auf der Startseite verwalten
								</Text>
							</div>
							<Switch
								checked={settings.faq_enabled}
								onCheckedChange={checked =>
									setSettings(prev => ({
										...prev,
										faq_enabled: checked,
									}))
								}
							/>
						</div>

						{settings.faq_enabled && (
							<div className="space-y-4 pt-4 border-t border-ui-border-base">
								<div className="flex items-center justify-between mb-4">
									<Text size="small" className="text-ui-fg-subtle">
										{settings.faqs.length} FAQ(s) hinzugefügt
									</Text>
									<Button
										variant="secondary"
										size="small"
										onClick={() =>
											setSettings(prev => ({
												...prev,
												faqs: [
													...prev.faqs,
													{ question: '', answer: '' },
												],
											}))
										}
									>
										<Plus className="w-4 h-4 mr-2" />
										FAQ hinzufügen
									</Button>
								</div>

								{settings.faqs.length === 0 ? (
									<Text size="small" className="text-ui-fg-subtle text-center py-8">
										Noch keine FAQs hinzugefügt. Klicken Sie auf "FAQ hinzufügen"
										um zu beginnen.
									</Text>
								) : (
									<div className="space-y-4">
										{settings.faqs.map((faq, index) => (
											<div
												key={index}
												className="border border-ui-border-base rounded-lg p-4 space-y-3"
											>
												<div className="flex items-center justify-between mb-2">
													<Text size="small" className="font-semibold">
														FAQ #{index + 1}
													</Text>
													<Button
														variant="secondary"
														size="small"
														onClick={() =>
															setSettings(prev => ({
																...prev,
																faqs: prev.faqs.filter((_, i) => i !== index),
															}))
														}
													>
														<Trash2 className="w-4 h-4" />
													</Button>
												</div>
												<div>
													<Label htmlFor={`faq-question-${index}`}>
														Frage
													</Label>
													<Input
														id={`faq-question-${index}`}
														value={faq.question}
														onChange={e => {
															const newFaqs = [...settings.faqs];
															newFaqs[index].question = e.target.value;
															setSettings(prev => ({
																...prev,
																faqs: newFaqs,
															}));
														}}
														placeholder="z.B. Welche Zahlungsmethoden akzeptieren Sie?"
														className="mt-2"
													/>
												</div>
												<div>
													<Label htmlFor={`faq-answer-${index}`}>
														Antwort
													</Label>
													<textarea
														id={`faq-answer-${index}`}
														value={faq.answer}
														onChange={e => {
															const newFaqs = [...settings.faqs];
															newFaqs[index].answer = e.target.value;
															setSettings(prev => ({
																...prev,
																faqs: newFaqs,
															}));
														}}
														placeholder="z.B. Wir akzeptieren alle gängigen Zahlungsmethoden..."
														className="mt-2 w-full min-h-[100px] px-3 py-2 border border-ui-border-base rounded-md resize-y"
														rows={4}
													/>
												</div>
											</div>
										))}
									</div>
								)}
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
	label: 'Store-UI',
	icon: Layout,
});

