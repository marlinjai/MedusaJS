'use client';

import { getSearchSuggestions } from '@lib/data/search';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

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
	const [suggestions, setSuggestions] = useState<string[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const searchRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Fetch suggestions when search term changes
	useEffect(() => {
		const fetchSuggestions = async () => {
			if (searchTerm.length >= 2) {
				setIsLoading(true);
				try {
					const results = await getSearchSuggestions({
						query: searchTerm,
						countryCode,
						limit: 5,
					});
					setSuggestions(results);
					setShowSuggestions(true);
				} catch (error) {
					console.error('Failed to fetch suggestions:', error);
					setSuggestions([]);
				}
				setIsLoading(false);
			} else {
				setSuggestions([]);
				setShowSuggestions(false);
			}
		};

		const timeoutId = setTimeout(fetchSuggestions, 300); // Debounce
		return () => clearTimeout(timeoutId);
	}, [searchTerm, countryCode]);

	// Hide suggestions when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				searchRef.current &&
				!searchRef.current.contains(event.target as Node)
			) {
				setShowSuggestions(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	// Suchfunktion beim Absenden des Formulars
	const handleSearch = (e: React.FormEvent, searchQuery?: string) => {
		e.preventDefault();
		const query = searchQuery || searchTerm;
		if (query.trim()) {
			setShowSuggestions(false);
			// Navigiere zur Store-Seite mit Suchparameter
			router.push(
				`/${countryCode}/store?q=${encodeURIComponent(query.trim())}`,
			);
		}
	};

	// Handle input changes
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(e.target.value);
	};

	// Handle suggestion selection
	const handleSuggestionClick = (suggestion: string) => {
		setSearchTerm(suggestion);
		handleSearch(new Event('submit') as any, suggestion);
	};

	// Handle keyboard navigation
	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			handleSearch(e as any);
		} else if (e.key === 'Escape') {
			setShowSuggestions(false);
			inputRef.current?.blur();
		}
	};

	return (
		<div ref={searchRef} className={`relative ${className}`}>
			<form onSubmit={handleSearch} className="relative">
				<div className="relative">
					{/* Suchfeld mit Icon */}
					<input
						ref={inputRef}
						type="text"
						value={searchTerm}
						onChange={handleInputChange}
						onKeyPress={handleKeyPress}
						onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
						placeholder={placeholder}
						className="w-full px-4 py-3 pl-12 pr-4 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
					/>

					{/* Such-Icon */}
					<div className="absolute inset-y-0 left-0 flex items-center pl-4">
						{isLoading ? (
							<div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
						) : (
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
						)}
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

			{/* Suggestions Dropdown */}
			{showSuggestions && suggestions.length > 0 && (
				<div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
					<ul className="py-1">
						{suggestions.map((suggestion, index) => (
							<li key={index}>
								<button
									type="button"
									onClick={() => handleSuggestionClick(suggestion)}
									className="w-full px-4 py-2 text-left text-gray-900 hover:bg-blue-50 hover:text-blue-900 focus:outline-none focus:bg-blue-50 focus:text-blue-900 transition-colors"
								>
									<div className="flex items-center">
										<svg
											className="w-4 h-4 mr-3 text-gray-400"
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
										{suggestion}
									</div>
								</button>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
};

export default SearchBar;
