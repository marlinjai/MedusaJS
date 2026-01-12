import { MetadataRoute } from 'next';
import { getBaseURL } from '@lib/util/env';

export default function robots(): MetadataRoute.Robots {
	const baseUrl = getBaseURL();

	return {
		rules: [
			{
				userAgent: '*',
				allow: '/',
				disallow: [
					'/checkout',
					'/account/',
					'/cart',
					'/order/',
					'/reset-password',
					'/request-reset',
					'/offers/',
				],
			},
		],
		sitemap: `${baseUrl}/sitemap.xml`,
	};
}
