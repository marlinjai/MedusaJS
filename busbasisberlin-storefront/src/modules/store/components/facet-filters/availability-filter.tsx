// src/modules/store/components/facet-filters/availability-filter.tsx
// Availability filter component (In Stock / Out of Stock)
'use client';

import { IoCheckmarkCircle, IoCloseCircle } from 'react-icons/io5';

type AvailabilityFilterProps = {
	value: 'all' | 'in_stock' | 'out_of_stock';
	onChange: (value: 'all' | 'in_stock' | 'out_of_stock') => void;
	facetData?: Record<string, number>;
};

const AvailabilityFilter = ({
	value,
	onChange,
	facetData = {},
}: AvailabilityFilterProps) => {
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
		<div className="space-y-3">
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
								onChange={e => onChange(e.target.value as any)}
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
