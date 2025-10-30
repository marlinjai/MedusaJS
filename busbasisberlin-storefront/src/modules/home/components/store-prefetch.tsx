// store-prefetch.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// Prefetches first few pages of the store for instant navigation
export default function StorePrefetch() {
	const router = useRouter();
	const pathname = usePathname();

	useEffect(() => {
		// Get country code from pathname
		const countryCode = pathname.split('/')[1] || 'de';

		// Prefetch first 3 pages of store
		const storeBasePath = `/${countryCode}/store`;

		// Prefetch store page (page 1)
		router.prefetch(storeBasePath);

		// Prefetch pages 2-3
		router.prefetch(`${storeBasePath}?page=2`);
		router.prefetch(`${storeBasePath}?page=3`);
	}, [router, pathname]);

	return null; // This component doesn't render anything
}

