// busbasisberlin/src/admin/routes/products/by-category/hooks/useCurrencies.ts
// Hook to fetch available currencies from the backend

import { useQuery } from '@tanstack/react-query';

export type Currency = {
	code: string;
	symbol: string;
	name: string;
	decimal_digits: number;
	rounding?: number;
	is_default?: boolean;
};

type CurrenciesResponse = {
	currencies: Currency[];
	count: number;
};

/**
 * Fetches available currencies from the Currency Module via admin API
 * Uses React Query for proper caching and state management
 */
export function useCurrencies() {
	return useQuery({
		queryKey: ['admin-currencies'],
		queryFn: async (): Promise<Currency[]> => {
			console.log('[useCurrencies] Fetching currencies from /admin/currencies');
			const res = await fetch('/admin/currencies', {
				method: 'GET',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
			});

			if (!res.ok) {
				console.error('[useCurrencies] Failed to fetch:', res.status, res.statusText);
				throw new Error(`Failed to fetch currencies: ${res.status} ${res.statusText}`);
			}

			const data: CurrenciesResponse = await res.json();
			console.log('[useCurrencies] Received currencies:', data.currencies?.length, data.currencies);
			return data.currencies || [];
		},
		// Short cache time for debugging - currencies should be fetched fresh
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		// Retry on failure
		retry: 1,
		// Provide fallback currency (EUR only - matches store config)
		placeholderData: [
			{ code: 'eur', symbol: '€', name: 'Euro', decimal_digits: 2, is_default: true },
		],
	});
}

