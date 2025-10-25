// src/modules/store/components/facet-filters/price-range-filter.tsx
// Price range filter component with dual range slider
'use client';

import { useState, useCallback, useEffect } from 'react';

type PriceRangeFilterProps = {
	minPrice?: number;
	maxPrice?: number;
	onMinPriceChange: (value: number | undefined) => void;
	onMaxPriceChange: (value: number | undefined) => void;
	currency?: string;
};

const PriceRangeFilter = ({
	minPrice,
	maxPrice,
	onMinPriceChange,
	onMaxPriceChange,
	currency = 'EUR',
}: PriceRangeFilterProps) => {
	const [localMinPrice, setLocalMinPrice] = useState<string>(
		minPrice?.toString() || ''
	);
	const [localMaxPrice, setLocalMaxPrice] = useState<string>(
		maxPrice?.toString() || ''
	);

	// Update local state when props change
	useEffect(() => {
		setLocalMinPrice(minPrice?.toString() || '');
		setLocalMaxPrice(maxPrice?.toString() || '');
	}, [minPrice, maxPrice]);

	// Handle min price change with debouncing
	const handleMinPriceChange = useCallback((value: string) => {
		setLocalMinPrice(value);
		
		const numValue = parseFloat(value);
		if (value === '' || isNaN(numValue)) {
			onMinPriceChange(undefined);
		} else if (numValue >= 0) {
			onMinPriceChange(numValue);
		}
	}, [onMinPriceChange]);

	// Handle max price change with debouncing
	const handleMaxPriceChange = useCallback((value: string) => {
		setLocalMaxPrice(value);
		
		const numValue = parseFloat(value);
		if (value === '' || isNaN(numValue)) {
			onMaxPriceChange(undefined);
		} else if (numValue >= 0) {
			onMaxPriceChange(numValue);
		}
	}, [onMaxPriceChange]);

	// Clear price filters
	const clearPriceFilters = useCallback(() => {
		setLocalMinPrice('');
		setLocalMaxPrice('');
		onMinPriceChange(undefined);
		onMaxPriceChange(undefined);
	}, [onMinPriceChange, onMaxPriceChange]);

	const hasFilters = localMinPrice !== '' || localMaxPrice !== '';

	return (
		<div className="space-y-3">
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
						<label className="block text-xs text-gray-500 mb-1">
							Min
						</label>
						<input
							type="number"
							value={localMinPrice}
							onChange={(e) => handleMinPriceChange(e.target.value)}
							placeholder="0"
							min="0"
							step="0.01"
							className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
					</div>
					
					<div>
						<label className="block text-xs text-gray-500 mb-1">
							Max
						</label>
						<input
							type="number"
							value={localMaxPrice}
							onChange={(e) => handleMaxPriceChange(e.target.value)}
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
							{ label: '< 25€', min: 0, max: 25 },
							{ label: '25€ - 50€', min: 25, max: 50 },
							{ label: '50€ - 100€', min: 50, max: 100 },
							{ label: '> 100€', min: 100, max: undefined },
						].map((range) => (
							<button
								key={range.label}
								onClick={() => {
									handleMinPriceChange(range.min.toString());
									handleMaxPriceChange(range.max?.toString() || '');
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

export default PriceRangeFilter;
