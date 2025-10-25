const checkEnvVariables = require('./check-env-variables');
const path = require('path');

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
	// Webpack configuration for path aliases - required for monorepo builds
	webpack: (config, options) => {
		// Ensure resolve.alias exists
		if (!config.resolve) {
			config.resolve = {};
		}
		if (!config.resolve.alias) {
			config.resolve.alias = {};
		}

		// Add path aliases with absolute paths
		config.resolve.alias['@lib'] = path.resolve(__dirname, 'src/lib');
		config.resolve.alias['@modules'] = path.resolve(__dirname, 'src/modules');
		config.resolve.alias['@pages'] = path.resolve(__dirname, 'src/pages');

		return config;
	},
};

module.exports = nextConfig;
