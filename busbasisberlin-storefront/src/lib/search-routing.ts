// busbasisberlin-storefront/src/lib/search-routing.ts
// InstantSearch routing configuration for URL state synchronization

import type { UiState } from 'instantsearch.js';

const INDEX_NAME = process.env.NEXT_PUBLIC_MEILISEARCH_INDEX_NAME || 'products';

/**
 * Maps InstantSearch UI state to URL parameters
 * Converts internal state (e.g., hierarchicalMenu) to clean URL params
 */
function stateToRoute(uiState: UiState): Record<string, any> {
	const indexUiState = uiState[INDEX_NAME] || {};

	// Extract hierarchical category
	// Meilisearch stores categories as an ARRAY: ["Parent", "Child", "Grandchild"]
	// We need to JOIN them with " > " to create the full path for the URL
	const hierarchicalMenu = indexUiState.hierarchicalMenu || {};
	const categoryArray = hierarchicalMenu['hierarchical_categories.lvl0'] || [];
	const categoryPath = categoryArray.length > 0 
		? categoryArray.join(' > ') 
		: undefined;

	// Extract refinement lists
	const refinementList = indexUiState.refinementList || {};
	const availability = refinementList.is_available?.[0] || undefined;
	const tags = refinementList.tags || undefined;

	return {
		q: indexUiState.query || undefined,
		category: categoryPath || undefined,
		available: availability || undefined,
		tags: tags && tags.length > 0 ? tags : undefined,
		page:
			indexUiState.page && indexUiState.page > 1
				? indexUiState.page
				: undefined,
		sortBy:
			indexUiState.sortBy !== INDEX_NAME ? indexUiState.sortBy : undefined,
		hitsPerPage:
			indexUiState.hitsPerPage && indexUiState.hitsPerPage !== 12
				? indexUiState.hitsPerPage
				: undefined,
	};
}

/**
 * Maps URL parameters back to InstantSearch UI state
 * Converts clean URL params to internal state structure
 */
function routeToState(routeState: Record<string, any>): UiState {
	// Convert category path back to array format for Meilisearch
	// URL: "Parent > Child > Grandchild" → Array: ["Parent", "Child", "Grandchild"]
	const categoryArray = routeState.category 
		? routeState.category.split(' > ') 
		: [];

	return {
		[INDEX_NAME]: {
			query: routeState.q || '',
			// Only include hierarchicalMenu when a category IS selected
			// Meilisearch expects the array at lvl0
			...(categoryArray.length > 0 && {
				hierarchicalMenu: {
					'hierarchical_categories.lvl0': categoryArray,
				},
			}),
			refinementList: {
				is_available: routeState.available ? [routeState.available] : [],
				tags: Array.isArray(routeState.tags)
					? routeState.tags
					: routeState.tags
					? [routeState.tags]
					: [],
			},
			page: routeState.page ? parseInt(routeState.page, 10) : 1,
			sortBy: routeState.sortBy || INDEX_NAME,
			hitsPerPage: routeState.hitsPerPage
				? parseInt(routeState.hitsPerPage, 10)
				: 12,
		},
	};
}

/**
 * Creates InstantSearch routing configuration
 * Must be called client-side only (after component mount)
 *
 * @returns routing configuration object or undefined for SSR
 */
export function createRouting() {
	// Only enable routing on client-side
	if (typeof window === 'undefined') {
		return undefined;
	}

	// Lazy import history router to avoid SSR issues
	const { history } = require('instantsearch.js/es/lib/routers');

	return {
		router: history({
			cleanUrlOnDispose: false,
			windowTitle: (routeState: Record<string, any>) => {
				const parts = ['Shop'];
				if (routeState.category) parts.push(routeState.category);
				if (routeState.q) parts.push(`"${routeState.q}"`);
				return `${parts.join(' - ')} | BusBasisBerlin`;
			},
		}),
		stateMapping: {
			stateToRoute,
			routeToState,
		},
	};
}
