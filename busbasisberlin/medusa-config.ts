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
							automaticPaymentMethods: true,
							automaticCapture: true, // Automatically capture payments when orders are placed
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
	);

	// Add Meilisearch service if configured
	// Enable in development (shared mode) and production (server mode)
	if (process.env.MEILISEARCH_HOST && process.env.MEILISEARCH_API_KEY) {
		modules.push({
			resolve: './src/modules/meilisearch',
			options: {
				host: process.env.MEILISEARCH_HOST,
				apiKey: process.env.MEILISEARCH_API_KEY,
				productIndexName: process.env.MEILISEARCH_PRODUCT_INDEX || 'products',
				categoryIndexName:
					process.env.MEILISEARCH_CATEGORY_INDEX || 'categories',
			},
		});
	}

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
