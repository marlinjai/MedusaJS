// i18n/request.ts
// Minimal Next-intl configuration

import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
	const locale = 'de';

	return {
		locale,
		messages: (await import(`../../messages/${locale}.json`)).default,
	};
});
