// src/modules/store/components/filters/price-filter.tsx
// Working price range filter component
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

type PriceFilterProps = {
	minPrice?: number;
	maxPrice?: number;
	currency?: string;
	className?: string;
};

const PriceFilter = ({
	minPrice,
	maxPrice,
	currency = 'EUR',
	className = '',
}: PriceFilterProps) => {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	
	const [localMinPrice, setLocalMinPrice] = useState<string>(
		minPrice?.toString() || '',
	);
	const [localMaxPrice, setLocalMaxPrice] = useState<string>(
		maxPrice?.toString() || '',
	);

	// Update local state when props change
	useEffect(() => {
		setLocalMinPrice(minPrice?.toString() || '');
		setLocalMaxPrice(maxPrice?.toString() || '');
	}, [minPrice, maxPrice]);

	// Create query string helper
	const createQueryString = useCallback(
		(minVal?: number, maxVal?: number) => {
			const params = new URLSearchParams(searchParams);
			
			if (minVal !== undefined && minVal > 0) {
				params.set('min_price', minVal.toString());
			} else {
				params.delete('min_price');
			}
			
			if (maxVal !== undefined && maxVal > 0) {
				params.set('max_price', maxVal.toString());
			} else {
				params.delete('max_price');
			}
			
			return params.toString();
		},
		[searchParams],
	);

	// Handle price changes with debouncing
	const updatePrices = useCallback(
		(minVal: string, maxVal: string) => {
			const min = minVal ? parseFloat(minVal) : undefined;
			const max = maxVal ? parseFloat(maxVal) : undefined;
			
			const queryString = createQueryString(min, max);
			router.replace(`${pathname}?${queryString}`, { scroll: false });
		},
		[createQueryString, router, pathname],
	);

	// Debounced price update
	useEffect(() => {
		const timeoutId = setTimeout(() => {
			updatePrices(localMinPrice, localMaxPrice);
		}, 800); // 800ms debounce
		
		return () => clearTimeout(timeoutId);
	}, [localMinPrice, localMaxPrice, updatePrices]);

	// Clear price filters
	const clearPriceFilters = useCallback(() => {
		setLocalMinPrice('');
		setLocalMaxPrice('');
		const queryString = createQueryString(undefined, undefined);
		router.replace(`${pathname}?${queryString}`, { scroll: false });
	}, [createQueryString, router, pathname]);

	const hasFilters = localMinPrice !== '' || localMaxPrice !== '';

	return (
		<div className={`space-y-3 ${className}`}>
			<div className="flex items-center justify-between">
				<h4 className="text-sm font-medium text-gray-900">Preis ({currency})</h4>
				{hasFilters && (
					<button
						onClick={clearPriceFilters}
						className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
					>
						Zurücksetzen
					</button>
				)}
			</div>
			
			<div className="space-y-3">
				{/* Price input fields */}
				<div className="grid grid-cols-2 gap-2">
					<div>
						<label className="block text-xs text-gray-500 mb-1">Min</label>
						<input
							type="number"
							value={localMinPrice}
							onChange={e => setLocalMinPrice(e.target.value)}
							placeholder="0"
							min="0"
							step="0.01"
							className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
					</div>
					
					<div>
						<label className="block text-xs text-gray-500 mb-1">Max</label>
						<input
							type="number"
							value={localMaxPrice}
							onChange={e => setLocalMaxPrice(e.target.value)}
							placeholder="∞"
							min="0"
							step="0.01"
							className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
					</div>
				</div>

				{/* Quick price ranges */}
				<div className="space-y-2">
					<div className="text-xs text-gray-500 mb-2">Schnellauswahl:</div>
					<div className="grid grid-cols-2 gap-2">
						{[
							{ label: '< 25€', min: '', max: '25' },
							{ label: '25€ - 50€', min: '25', max: '50' },
							{ label: '50€ - 100€', min: '50', max: '100' },
							{ label: '> 100€', min: '100', max: '' },
						].map(range => (
							<button
								key={range.label}
								onClick={() => {
									setLocalMinPrice(range.min);
									setLocalMaxPrice(range.max);
								}}
								className="px-3 py-2 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
							>
								{range.label}
							</button>
						))}
					</div>
				</div>

				{/* Current range display */}
				{hasFilters && (
					<div className="text-xs text-gray-600 bg-blue-50 px-3 py-2 rounded-md">
						Preisspanne: {localMinPrice || '0'}€ - {localMaxPrice || '∞'}€
					</div>
				)}
			</div>
		</div>
	);
};

export default PriceFilter;
