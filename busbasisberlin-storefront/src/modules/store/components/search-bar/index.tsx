'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

type SearchBarProps = {
	placeholder?: string;
	countryCode: string;
	className?: string;
};

// busbasisberlin-storefront/src/modules/store/components/search-bar/index.tsx
// Suchkomponente für Produktsuche mit modernem Design
const SearchBar = ({
	placeholder = 'Nach Teilen suchen...',
	countryCode,
	className = '',
}: SearchBarProps) => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');

	// Suchfunktion beim Absenden des Formulars
	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (searchTerm.trim()) {
			// Navigiere zur Store-Seite mit Suchparameter
			router.push(
				`/${countryCode}/store?q=${encodeURIComponent(searchTerm.trim())}`,
			);
		}
	};

	// Suche beim Drücken der Enter-Taste
	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			handleSearch(e as any);
		}
	};

	return (
		<form onSubmit={handleSearch} className={`relative ${className}`}>
			<div className="relative">
				{/* Suchfeld mit Icon */}
				<input
					type="text"
					value={searchTerm}
					onChange={e => setSearchTerm(e.target.value)}
					onKeyPress={handleKeyPress}
					placeholder={placeholder}
					className="w-full px-4 py-3 pl-12 pr-4 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
				/>

				{/* Such-Icon */}
				<div className="absolute inset-y-0 left-0 flex items-center pl-4">
					<svg
						className="w-5 h-5 text-gray-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
						/>
					</svg>
				</div>

				{/* Such-Button */}
				<button
					type="submit"
					className="absolute inset-y-0 right-0 flex items-center px-4 text-sm font-medium text-white bg-blue-600 rounded-r-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
				>
					Suchen
				</button>
			</div>
		</form>
	);
};

export default SearchBar;
