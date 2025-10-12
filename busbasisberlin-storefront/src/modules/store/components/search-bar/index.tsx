'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

type SearchBarProps = {
	placeholder?: string;
	countryCode: string;
	className?: string;
};

// Modern search bar with 3D glass morphism effects
const SearchBar = ({
	placeholder = 'Nach Teilen suchen...',
	countryCode,
	className = '',
}: SearchBarProps) => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
	const [isFocused, setIsFocused] = useState(false);

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (searchTerm.trim()) {
			router.push(
				`/${countryCode}/store?q=${encodeURIComponent(searchTerm.trim())}`,
			);
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			handleSearch(e as any);
		}
	};

	return (
		<div className={`relative max-w-2xl mx-auto ${className}`}>
			<form onSubmit={handleSearch} className="relative">
				{/* Main search container - more subtle design */}
				<div className="relative bg-neutral-900 border border-neutral-700 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:border-neutral-600">
					{/* Search input */}
					<input
						type="text"
						value={searchTerm}
						onChange={e => setSearchTerm(e.target.value)}
						onKeyPress={handleKeyPress}
						onFocus={() => setIsFocused(true)}
						onBlur={() => setIsFocused(false)}
						placeholder={placeholder}
						className="w-full px-6 py-4 pl-14 pr-32 text-white placeholder-neutral-400 bg-transparent rounded-2xl focus:outline-none text-lg"
					/>

					{/* Search icon */}
					<div className="absolute inset-y-0 left-0 flex items-center pl-5">
						<svg
							className={`w-5 h-5 transition-colors duration-300 ${
								isFocused ? 'text-blue-400' : 'text-neutral-500'
							}`}
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

					{/* Search button */}
					<button
						type="submit"
						className="absolute inset-y-0 right-0 flex items-center px-6 m-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-neutral-900 transition-all duration-200"
					>
						Suchen
					</button>
				</div>
			</form>
		</div>
	);
};

export default SearchBar;
