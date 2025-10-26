// src/modules/store/components/search-bar/real-time-search.tsx
// Enhanced real-time search component with per-keystroke functionality
'use client';

import { getSearchSuggestions } from '../../../../lib/data/search';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IoClose, IoSearch } from 'react-icons/io5';

type RealTimeSearchProps = {
	placeholder?: string;
	countryCode: string;
	className?: string;
	onSearchChange?: (query: string, results: any[]) => void;
	showInstantResults?: boolean;
};

const RealTimeSearch = ({
	placeholder = 'Nach Teilen suchen...',
	countryCode,
	className = '',
	onSearchChange,
	showInstantResults = false,
}: RealTimeSearchProps) => {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
	const [suggestions, setSuggestions] = useState<string[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const searchRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Create query string helper
	const createQueryString = useCallback(
		(name: string, value: string) => {
			const params = new URLSearchParams(searchParams);
			if (value) {
				params.set(name, value);
			} else {
				params.delete(name);
			}
			return params.toString();
		},
		[searchParams],
	);

	// Real-time search with debouncing
	useEffect(() => {
		const fetchSuggestions = async () => {
			if (searchTerm.length >= 2) {
				setIsLoading(true);
				try {
					const results = await getSearchSuggestions({
						query: searchTerm,
						countryCode,
						limit: 8,
					});
					setSuggestions(results);
					setShowSuggestions(true);

					// If parent component wants real-time results
					if (onSearchChange && showInstantResults) {
						onSearchChange(searchTerm, results);
					}
				} catch (error) {
					console.error('Failed to fetch suggestions:', error);
					setSuggestions([]);
				}
				setIsLoading(false);
			} else {
				setSuggestions([]);
				setShowSuggestions(false);
				// Clear results if search term is too short
				if (onSearchChange && showInstantResults) {
					onSearchChange('', []);
				}
			}
		};

		const timeoutId = setTimeout(fetchSuggestions, 300); // 300ms debounce
		return () => clearTimeout(timeoutId);
	}, [searchTerm, countryCode, onSearchChange, showInstantResults]);

	// Update URL with search term in real-time (with longer debounce)
	useEffect(() => {
		if (!showInstantResults) return;

		const updateUrl = () => {
			const queryString = createQueryString('q', searchTerm);
			const newUrl = `${pathname}?${queryString}`;

			// Only update if URL actually changed to avoid unnecessary navigation
			if (window.location.pathname + '?' + window.location.search !== newUrl) {
				router.replace(newUrl, { scroll: false });
			}
		};

		const timeoutId = setTimeout(updateUrl, 800); // 800ms debounce for URL updates
		return () => clearTimeout(timeoutId);
	}, [searchTerm, pathname, router, createQueryString, showInstantResults]);

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

	// Handle form submission
	const handleSearch = (e: React.FormEvent, searchQuery?: string) => {
		e.preventDefault();
		const query = searchQuery || searchTerm;
		if (query.trim()) {
			setShowSuggestions(false);
			const queryString = createQueryString('q', query.trim());
			router.push(`${pathname}?${queryString}`);
		}
	};

	// Handle input changes
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(e.target.value);
	};

	// Handle suggestion selection
	const handleSuggestionClick = (suggestion: string) => {
		setSearchTerm(suggestion);
		setShowSuggestions(false);
		const queryString = createQueryString('q', suggestion);
		router.push(`${pathname}?${queryString}`);
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

	// Clear search
	const clearSearch = () => {
		setSearchTerm('');
		setSuggestions([]);
		setShowSuggestions(false);
		if (onSearchChange) {
			onSearchChange('', []);
		}
		const queryString = createQueryString('q', '');
		router.push(`${pathname}?${queryString}`);
	};

	return (
		<div ref={searchRef} className={`relative w-full ${className}`}>
			<form onSubmit={handleSearch} className="relative">
				<div className="relative">
					<input
						ref={inputRef}
						type="text"
						value={searchTerm}
						onChange={handleInputChange}
						onKeyPress={handleKeyPress}
						onFocus={() => {
							if (suggestions.length > 0) {
								setShowSuggestions(true);
							}
						}}
						placeholder={placeholder}
						className="w-full px-4 py-3 pr-20 text-sm bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
					/>

					{/* Clear button - Dark Theme */}
					{searchTerm && (
						<button
							type="button"
							onClick={clearSearch}
							className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
						>
							<IoClose className="w-4 h-4" />
						</button>
					)}

					{/* Search button - Dark Theme */}
					<button
						type="submit"
						className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
					>
						{isLoading ? (
							<div className="animate-spin h-4 w-4 border-2 border-gray-600 border-t-blue-500 rounded-full" />
						) : (
							<IoSearch className="h-5 w-5" />
						)}
					</button>
				</div>

				{/* Search suggestions dropdown - Dark Theme */}
				{showSuggestions && suggestions.length > 0 && (
					<div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-80 overflow-y-auto">
						<div className="px-3 py-2 text-xs font-medium text-gray-400 bg-gray-900/50 border-b border-gray-700">
							Suchvorschläge
						</div>
						{suggestions.map((suggestion, index) => (
							<button
								key={index}
								type="button"
								onClick={() => handleSuggestionClick(suggestion)}
								className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-gray-700 focus:bg-gray-700 focus:outline-none border-b border-gray-700 last:border-b-0 transition-colors"
							>
								<div className="flex items-center">
									<IoSearch className="h-4 w-4 text-gray-500 mr-3 flex-shrink-0" />
									<span className="truncate">{suggestion}</span>
								</div>
							</button>
						))}
					</div>
				)}
			</form>
		</div>
	);
};

export default RealTimeSearch;