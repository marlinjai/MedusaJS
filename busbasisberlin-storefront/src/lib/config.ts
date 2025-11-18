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

// Create searchClient with error handling
// If Meilisearch is not configured, create a mock client to prevent crashes
let searchClient: {
	search: (requests: any[]) => Promise<{
		results: Array<{
			hits: any[];
			nbHits: number;
			page: number;
			nbPages: number;
			hitsPerPage: number;
			processingTimeMS: number;
			query: string;
			params: string;
		}>;
	}>;
};

try {
	if (!meilisearchHost || !meilisearchApiKey) {
		console.warn(
			'[MEILISEARCH] Missing configuration - Meilisearch search will not work. Please set NEXT_PUBLIC_MEILISEARCH_HOST and NEXT_PUBLIC_MEILISEARCH_API_KEY',
		);
		// Create a mock search client that returns empty results
		searchClient = {
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
		};
	} else {
		const client = instantMeiliSearch(meilisearchHost, meilisearchApiKey, {
			primaryKey: 'id',
		});
		searchClient = client.searchClient;
	}
} catch (error) {
	console.error('[MEILISEARCH] Failed to initialize search client:', error);
	// Fallback to mock client
	searchClient = {
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
	};
}

export { searchClient };
