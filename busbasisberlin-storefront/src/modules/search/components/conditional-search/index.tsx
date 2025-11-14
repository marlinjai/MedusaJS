// src/modules/search/components/conditional-search/index.tsx
// Client component that conditionally renders search based on settings

'use client';

import { useEffect, useState } from 'react';
import SearchModal from '../modal';

export default function ConditionalSearch() {
	const [searchEnabled, setSearchEnabled] = useState(true);

	useEffect(() => {
		const loadSettings = async () => {
			try {
				const response = await fetch('/api/public/settings');
				if (response.ok) {
					const data = await response.json();
					setSearchEnabled(data.search?.enabled !== false);
				}
			} catch (error) {
				console.error('Failed to load search settings:', error);
				// Default to enabled if settings can't be loaded
				setSearchEnabled(true);
			}
		};
		loadSettings();
	}, []);

	if (!searchEnabled) {
		return null;
	}

	return <SearchModal />;
}

