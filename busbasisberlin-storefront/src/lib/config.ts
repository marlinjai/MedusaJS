import Medusa from '@medusajs/js-sdk';
import { instantMeiliSearch } from '@meilisearch/instant-meilisearch';

// Defaults to standard port for Medusa server
let MEDUSA_BACKEND_URL = 'http://localhost:9000';

if (process.env.MEDUSA_BACKEND_URL) {
	MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL;
}

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
		? 'https://busbasisberlin.de/search'
		: 'http://localhost:7700');

export const { searchClient } = instantMeiliSearch(
	meilisearchHost,
	process.env.NEXT_PUBLIC_MEILISEARCH_API_KEY || '',
	{
		primaryKey: 'id',
	},
);
