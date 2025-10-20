const { Meilisearch } = require('meilisearch');
import { MedusaError } from '@medusajs/framework/utils';

type MeilisearchOptions = {
	host: string;
	apiKey: string;
	productIndexName: string;
	categoryIndexName?: string;
};

export type MeilisearchIndexType = 'product' | 'category';

export default class MeilisearchModuleService {
	private client: typeof Meilisearch;
	private options: MeilisearchOptions;

	constructor({}, options: MeilisearchOptions) {
		if (!options.host || !options.apiKey || !options.productIndexName) {
			throw new MedusaError(
				MedusaError.Types.INVALID_ARGUMENT,
				'Meilisearch options are required',
			);
		}
		this.client = new Meilisearch({
			host: options.host,
			apiKey: options.apiKey,
		});
		this.options = options;
	}

	async getIndexName(type: MeilisearchIndexType) {
		switch (type) {
			case 'product':
				console.log(
					'🔍 Using product index name:',
					this.options.productIndexName,
				);
				return this.options.productIndexName;
			case 'category':
				const categoryIndexName =
					this.options.categoryIndexName || 'categories';
				console.log('🔍 Using category index name:', categoryIndexName);
				return categoryIndexName;
			default:
				throw new Error(`Invalid index type: ${type}`);
		}
	}

	async indexData(
		data: Record<string, unknown>[],
		type: MeilisearchIndexType = 'product',
	) {
		const indexName = await this.getIndexName(type);
		const index = this.client.index(indexName);

		// Transform data to include id as primary key for Meilisearch
		const documents = data.map(item => ({
			...item,
			id: item.id,
		}));

		console.log(
			`🔍 Indexing ${documents.length} documents to index: ${indexName}`,
		);
		if (documents.length > 0) {
			console.log('🔍 Sample document being indexed:', {
				id: documents[0].id,
				title: (documents[0] as any).title,
				category_names: (documents[0] as any).category_names,
				category_paths: (documents[0] as any).category_paths,
			});
		}

		const result = await index.addDocuments(documents);
		console.log('🔍 Meilisearch indexing result:', result);
	}

	async ensureIndexConfiguration(type: MeilisearchIndexType = 'product') {
		const indexName = await this.getIndexName(type);

		// First, ensure the index exists
		try {
			await this.client.getIndex(indexName);
			console.log(`✅ Index "${indexName}" already exists`);
		} catch (error) {
			// Index doesn't exist, create it
			console.log(`📝 Creating index "${indexName}"...`);
			await this.client.createIndex(indexName, { primaryKey: 'id' });
			console.log(`✅ Index "${indexName}" created successfully`);
		}

		const index = this.client.index(indexName);

		// Configure index settings for optimal search and faceting
		if (type === 'product') {
			await this.configureProductIndex(index);
		} else if (type === 'category') {
			await this.configureCategoryIndex(index);
		}
	}

	private async configureProductIndex(index: any) {
		try {
			// Configure filterable attributes first (required for faceted search)
			await index.updateFilterableAttributes([
				'category_names',
				'category_handles',
				'category_paths',
				'category_ids',
				'is_available',
				'status',
				'min_price',
				'max_price',
				'price_range',
				'currencies',
				'tags',
				'collection_id',
				'collection_handle',
				'collection_title',
				'variant_count',
			]);

			// Wait a bit for the filterable attributes to be processed
			await new Promise(resolve => setTimeout(resolve, 1000));

			// Configure searchable attributes (ranked by importance)
			await index.updateSearchableAttributes([
				'title',
				'searchable_text',
				'description',
				'category_names',
				'tags',
				'skus',
				'collection_title',
			]);

			// Configure sortable attributes
			await index.updateSortableAttributes([
				'title',
				'created_at',
				'updated_at',
				'min_price',
				'max_price',
				'variant_count',
			]);

			// Configure faceting settings for real-time category facets
			await index.updateFaceting({
				maxValuesPerFacet: 100,
				sortFacetValuesBy: {
					category_names: 'count',
					category_paths: 'count',
					tags: 'count',
					currencies: 'alpha',
					is_available: 'count',
					collection_title: 'count',
				},
			});

			// Configure ranking rules for better search relevance
			await index.updateRankingRules([
				'words',
				'typo',
				'proximity',
				'attribute',
				'sort',
				'exactness',
				'min_price:asc', // Prefer lower prices
			]);

			// Configure displayed attributes (what gets returned in search results)
			await index.updateDisplayedAttributes([
				'id',
				'title',
				'description',
				'handle',
				'thumbnail',
				'status',
				'category_names',
				'category_paths',
				'is_available',
				'min_price',
				'max_price',
				'currencies',
				'tags',
				'collection_title',
				'skus',
				'variant_count',
			]);

			console.log('✅ Meilisearch index configuration completed successfully');
		} catch (error) {
			console.warn('⚠️ Failed to configure Meilisearch index settings:', error);
			throw error; // Re-throw to handle in calling code
		}
	}

