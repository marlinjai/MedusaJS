// src/modules/store/components/filters/availability-filter.tsx
// Working availability filter component
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { IoCheckmarkCircle, IoCloseCircle } from 'react-icons/io5';

type AvailabilityFilterProps = {
	value: 'all' | 'in_stock' | 'out_of_stock';
	facetData: Record<string, number>;
	className?: string;
};

const AvailabilityFilter = ({
	value,
	facetData,
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
			return params.toString();
		},
		[searchParams],
	);

	const handleChange = useCallback(
		(newValue: 'all' | 'in_stock' | 'out_of_stock') => {
			const queryString = createQueryString(newValue);
			router.replace(`${pathname}?${queryString}`, { scroll: false });
		},
		[createQueryString, router, pathname],
	);

	const options = [
		{
			value: 'all' as const,
			label: 'Alle Produkte',
			icon: null,
			count: (facetData.true || 0) + (facetData.false || 0),
		},
		{
			value: 'in_stock' as const,
			label: 'Verfügbar',
			icon: IoCheckmarkCircle,
			count: facetData.true || 0,
		},
		{
			value: 'out_of_stock' as const,
			label: 'Nicht verfügbar',
			icon: IoCloseCircle,
			count: facetData.false || 0,
		},
	];

	return (
		<div className={`space-y-3 ${className}`}>
			<h4 className="text-sm font-medium text-gray-900">Verfügbarkeit</h4>

			<div className="space-y-2">
				{options.map(option => {
					const Icon = option.icon;
					const isSelected = value === option.value;

					return (
						<label
							key={option.value}
							className={`flex items-center p-2 rounded-md cursor-pointer transition-all duration-150 ${
								isSelected
									? 'bg-blue-50 text-blue-700 border border-blue-200'
									: 'hover:bg-gray-50 text-gray-700'
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
									isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
								}`}
							>
								{isSelected && (
									<div className="w-2 h-2 rounded-full bg-white" />
								)}
							</div>

							{/* Icon */}
							{Icon && (
								<Icon
									className={`w-4 h-4 mr-2 ${
										option.value === 'in_stock'
											? 'text-green-500'
											: 'text-red-500'
									}`}
								/>
							)}

							{/* Label and count */}
							<span className="text-sm font-medium flex-1">{option.label}</span>

							{option.count > 0 && (
								<span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full ml-2">
									{option.count}
								</span>
							)}
						</label>
					);
				})}
			</div>
		</div>
	);
};

export default AvailabilityFilter;
