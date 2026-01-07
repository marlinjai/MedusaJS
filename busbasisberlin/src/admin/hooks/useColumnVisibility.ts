/**
 * useColumnVisibility.ts
 * Shared hook for managing column visibility state with localStorage persistence
 */
import { useEffect, useState } from 'react';

type UseColumnVisibilityOptions = {
	storageKey: string;
	defaultVisibleColumns: string[];
	allColumns: string[];
};

export function useColumnVisibility({
	storageKey,
	defaultVisibleColumns,
	allColumns,
}: UseColumnVisibilityOptions) {
	// Initialize from localStorage or defaults
	const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
		const saved = localStorage.getItem(storageKey);
		if (saved) {
			try {
				return new Set(JSON.parse(saved));
			} catch (error) {
				console.warn(`Failed to parse saved columns for ${storageKey}:`, error);
			}
		}
		return new Set(defaultVisibleColumns);
	});

	// Persist to localStorage whenever visibility changes
	useEffect(() => {
		localStorage.setItem(storageKey, JSON.stringify([...visibleColumns]));
	}, [visibleColumns, storageKey]);

	const toggleColumn = (key: string) => {
		setVisibleColumns(prev => {
			const next = new Set(prev);
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}
			return next;
		});
	};

	const showAllColumns = () => {
		setVisibleColumns(new Set(allColumns));
	};

	const hideAllColumns = () => {
		// Keep at least one column visible (typically the first one)
		setVisibleColumns(new Set([allColumns[0]]));
	};

	const resetToDefaults = () => {
		setVisibleColumns(new Set(defaultVisibleColumns));
	};

	return {
		visibleColumns,
		toggleColumn,
		showAllColumns,
		hideAllColumns,
		resetToDefaults,
		setVisibleColumns,
	};
}