	private async configureCategoryIndex(index: any) {
		try {
			// Configure filterable attributes for category faceted search
			await index.updateFilterableAttributes([
				'parent_category_id',
				'is_active',
				'is_internal',
				'rank',
				'created_at',
				'updated_at',
			]);

			// Wait for filterable attributes to be processed
			await new Promise(resolve => setTimeout(resolve, 500));

			// Configure searchable attributes (ranked by importance)
			await index.updateSearchableAttributes([
				'name',
				'description',
				'handle',
				'mpath',
			]);

			// Configure sortable attributes
			await index.updateSortableAttributes([
				'name',
				'rank',
				'created_at',
				'updated_at',
			]);

			// Configure faceting settings
			await index.updateFaceting({
				maxValuesPerFacet: 50,
				sortFacetValuesBy: {
					is_active: 'count',
					parent_category_id: 'alpha',
				},
			});

			// Configure ranking rules
			await index.updateRankingRules([
				'words',
				'typo',
				'proximity',
				'attribute',
				'sort',
				'exactness',
				'rank:asc', // Categories with lower rank (higher priority) first
			]);

			// Configure displayed attributes
			await index.updateDisplayedAttributes([
				'id',
				'name',
				'description',
				'handle',
				'is_active',
				'is_internal',
				'parent_category_id',
				'parent_category_name',
				'category_children',
				'mpath',
				'rank',
				'created_at',
				'updated_at',
			]);

			console.log(
				'✅ Meilisearch category index configuration completed successfully',
			);
		} catch (error) {
			console.warn(
				'⚠️ Failed to configure Meilisearch category index settings:',
				error,
			);
			throw error;
		}
	}

	async retrieveFromIndex(
		documentIds: string[],
		type: MeilisearchIndexType = 'product',
	) {
		const indexName = await this.getIndexName(type);
		const index = this.client.index(indexName);

		const results = await Promise.all(
			documentIds.map(async id => {
				try {
					return await index.getDocument(id);
				} catch (error) {
					// Document not found, return null
					return null;
				}
			}),
		);

		return results.filter(Boolean);
	}

	async deleteFromIndex(
		documentIds: string[],
		type: MeilisearchIndexType = 'product',
	) {
		const indexName = await this.getIndexName(type);
		const index = this.client.index(indexName);

		await index.deleteDocuments(documentIds);
	}

	async search(query: string, type: MeilisearchIndexType = 'product') {
		const indexName = await this.getIndexName(type);
		const index = this.client.index(indexName);

		return await index.search(query);
	}

	async searchWithFacets(
		query: string,
		options: {
			filters?: string[];
			facets?: string[];
			sort?: string[];
			limit?: number;
			offset?: number;
		} = {},
		type: MeilisearchIndexType = 'product',
	) {
		const indexName = await this.getIndexName(type);
		const index = this.client.index(indexName);

		const searchOptions: any = {
			limit: options.limit || 20,
			offset: options.offset || 0,
		};

		// Add filters for category, availability, price range, etc.
		if (options.filters && options.filters.length > 0) {
			searchOptions.filter = options.filters;
		}

		// Add facets for real-time category filtering
		if (options.facets && options.facets.length > 0) {
			searchOptions.facets = options.facets;
		} else {
			// Default facets for category filtering
			searchOptions.facets = [
				'category_names',
				'category_paths',
				'is_available',
				'currencies',
				'tags',
				'collection_title',
			];
		}

		// Add sorting
		if (options.sort && options.sort.length > 0) {
			searchOptions.sort = options.sort;
		}

		return await index.search(query, searchOptions);
	}

	async getFacetDistribution(
		facets: string[],
		type: MeilisearchIndexType = 'product',
	) {
		const indexName = await this.getIndexName(type);
		const index = this.client.index(indexName);

		return await index.search('', {
			facets,
			limit: 0, // We only want facet data, not documents
		});
	}

	async listIndexes() {
		const indexes = await this.client.getIndexes();
		return indexes.results.map((index: any) => ({
			uid: index.uid,
			primaryKey: index.primaryKey,
			createdAt: index.createdAt,
			updatedAt: index.updatedAt,
		}));
	}

	async getIndexStats(type: MeilisearchIndexType = 'product') {
		const indexName = await this.getIndexName(type);
		const index = this.client.index(indexName);
		return await index.getStats();
	}
}
