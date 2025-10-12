import { defineConfig, loadEnv } from '@medusajs/framework/utils';

loadEnv(process.env.NODE_ENV || 'development', process.cwd());

// Environment-specific configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Build project configuration based on environment
const getProjectConfig = () => {
	const baseConfig = {
		databaseUrl: process.env.DATABASE_URL,
		databaseDriverOptions: {
			ssl: false,
			sslmode: 'disable',
		},
		http: {
			storeCors: process.env.STORE_CORS!,
			adminCors: process.env.ADMIN_CORS!,
			authCors: process.env.AUTH_CORS!,
			jwtSecret: process.env.JWT_SECRET || 'supersecret',
			cookieSecret: process.env.COOKIE_SECRET || 'supersecret',
		},
		// Worker mode configuration for production deployment
		workerMode: process.env.MEDUSA_WORKER_MODE as
			| 'shared'
			| 'worker'
			| 'server',
		// Redis URL for production (required for worker mode)
		redisUrl: process.env.REDIS_URL,
	};

	return baseConfig;
};

// Environment-specific modules
const getModules = () => {
	const modules: any[] = [];

	// Redis modules for production deployment (always include if REDIS_URL is available)
	if (process.env.REDIS_URL) {
		modules.push(
			{
				resolve: '@medusajs/medusa/cache-redis',
				options: {
					redisUrl: process.env.REDIS_URL,
				},
			},
			{
				resolve: '@medusajs/medusa/event-bus-redis',
				options: {
					redisUrl: process.env.REDIS_URL,
				},
			},
			{
				resolve: '@medusajs/medusa/workflow-engine-redis',
				options: {
					redis: {
						url: process.env.REDIS_URL,
					},
				},
			},
			{
				resolve: '@medusajs/medusa/locking',
				options: {
					providers: [
						{
							resolve: '@medusajs/medusa/locking-redis',
							id: 'locking-redis',
							is_default: true,
							options: {
								redisUrl: process.env.REDIS_URL,
							},
						},
					],
				},
			},
		);
	}
	// Development uses in-memory alternatives (default Medusa behavior) when REDIS_URL is not available

	// Common modules for all environments
	modules.push(
		// Authentication module
		{
			resolve: '@medusajs/medusa/auth',
			options: {
				providers: [
					{
						resolve: '@medusajs/medusa/auth-emailpass',
						id: 'emailpass',
						options: {
							// Email and password authentication provider
						},
					},
				],
			},
		},
		// File storage module
		{
			resolve: '@medusajs/medusa/file',
			options: {
				providers: [
					{
						resolve: '@medusajs/medusa/file-s3',
						id: 's3',
						options: {
							file_url: process.env.S3_FILE_URL,
							access_key_id: process.env.S3_ACCESS_KEY_ID,
							secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
							region: process.env.S3_REGION,
							bucket: process.env.S3_BUCKET,
							endpoint: process.env.S3_ENDPOINT,
							additional_client_config: {
								forcePathStyle: true,
							},
						},
					},
				],
			},
		},
		// Notification module
		{
			resolve: '@medusajs/medusa/notification',
			options: {
				providers: [
					{
						resolve: './src/modules/resend',
						id: 'resend',
						options: {
							channels: ['email'],
							api_key: process.env.RESEND_API_KEY,
							from: process.env.RESEND_FROM_EMAIL,
						},
					},
				],
			},
		},
		// Payment module
		{
			resolve: '@medusajs/medusa/payment',
			options: {
				providers: [
					{
						resolve: '@medusajs/medusa/payment-stripe',
						id: 'stripe',
						options: {
							apiKey: process.env.STRIPE_API_KEY,
							webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
						},
					},
				],
			},
		},
		// Custom modules
		{
			resolve: './src/modules/supplier',
		},
		{
			resolve: './src/modules/service',
		},
		{
			resolve: './src/modules/offer',
		},
		{
			resolve: './src/modules/manual-customer',
		},
		// Meilisearch plugin for advanced search and filtering
		{
			resolve: '@rokmohar/medusa-plugin-meilisearch',
			options: {
				config: {
					host: process.env.MEILISEARCH_HOST || 'http://meilisearch:7700',
					apiKey: process.env.MEILISEARCH_API_KEY || '',
				},
				settings: {
					// Products index configuration
					products: {
						type: 'products',
						enabled: true,
						fields: [
							'id',
							'title',
							'description',
							'handle',
							'status',
							'thumbnail',
							'created_at',
							'updated_at',
							'categories.id',
							'categories.name',
							'categories.handle',
							'collection.id',
							'collection.title',
							'collection.handle',
							'tags.id',
							'tags.value',
							'variants.id',
							'variants.title',
							'variants.sku',
							'variants.prices.amount',
							'variants.prices.currency_code',
							'variants.inventory_quantity',
						],
						indexSettings: {
							searchableAttributes: [
								'title',
								'description',
								'handle',
								'variants.title',
								'variants.sku',
								'categories.name',
								'collection.title',
								'tags.value',
							],
							displayedAttributes: ['*'],
							filterableAttributes: [
								'id',
								'status',
								'categories.id',
								'categories.handle',
								'collection.id',
								'collection.handle',
								'tags.value',
								'variants.prices.currency_code',
								'variants.inventory_quantity',
							],
							sortableAttributes: [
								'created_at',
								'updated_at',
								'title',
								'variants.prices.amount',
							],
							faceting: {
								maxValuesPerFacet: 2000,
							},
						},
						primaryKey: 'id',
						// Custom transformer to include sales channel data
						transformer: async (product, defaultTransformer, options) => {
							const transformedProduct = await defaultTransformer(
								product,
								options,
							);

							// Add sales channel IDs for filtering
							if (product.sales_channels) {
								transformedProduct.sales_channel_ids =
									product.sales_channels.map(sc => sc.id);
							}

							// Add category IDs for easier filtering
							if (product.categories) {
								transformedProduct.category_ids = product.categories.map(
									cat => cat.id,
								);
								transformedProduct.category_handles = product.categories.map(
									cat => cat.handle,
								);
							}

							// Add stock status for filtering
							if (product.variants && product.variants.length > 0) {
								const hasStock = product.variants.some(
									variant =>
										variant.inventory_quantity &&
										variant.inventory_quantity > 0,
								);
								transformedProduct.in_stock = hasStock;
								transformedProduct.stock_status = hasStock
									? 'in_stock'
									: 'out_of_stock';
							}

							return transformedProduct;
						},
					},
					// Categories index configuration
					categories: {
						type: 'categories',
						enabled: true,
						fields: [
							'id',
							'name',
							'description',
							'handle',
							'is_active',
							'parent_category_id',
							'created_at',
							'updated_at',
						],
						indexSettings: {
							searchableAttributes: ['name', 'description'],
							displayedAttributes: ['*'],
							filterableAttributes: [
								'id',
								'handle',
								'is_active',
								'parent_category_id',
							],
							sortableAttributes: ['name', 'created_at'],
						},
						primaryKey: 'id',
					},
				},
				// i18n configuration for future multilingual support
				i18n: {
					strategy: 'field-suffix',
					languages: ['de', 'en'], // German as primary, English as secondary
					defaultLanguage: 'de',
					translatableFields: ['title', 'description', 'name'],
				},
			},
		},
	);

	return modules;
};

module.exports = defineConfig({
	projectConfig: getProjectConfig(),
	// Admin configuration
	admin: {
		disable: process.env.DISABLE_MEDUSA_ADMIN === 'true',
		backendUrl: process.env.MEDUSA_BACKEND_URL,
	},
	modules: getModules(),
});
