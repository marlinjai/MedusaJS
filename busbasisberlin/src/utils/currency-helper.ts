// busbasisberlin/src/services/currency-helper.ts
// Shared service for fetching store-supported currencies
// Follows DRY principle - single source of truth for currency logic

import type { Logger } from '@medusajs/framework/types';
import { Modules } from '@medusajs/framework/utils';

export type Currency = {
	code: string;
	symbol: string;
	name: string;
	decimal_digits: number;
	rounding?: number;
	is_default?: boolean;
};

/**
 * Fetches the store's supported currencies with full metadata.
 * This is the single source of truth for currency data across the application.
 *
 * @param container - Medusa dependency injection container (req.scope)
 * @param logger - Logger instance for debugging
 * @returns Array of store-supported currencies with metadata
 */
export async function getStoreSupportedCurrencies(
	container: any,
	logger?: Logger,
): Promise<Currency[]> {
	try {
		// Get store configuration with supported_currencies relation
		const storeModuleService = container.resolve(Modules.STORE);
		const stores = await storeModuleService.listStores(
			{},
			{
				relations: ['supported_currencies'],
			},
		);
		const store = stores[0];

		if (!store) {
			logger?.warn('[CURRENCY-HELPER] No store found');
			return getFallbackCurrencies();
		}

		if (!store.supported_currencies || store.supported_currencies.length === 0) {
			logger?.warn('[CURRENCY-HELPER] No supported currencies configured in store');
			return getFallbackCurrencies();
		}

		const supportedCurrencyCodes = store.supported_currencies.map(
			(sc: any) => sc.currency_code,
		);

		logger?.info(
			`[CURRENCY-HELPER] Store supports ${supportedCurrencyCodes.length} currencies: ${supportedCurrencyCodes.join(', ')}`,
		);

		// Fetch currency metadata from Currency Module
		const currencyModuleService = container.resolve(Modules.CURRENCY);
		const currencies = await currencyModuleService.listCurrencies(
			{
				code: supportedCurrencyCodes,
			},
			{
				take: 50,
			},
		);

		if (!currencies || currencies.length === 0) {
			logger?.warn('[CURRENCY-HELPER] No currency metadata found');
			return getFallbackCurrencies();
		}

		// Build currency map for O(1) lookups
		const currencyMap = new Map(
			currencies.map((c: any) => [
				c.code,
				{
					code: c.code,
					symbol: c.symbol || c.symbol_native,
					name: c.name,
					decimal_digits: c.decimal_digits || 2,
					rounding: c.rounding || 0,
					is_default: false,
				},
			]),
		);

		// Build response in store's preferred order with is_default flag
		const result = (store.supported_currencies || [])
			.map((sc: any) => {
				const currency = currencyMap.get(sc.currency_code);
				if (currency) {
					currency.is_default = sc.is_default === true;
					return currency;
				}
				return null;
			})
			.filter((c): c is Currency => c !== null);

		logger?.info(
			`[CURRENCY-HELPER] Returning ${result.length} currencies (default: ${result.find(c => c.is_default)?.code || 'none'})`,
		);

		return result;
	} catch (error) {
		logger?.error('[CURRENCY-HELPER] Error fetching currencies:', error);
		return getFallbackCurrencies();
	}
}

/**
 * Gets only the currency codes (without full metadata) for the store.
 * Useful when you only need to validate currency codes, not full details.
 *
 * @param container - Medusa dependency injection container
 * @param logger - Logger instance for debugging
 * @returns Set of supported currency codes (lowercase)
 */
export async function getStoreSupportedCurrencyCodes(
	container: any,
	logger?: Logger,
): Promise<Set<string>> {
	try {
		const storeModuleService = container.resolve(Modules.STORE);
		const stores = await storeModuleService.listStores(
			{},
			{
				relations: ['supported_currencies'],
			},
		);
		const store = stores[0];

		if (!store || !store.supported_currencies || store.supported_currencies.length === 0) {
			logger?.warn('[CURRENCY-HELPER] No store or supported currencies found');
			return new Set(['eur']); // Minimal fallback - only EUR
		}

		const codes = store.supported_currencies.map((sc: any) =>
			sc.currency_code.toLowerCase(),
		);

		logger?.info(
			`[CURRENCY-HELPER] Store supports ${codes.length} currency codes: ${codes.join(', ')}`,
		);

		return new Set(codes);
	} catch (error) {
		logger?.error('[CURRENCY-HELPER] Error fetching currency codes:', error);
		return new Set(['eur']); // Minimal fallback - only EUR
	}
}

/**
 * Fallback currencies when store configuration is unavailable.
 * Returns only EUR as a safe default for this store.
 */
function getFallbackCurrencies(): Currency[] {
	return [
		{
			code: 'eur',
			symbol: '€',
			name: 'Euro',
			decimal_digits: 2,
			is_default: true,
		},
	];
}

