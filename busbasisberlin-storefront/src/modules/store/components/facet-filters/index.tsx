// src/modules/store/components/facet-filters/index.tsx
// Visual facet filter components for availability, price, tags, etc.
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

// Individual filter components
import AvailabilityFilter from './availability-filter';
import PriceRangeFilter from './price-range-filter';
import TagsFilter from './tags-filter';
import CollectionFilter from './collection-filter';

export type FacetData = {
	category_names?: Record<string, number>;
	tags?: Record<string, number>;
	is_available?: Record<string, number>;
	collection_title?: Record<string, number>;
	currencies?: Record<string, number>;
};

export type FilterState = {
	availability?: 'all' | 'in_stock' | 'out_of_stock';
	minPrice?: number;
	maxPrice?: number;
	tags?: string[];
	collections?: string[];
};

type FacetFiltersProps = {
	facetData?: FacetData;
	onFiltersChange?: (filters: FilterState) => void;
	className?: string;
};

const FacetFilters = ({
	facetData = {},
	onFiltersChange,
	className = '',
}: FacetFiltersProps) => {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	
	const [filters, setFilters] = useState<FilterState>({
		availability: 'all',
		minPrice: undefined,
		maxPrice: undefined,
		tags: [],
		collections: [],
	});

	// Create query string helper
	const createQueryString = useCallback(
		(newFilters: FilterState) => {
			const params = new URLSearchParams(searchParams);
			
			// Handle availability
			if (newFilters.availability && newFilters.availability !== 'all') {
				params.set('availability', newFilters.availability);
			} else {
				params.delete('availability');
			}
			
			// Handle price range
			if (newFilters.minPrice !== undefined && newFilters.minPrice > 0) {
				params.set('min_price', newFilters.minPrice.toString());
			} else {
				params.delete('min_price');
			}
			
			if (newFilters.maxPrice !== undefined && newFilters.maxPrice > 0) {
				params.set('max_price', newFilters.maxPrice.toString());
			} else {
				params.delete('max_price');
			}
			
			// Handle tags
			if (newFilters.tags && newFilters.tags.length > 0) {
				params.set('tags', newFilters.tags.join(','));
			} else {
				params.delete('tags');
			}
			
			// Handle collections
			if (newFilters.collections && newFilters.collections.length > 0) {
				params.set('collections', newFilters.collections.join(','));
			} else {
				params.delete('collections');
			}
			
			return params.toString();
		},
		[searchParams]
	);

	// Initialize filters from URL params
	useEffect(() => {
		const initialFilters: FilterState = {
			availability: (searchParams.get('availability') as any) || 'all',
			minPrice: searchParams.get('min_price') ? parseFloat(searchParams.get('min_price')!) : undefined,
			maxPrice: searchParams.get('max_price') ? parseFloat(searchParams.get('max_price')!) : undefined,
			tags: searchParams.get('tags') ? searchParams.get('tags')!.split(',') : [],
			collections: searchParams.get('collections') ? searchParams.get('collections')!.split(',') : [],
		};
		
		setFilters(initialFilters);
	}, [searchParams]);

	// Handle filter changes
	const handleFilterChange = useCallback((key: keyof FilterState, value: any) => {
		const newFilters = { ...filters, [key]: value };
		setFilters(newFilters);
		
		// Update URL
		const queryString = createQueryString(newFilters);
		router.replace(`${pathname}?${queryString}`, { scroll: false });
		
		// Notify parent component
		if (onFiltersChange) {
			onFiltersChange(newFilters);
		}
	}, [filters, createQueryString, router, pathname, onFiltersChange]);

	// Clear all filters
	const clearAllFilters = useCallback(() => {
		const clearedFilters: FilterState = {
			availability: 'all',
			minPrice: undefined,
			maxPrice: undefined,
			tags: [],
			collections: [],
		};
		
		setFilters(clearedFilters);
		
		// Update URL
		const queryString = createQueryString(clearedFilters);
		router.replace(`${pathname}?${queryString}`, { scroll: false });
		
		// Notify parent component
		if (onFiltersChange) {
			onFiltersChange(clearedFilters);
		}
	}, [createQueryString, router, pathname, onFiltersChange]);

	// Count active filters
	const activeFiltersCount = 
		(filters.availability !== 'all' ? 1 : 0) +
		(filters.minPrice !== undefined ? 1 : 0) +
		(filters.maxPrice !== undefined ? 1 : 0) +
		(filters.tags?.length || 0) +
		(filters.collections?.length || 0);

	return (
		<div className={`space-y-6 ${className}`}>
			{/* Header with clear all button */}
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-medium text-gray-900">Filter</h3>
				{activeFiltersCount > 0 && (
					<button
						onClick={clearAllFilters}
						className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
					>
						Alle entfernen ({activeFiltersCount})
					</button>
				)}
			</div>

			{/* Availability Filter */}
			<AvailabilityFilter
				value={filters.availability || 'all'}
				onChange={(value) => handleFilterChange('availability', value)}
				facetData={facetData.is_available}
			/>

			{/* Price Range Filter */}
			<PriceRangeFilter
				minPrice={filters.minPrice}
				maxPrice={filters.maxPrice}
				onMinPriceChange={(value) => handleFilterChange('minPrice', value)}
				onMaxPriceChange={(value) => handleFilterChange('maxPrice', value)}
			/>

			{/* Tags Filter */}
			{facetData.tags && Object.keys(facetData.tags).length > 0 && (
				<TagsFilter
					selectedTags={filters.tags || []}
					onChange={(tags) => handleFilterChange('tags', tags)}
					facetData={facetData.tags}
				/>
			)}

			{/* Collection Filter */}
			{facetData.collection_title && Object.keys(facetData.collection_title).length > 0 && (
				<CollectionFilter
					selectedCollections={filters.collections || []}
					onChange={(collections) => handleFilterChange('collections', collections)}
					facetData={facetData.collection_title}
				/>
			)}
		</div>
	);
};

export default FacetFilters;
export type { FilterState, FacetData };
