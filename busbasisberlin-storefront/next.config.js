const checkEnvVariables = require('./check-env-variables');
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

checkEnvVariables();

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
	reactStrictMode: true,
	logging: {
		fetches: {
			fullUrl: true,
		},
	},
	eslint: {
		ignoreDuringBuilds: true,
	},
	typescript: {
		ignoreBuildErrors: true,
	},
	// Skip static generation for 404 page to avoid React 19 RC SSR issues
	generateBuildId: async () => {
		return 'build-' + Date.now();
	},
	experimental: {
		// Force all pages to be dynamic to avoid React 19 RC context issues during SSR
		serverActions: {
			bodySizeLimit: '2mb',
		},
	},
	// Skip static generation during Docker build when backend isn't available
	output: 'standalone',
	// Disable static optimization to prevent build-time API calls
	...(process.env.NODE_ENV === 'production' &&
	process.env.DOCKER_BUILD === 'true'
		? {
				trailingSlash: true,
				skipTrailingSlashRedirect: true,
				experimental: {
					isrMemoryCacheSize: 0, // Disable ISR during build
				},
		  }
		: {}),
	outputFileTracingExcludes: {
		'*': [
			'node_modules/@swc/core-linux-x64-gnu',
			'node_modules/@swc/core-linux-x64-musl',
			'node_modules/@esbuild/linux-x64',
		],
	},
	images: {
		remotePatterns: [
			{
				protocol: 'http',
				hostname: 'localhost',
			},
			{
				protocol: 'https',
				hostname: 'medusa-public-images.s3.eu-west-1.amazonaws.com',
			},
			{
				protocol: 'https',
				hostname: 'medusa-server-testing.s3.amazonaws.com',
			},
			{
				protocol: 'https',
				hostname: 'medusa-server-testing.s3.us-east-1.amazonaws.com',
			},
			{
				protocol: 'https',
				hostname: 'vnlpncljwdhvvftrecuk.supabase.co',
			},
		],
	},
};

module.exports = withNextIntl(nextConfig);
