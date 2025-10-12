// src/modules/store/components/simple-filters/index.tsx
'use client';

import { HttpTypes } from '@medusajs/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type SimpleFiltersProps = {
	sortBy: string;
	countryCode: string;
};

const SimpleFilters = ({ sortBy, countryCode }: SimpleFiltersProps) => {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [categories, setCategories] = useState<
		HttpTypes.StoreProductCategory[]
	>([]);
	const [loading, setLoading] = useState(true);

	const currentSort = searchParams.get('sortBy') || sortBy || 'created_at';
	const stockFilter = searchParams.get('stock') || 'all';
	const activeCategory = searchParams.get('category') || '';

	// Load categories on component mount
	useEffect(() => {
		const loadCategories = async () => {
			try {
				// Use the basic categories API for now
				// TODO: Integrate Meilisearch category facets for real-time counts
				const response = await fetch('/api/categories');
				const data = await response.json();
				setCategories(data.categories || []);
			} catch (error) {
				console.error('Failed to load categories:', error);
			} finally {
				setLoading(false);
			}
		};

		loadCategories();
	}, []);

	const createQueryString = useCallback(
		(name: string, value: string | null) => {
			const params = new URLSearchParams(searchParams);
			if (value) {
				params.set(name, value);
			} else {
				params.delete(name);
			}
			// Reset to page 1 when filters change
			if (name === 'sortBy' || name === 'stock' || name === 'category') {
				params.delete('page');
			}
			return params.toString();
		},
		[searchParams],
	);

	const setQueryParams = (name: string, value: string | null) => {
		const query = createQueryString(name, value);
		router.push(`${pathname}?${query}`);
	};

	return (
		<div className="flex flex-wrap gap-4 items-center justify-between mb-8 p-4 bg-neutral-900 border border-neutral-800 rounded-2xl">
			{/* Sort Options */}
			<div className="flex items-center gap-3">
				<label className="text-white font-medium">Sortierung:</label>
				<select
					value={currentSort}
					onChange={e => setQueryParams('sortBy', e.target.value)}
					className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
				>
					<option value="created_at">Neueste zuerst</option>
					<option value="price_asc">Preis: Niedrig → Hoch</option>
					<option value="price_desc">Preis: Hoch → Niedrig</option>
					<option value="title_asc">Name: A → Z</option>
				</select>
			</div>

			{/* Category Filter */}
			<div className="flex items-center gap-3">
				<label className="text-white font-medium">Kategorie:</label>
				<select
					value={activeCategory}
					onChange={e => setQueryParams('category', e.target.value || null)}
					className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 min-w-[200px]"
					disabled={loading}
				>
					<option value="">Alle Kategorien</option>
					{categories.map(category => (
						<option key={category.id} value={category.handle}>
							{category.name}
						</option>
					))}
				</select>
			</div>

			{/* Stock Filter - Temporarily disabled until inventory data is available */}
			{/*
			<div className="flex items-center gap-3">
				<label className="text-white font-medium">Verfügbarkeit:</label>
				<select
					value={stockFilter}
					onChange={e =>
						setQueryParams(
							'stock',
							e.target.value === 'all' ? null : e.target.value,
						)
					}
					className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
				>
					<option value="all">Alle Produkte</option>
					<option value="in_stock">Nur Verfügbar</option>
					<option value="out_of_stock">Nur Ausverkauft</option>
				</select>
			</div>
			*/}

			{/* Clear Filters */}
			{(currentSort !== 'created_at' || activeCategory) && (
				<button
					onClick={() => router.push(pathname)}
					className="px-4 py-2 bg-neutral-800 text-white text-sm rounded-xl hover:bg-neutral-700 transition-colors"
				>
					Filter zurücksetzen
				</button>
			)}
		</div>
	);
};

export default SimpleFilters;
