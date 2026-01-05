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

	// Extract hierarchical category - find the deepest selected level
	// This ensures subcategories are preserved when paginating
	const hierarchicalMenu = indexUiState.hierarchicalMenu || {};
	const categoryPath =
		hierarchicalMenu['hierarchical_categories.lvl3']?.[0] ||
		hierarchicalMenu['hierarchical_categories.lvl2']?.[0] ||
		hierarchicalMenu['hierarchical_categories.lvl1']?.[0] ||
		hierarchicalMenu['hierarchical_categories.lvl0']?.[0] ||
		undefined;

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
	// Determine the correct level based on category path depth
	// Category paths use " > " separator (e.g., "Beleuchtung > Scheinwerfer")
	const categoryLevel = routeState.category
		? `hierarchical_categories.lvl${(routeState.category.match(/ > /g) || []).length}`
		: null;

	return {
		[INDEX_NAME]: {
			query: routeState.q || '',
			// Only include hierarchicalMenu when a category IS selected
			// Empty array = "filter active with no values" = no results
			// Omitting the key = "no filter" = show all products
			...(categoryLevel && {
				hierarchicalMenu: {
					[categoryLevel]: [routeState.category],
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
