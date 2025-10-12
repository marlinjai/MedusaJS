'use server';

import { sdk } from '@lib/config';
import medusaError from '@lib/util/medusa-error';
import { HttpTypes } from '@medusajs/types';
import { getCacheOptions } from './cookies';

export const listRegions = async () => {
	const next = {
		...(await getCacheOptions('regions')),
	};

	return sdk.client
		.fetch<{ regions: HttpTypes.StoreRegion[] }>(`/store/regions`, {
			method: 'GET',
			next,
			cache: 'force-cache',
		})
		.then(({ regions }) => regions)
		.catch(medusaError);
};

/**
 * List regions for build-time static generation (no cookies/auth)
 * This version skips authentication and caching for build-time usage
 */
export const listRegionsForBuild = async (): Promise<
	HttpTypes.StoreRegion[]
> => {
	try {
		const response = await sdk.client.fetch<{
			regions: HttpTypes.StoreRegion[];
		}>(`/store/regions`, {
			method: 'GET',
			// No cache options - build-time safe
		});

		return response.regions;
	} catch (error) {
		console.warn('Failed to fetch regions for build:', error);
		return [];
	}
};

export const retrieveRegion = async (id: string) => {
	const next = {
		...(await getCacheOptions(['regions', id].join('-'))),
	};

	return sdk.client
		.fetch<{ region: HttpTypes.StoreRegion }>(`/store/regions/${id}`, {
			method: 'GET',
			next,
			cache: 'force-cache',
		})
		.then(({ region }) => region)
		.catch(medusaError);
};

const regionMap = new Map<string, HttpTypes.StoreRegion>();

export const getRegion = async (countryCode: string) => {
	try {
		if (regionMap.has(countryCode)) {
			return regionMap.get(countryCode);
		}

		const regions = await listRegions();

		if (!regions) {
			return null;
		}

		regions.forEach(region => {
			region.countries?.forEach(c => {
				regionMap.set(c?.iso_2 ?? '', region);
			});
		});

		const region = countryCode
			? regionMap.get(countryCode)
			: regionMap.get('us');

		return region;
	} catch (e: any) {
		return null;
	}
};
