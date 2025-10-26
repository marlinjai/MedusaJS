// src/modules/store/components/filters/availability-filter.tsx
// Simple availability filter component with dark theme
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { IoCheckmarkCircle, IoCloseCircle } from 'react-icons/io5';

type AvailabilityFilterProps = {
	value: 'all' | 'in_stock' | 'out_of_stock';
	className?: string;
};

const AvailabilityFilter = ({
	value,
	className = '',
}: AvailabilityFilterProps) => {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	// Create query string helper
	const createQueryString = useCallback(
		(newValue: string) => {
			const params = new URLSearchParams(searchParams);
			if (newValue === 'all') {
				params.delete('availability');
			} else {
				params.set('availability', newValue);
			}
			// Reset to page 1 when changing availability
			params.set('page', '1');
			return params.toString();
		},
		[searchParams],
	);

	const handleChange = useCallback(
		(newValue: 'all' | 'in_stock' | 'out_of_stock') => {
			const queryString = createQueryString(newValue);
			router.push(`${pathname}?${queryString}`);
		},
		[createQueryString, router, pathname],
	);

	const options = [
		{
			value: 'all' as const,
			label: 'Alle Produkte',
			icon: null,
		},
		{
			value: 'in_stock' as const,
			label: 'Verfügbar',
			icon: IoCheckmarkCircle,
			iconColor: 'text-green-500',
		},
		{
			value: 'out_of_stock' as const,
			label: 'Nicht verfügbar',
			icon: IoCloseCircle,
			iconColor: 'text-red-500',
		},
	];

	// Clear availability filter
	const clearAvailability = useCallback(() => {
		const params = new URLSearchParams(searchParams);
		params.delete('availability');
		params.set('page', '1');
		router.push(`${pathname}?${params.toString()}`);
	}, [searchParams, router, pathname]);

	return (
		<div className={`${className}`}>
			{/* Header - Dark Theme */}
			<div className="flex items-center justify-between mb-3">
				<h3 className="text-base font-semibold text-white">Verfügbarkeit</h3>
				{value !== 'all' && (
					<button
						onClick={clearAvailability}
						className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
					>
						Zurücksetzen
					</button>
				)}
			</div>

			<div className="space-y-2">
				{options.map(option => {
					const Icon = option.icon;
					const isSelected = value === option.value;

					return (
						<label
							key={option.value}
							className={`flex items-center p-2 rounded-md cursor-pointer transition-all duration-150 ${
								isSelected
									? 'bg-blue-600 text-white'
									: 'hover:bg-gray-700 text-gray-300'
							}`}
						>
							<input
								type="radio"
								name="availability"
								value={option.value}
								checked={isSelected}
								onChange={e => handleChange(e.target.value as any)}
								className="sr-only"
							/>

							{/* Custom radio button */}
							<div
								className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center transition-colors ${
									isSelected
										? 'border-white bg-white'
										: 'border-gray-500 hover:border-gray-400'
								}`}
							>
								{isSelected && (
									<div className="w-2 h-2 rounded-full bg-blue-600" />
								)}
							</div>

							{/* Icon */}
							{Icon && <Icon className={`w-4 h-4 mr-2 ${option.iconColor}`} />}

							{/* Label */}
							<span className="text-sm font-medium flex-1">{option.label}</span>
						</label>
					);
				})}
			</div>

			{/* Active Filter Display - Dark Theme */}
			{value !== 'all' && (
				<div className="mt-4 pt-4 border-t border-gray-700">
					<div className="flex items-center gap-2">
						<span className="text-xs text-gray-500">Aktiver Filter:</span>
						<span className="text-xs font-medium text-white bg-blue-600 px-2.5 py-1 rounded">
							{options.find(opt => opt.value === value)?.label}
						</span>
					</div>
				</div>
			)}
		</div>
	);
};

export default AvailabilityFilter;
