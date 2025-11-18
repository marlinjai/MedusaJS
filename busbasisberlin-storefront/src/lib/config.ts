import Medusa from '@medusajs/js-sdk';
import { instantMeiliSearch } from '@meilisearch/instant-meilisearch';

// Defaults to standard port for Medusa server
// Use NEXT_PUBLIC_MEDUSA_BACKEND_URL for client-side (required in Vercel)
// Fall back to MEDUSA_BACKEND_URL for server-side
// Fall back to localhost for development
const MEDUSA_BACKEND_URL =
	process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
	process.env.MEDUSA_BACKEND_URL ||
	'http://localhost:9000';

export const sdk = new Medusa({
	baseUrl: MEDUSA_BACKEND_URL,
	debug: process.env.NODE_ENV === 'development',
	publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
});

// Meilisearch configuration for React InstantSearch
// In production, this connects through nginx proxy at /search/
// In development, connect to Meilisearch directly on localhost:7700
const meilisearchHost =
	process.env.NEXT_PUBLIC_MEILISEARCH_HOST ||
	(process.env.NODE_ENV === 'production'
		? 'https://basiscamp-berlin.de/search'
		: 'http://localhost:7700');

const meilisearchApiKey = process.env.NEXT_PUBLIC_MEILISEARCH_API_KEY || '';

// Create a mock search client that returns empty results
// This is used as a fallback if Meilisearch is not configured or fails to load
const createMockSearchClient = () => ({
	search: async () => ({
		results: [
			{
				hits: [],
				nbHits: 0,
				page: 0,
				nbPages: 0,
				hitsPerPage: 0,
				processingTimeMS: 0,
				query: '',
				params: '',
			},
		],
	}),
});

// Create searchClient with error handling
// If Meilisearch is not configured or fails to load, use a mock client to prevent crashes
// Type matches what React InstantSearch expects: an object with a search method
let searchClient:
	| ReturnType<typeof instantMeiliSearch>
	| ReturnType<typeof createMockSearchClient>;

try {
	if (!meilisearchHost || !meilisearchApiKey) {
		console.warn(
			'[MEILISEARCH] Missing configuration - Meilisearch search will not work. Please set NEXT_PUBLIC_MEILISEARCH_HOST and NEXT_PUBLIC_MEILISEARCH_API_KEY',
		);
		searchClient = createMockSearchClient();
	} else {
		// instantMeiliSearch returns the searchClient directly
		searchClient = instantMeiliSearch(meilisearchHost, meilisearchApiKey, {
			primaryKey: 'id',
		});
	}
} catch (error) {
	console.error('[MEILISEARCH] Failed to initialize search client:', error);
	// Fallback to mock client - this ensures the app doesn't crash
	searchClient = createMockSearchClient();
}

// Ensure searchClient is always defined - final safety check
if (!searchClient) {
	console.warn('[MEILISEARCH] searchClient is undefined, using mock client');
	searchClient = createMockSearchClient();
}

export { searchClient };
