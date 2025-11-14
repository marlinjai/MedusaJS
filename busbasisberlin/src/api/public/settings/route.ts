// busbasisberlin/src/api/public/settings/route.ts
// Public endpoint to fetch store settings including announcement banners
// Route is under /public instead of /store to avoid publishable API key requirement

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { Modules } from '@medusajs/framework/utils';

// Define the banner configuration types
type AnnouncementBanner = {
	enabled: boolean;
	text: string;
	color: string;
	font_size: 'small' | 'medium' | 'large';
};

type HeroAlert = {
	enabled: boolean;
	text: string;
};

type FAQ = {
	enabled: boolean;
	items: Array<{ question: string; answer: string }>;
};

type SearchSettings = {
	enabled: boolean;
	sort_order: 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc' | 'relevance';
};

type StoreSettingsResponse = {
	announcement_banner: AnnouncementBanner;
	hero_alert: HeroAlert;
	faq: FAQ;
	search: SearchSettings;
};

export const GET = async (
	req: MedusaRequest,
	res: MedusaResponse,
): Promise<void> => {
	try {
		// Get store service from container using the Modules constant
		const storeModuleService = req.scope.resolve(Modules.STORE);

		// Fetch store configuration
		const stores = await storeModuleService.listStores({});
		const store = stores[0]; // Get the default store

		if (!store) {
			res.status(404).json({
				message: 'Store not found',
			});
			return;
		}

		// Extract banner settings from store metadata
		const metadata = store.metadata || {};

		// Debug logging to help troubleshoot
		console.log(
			'[STORE-SETTINGS] Store metadata:',
			JSON.stringify(metadata, null, 2),
		);

		// Parse FAQs from metadata (stored as JSON string or array)
		let faqs: Array<{ question: string; answer: string }> = [];
		if (metadata.faqs) {
			try {
				faqs =
					typeof metadata.faqs === 'string'
						? JSON.parse(metadata.faqs)
						: (metadata.faqs as Array<{ question: string; answer: string }>);
			} catch (e) {
				console.error('[STORE-SETTINGS] Failed to parse FAQs:', e);
				faqs = [];
			}
		}

		// Prepare response with default values if metadata is not set
		const settings: StoreSettingsResponse = {
			announcement_banner: {
				enabled: metadata.announcement_banner_enabled === true,
				text: (metadata.announcement_banner_text as string) || '',
				color:
					(metadata.announcement_banner_color as string) || '#dc2626',
				font_size:
					(metadata.announcement_banner_font_size as
						| 'small'
						| 'medium'
						| 'large') || 'medium',
			},
			hero_alert: {
				enabled: metadata.hero_alert_enabled === true,
				text: (metadata.hero_alert_text as string) || '',
			},
			faq: {
				enabled: metadata.faq_enabled === true,
				items: faqs || [],
			},
			search: {
				enabled: metadata.search_enabled !== false, // Default to true
				sort_order:
					(metadata.search_sort_order as SearchSettings['sort_order']) ||
					'price_asc',
			},
		};

		console.log(
			'[STORE-SETTINGS] Returning settings:',
			JSON.stringify(settings, null, 2),
		);
		res.json(settings);
	} catch (error) {
		console.error('[STORE-SETTINGS] Error fetching store settings:', error);
		res.status(500).json({
			message: 'Failed to fetch store settings',
			error: error instanceof Error ? error.message : 'Unknown error',
		});
	}
};

// Disable authentication for this public endpoint
export const AUTHENTICATE = false;

