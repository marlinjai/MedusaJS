'use client';

import { Button } from '@medusajs/ui';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BsFilter, BsGrid3X3, BsList, BsSortDown, BsX } from 'react-icons/bs';
import {
	Configure,
	InstantSearch,
	RefinementList,
	SearchBox,
	SortBy,
	Stats,
	useCurrentRefinements,
	useHits,
	useInstantSearch,
} from 'react-instantsearch';
import { searchClient } from '../../../../lib/config';
import Modal from '../../../common/components/modal';

type Hit = {
	id: string;
	title: string;
	description: string;
	handle: string;
	thumbnail: string;
	min_price?: number;
	max_price?: number;
	is_available?: boolean;
	category_names?: string[];
	categories: {
		id: string;
		name: string;
		handle: string;
	}[];
	tags: {
		id: string;
		value: string;
	}[];
};

// Export a context to control the modal from anywhere
export const useSearchModal = () => {
	const [isOpen, setIsOpen] = useState(false);
	return { isOpen, setIsOpen };
};

// SortBy Control Component with default refinement
function SortByControl({ defaultSort }: { defaultSort: string }) {
	// All available sort options
	const allItems = [
		{ label: 'Relevanz', value: 'products' },
		{
			label: 'Preis: Niedrig → Hoch',
			value: 'products:min_price:asc',
		},
		{
			label: 'Preis: Hoch → Niedrig',
			value: 'products:max_price:desc',
		},
		{ label: 'Name: A-Z', value: 'products:title:asc' },
		{ label: 'Name: Z-A', value: 'products:title:desc' },
	];

	// Reorder items to put default first (SortBy uses first item as default)
	const defaultItem = allItems.find(item => item.value === defaultSort);
	const sortedItems = defaultItem
		? [defaultItem, ...allItems.filter(item => item.value !== defaultSort)]
		: allItems;

	return (
		<div className="flex items-center gap-1 sm:gap-1.5">
			<BsSortDown className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-gray-400 flex-shrink-0" />
			<span className="hidden sm:inline text-xs sm:text-sm font-medium text-gray-400">
				Sortieren:
			</span>
			<div className="relative">
				<SortBy
					items={sortedItems}
					classNames={{
						root: 'relative',
						select:
							'bg-stone-800 border border-stone-700 rounded-lg px-2 sm:px-2.5 py-2 sm:py-2.5 pr-7 sm:pr-8 min-h-[32px] sm:min-h-[36px] h-auto text-xs sm:text-sm font-medium text-white hover:bg-stone-700 hover:border-stone-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer transition-all appearance-none leading-normal',
					}}
				/>
				<div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
					<svg
						className="w-3 h-3 text-gray-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M19 9l-7 7-7-7"
						/>
					</svg>
				</div>
			</div>
		</div>
	);
}

// Compact Toolbar for Search Modal
function CompactToolbar() {
	const { items: refinements, refine: clearRefinement } =
		useCurrentRefinements();
	const hasActiveFilters = refinements.length > 0;
	const [isFilterOpen, setIsFilterOpen] = useState(false);
	const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
	const [searchSettings, setSearchSettings] = useState<{
		enabled: boolean;
		sort_order: string;
	} | null>(null);
	const filterRef = useRef<HTMLDivElement>(null);

	// Memoize transformItems to prevent unnecessary re-renders
	const transformItems = useMemo(
		() => (items: any[]) =>
			items.map(item => ({
				...item,
				label: item.label === 'true' ? 'Verfügbar' : 'Zurzeit nicht lieferbar',
			})),
		[],
	);

	// Load search settings for default sort
	useEffect(() => {
		const loadSettings = async () => {
			try {
				const response = await fetch('/api/public/settings');
				if (response.ok) {
					const data = await response.json();
					setSearchSettings(data.search);
				}
			} catch (error) {
				console.error('Failed to load search settings:', error);
			}
		};
		loadSettings();
	}, []);

	// Get sort index name based on sort order
	const getSortIndex = () => {
		if (!searchSettings) return 'products';
		const sortOrder = searchSettings.sort_order || 'price_asc';
		switch (sortOrder) {
			case 'price_asc':
				return 'products:min_price:asc';
			case 'price_desc':
				return 'products:max_price:desc';
			case 'name_asc':
				return 'products:title:asc';
			case 'name_desc':
				return 'products:title:desc';
			case 'relevance':
			default:
				return 'products';
		}
	};

	// Close filter dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				filterRef.current &&
				!filterRef.current.contains(event.target as Node)
			) {
				setIsFilterOpen(false);
			}
		};

		if (isFilterOpen) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [isFilterOpen]);

	return (
		<div className="flex-shrink-0 w-full sm:w-auto">
			<div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
				{/* Stats */}
				<div className="text-xs sm:text-sm font-medium text-gray-300 whitespace-nowrap">
					<Stats
						translations={{
							rootElementText({ nbHits, nbSortedHits }) {
								const count = nbSortedHits ?? nbHits;
								return `${count.toLocaleString('de-DE')} Produkte`;
							},
						}}
						classNames={{
							root: 'inline',
						}}
					/>
				</div>

				{hasActiveFilters && (
					<>
						<div className="hidden sm:block h-8 sm:h-9 w-px bg-stone-700" />
						<button
							onClick={() => {
								refinements.forEach(refinement => {
									refinement.refinements.forEach(r => {
										clearRefinement(r);
									});
								});
							}}
							className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-2 sm:py-2.5 h-8 sm:h-9 text-xs sm:text-sm font-medium text-gray-300 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg transition-colors whitespace-nowrap"
						>
							<BsX className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
							<span className="hidden sm:inline">Filter zurücksetzen</span>
							<span className="sm:hidden">Zurücksetzen</span>
						</button>
					</>
				)}

				<div className="hidden sm:block h-8 sm:h-9 w-px bg-stone-700" />
				{/* Quick Filter */}
				<div className="flex items-center gap-1 sm:gap-1.5">
					<BsFilter className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-gray-400 flex-shrink-0" />
					<span className="hidden sm:inline text-xs sm:text-sm font-medium text-gray-400">
						Filter:
					</span>
					<div className="relative" ref={filterRef}>
						<button
							onClick={() => setIsFilterOpen(!isFilterOpen)}
							className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-2 sm:py-2.5 h-8 sm:h-9 text-xs sm:text-sm font-medium text-white bg-stone-800 border border-stone-700 rounded-lg hover:bg-stone-700 hover:border-stone-600 transition-colors whitespace-nowrap"
						>
							<span className="hidden sm:inline">Verfügbarkeit</span>
							<span className="sm:hidden">Verfügbar</span>
							<svg
								className={`w-3 sm:w-3.5 h-3 sm:h-3.5 transition-transform flex-shrink-0 ${
									isFilterOpen ? 'rotate-180' : ''
								}`}
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M19 9l-7 7-7-7"
								/>
							</svg>
						</button>
						{isFilterOpen && (
							<div className="absolute top-full left-0 mt-1 w-56 bg-stone-800 border border-stone-700 rounded-lg shadow-xl z-50 p-2">
								<RefinementList
									attribute="is_available"
									limit={10}
									searchable={false}
									transformItems={transformItems}
									classNames={{
										root: 'space-y-1.5',
										item: 'py-1.5 px-2 rounded-lg hover:bg-stone-700 transition-colors',
										label: 'flex items-center gap-2 cursor-pointer group',
										checkbox:
											'h-3.5 w-3.5 rounded border-stone-600 bg-stone-900 text-blue-500 focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors',
										labelText:
											'text-xs text-gray-300 group-hover:text-white flex-1 font-medium',
										count:
											'text-xs text-gray-400 bg-stone-900 px-2 py-0.5 rounded-full min-w-[28px] text-center font-medium',
									}}
								/>
							</div>
						)}
					</div>
				</div>

				<div className="hidden sm:block h-8 sm:h-9 w-px bg-stone-700" />

				{/* Sort */}
				<SortByControl defaultSort={getSortIndex()} />

				<div className="hidden sm:block h-8 sm:h-9 w-px bg-stone-700" />

				{/* View Toggle */}
				<div className="flex items-center gap-1 sm:gap-1.5">
					<span className="hidden sm:inline text-xs sm:text-sm font-medium text-gray-400">
						Ansicht:
					</span>
					<div className="flex items-center gap-0.5 bg-stone-800 border border-stone-700 rounded-lg p-0.5 h-8 sm:h-9">
						<button
							onClick={() => {
								setViewMode('grid');
								window.dispatchEvent(
									new CustomEvent('viewModeChange', { detail: 'grid' }),
								);
							}}
							className={`p-1 sm:p-1.5 rounded transition-colors flex items-center justify-center ${
								viewMode === 'grid'
									? 'bg-blue-600 text-white'
									: 'text-gray-400 hover:text-white hover:bg-stone-700'
							}`}
							aria-label="Grid-Ansicht"
						>
							<BsGrid3X3 className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
						</button>
						<button
							onClick={() => {
								setViewMode('list');
								window.dispatchEvent(
									new CustomEvent('viewModeChange', { detail: 'list' }),
								);
							}}
							className={`p-1 sm:p-1.5 rounded transition-colors flex items-center justify-center ${
								viewMode === 'list'
									? 'bg-blue-600 text-white'
									: 'text-gray-400 hover:text-white hover:bg-stone-700'
							}`}
							aria-label="Listen-Ansicht"
						>
							<BsList className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

// Custom Hits component using useHits hook for better styling control
function CustomHits() {
	const { hits } = useHits<Hit>();
	const { results } = useInstantSearch();
	const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

	// Listen for view mode changes from toolbar
	useEffect(() => {
		const handleViewModeChange = (event: CustomEvent) => {
			setViewMode(event.detail);
		};

		window.addEventListener(
			'viewModeChange',
			handleViewModeChange as EventListener,
		);

		return () => {
			window.removeEventListener(
				'viewModeChange',
				handleViewModeChange as EventListener,
			);
		};
	}, []);

	// Show empty state if there's a query but no results
	if (results?.query && hits.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-12 px-4">
				<div className="text-center">
					<p className="text-lg font-semibold text-gray-300 mb-2">
						Keine Ergebnisse gefunden
					</p>
					<p className="text-sm text-gray-400">
						Versuchen Sie es mit anderen Suchbegriffen
					</p>
				</div>
			</div>
		);
	}

	// List view - Responsive spacing
	if (viewMode === 'list') {
		return (
			<div className="flex flex-col gap-2 sm:gap-3">
				{hits.map(hit => (
					<Hit
						key={hit.id || (hit as any).objectID}
						hit={hit}
						viewMode="list"
					/>
				))}
			</div>
		);
	}

	// Grid view - Responsive: 2 cols mobile, 3 cols tablet, 4 cols desktop
	return (
		<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
			{hits.map(hit => (
				<Hit key={hit.id || (hit as any).objectID} hit={hit} viewMode="grid" />
			))}
		</div>
	);
}

export default function SearchModal({
	externalIsOpen,
	externalSetIsOpen,
}: {
	externalIsOpen?: boolean;
	externalSetIsOpen?: (value: boolean) => void;
} = {}) {
	const [internalIsOpen, setInternalIsOpen] = useState(false);
	const [searchSettings, setSearchSettings] = useState<{
		enabled: boolean;
		sort_order: string;
	} | null>(null);
	const pathname = usePathname();

	// Use external state if provided, otherwise use internal
	const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
	const setIsOpen =
		externalSetIsOpen !== undefined ? externalSetIsOpen : setInternalIsOpen;

	// Load search settings
	useEffect(() => {
		const loadSettings = async () => {
			try {
				const response = await fetch('/api/public/settings');
				if (response.ok) {
					const data = await response.json();
					setSearchSettings(data.search);
				}
			} catch (error) {
				console.error('Failed to load search settings:', error);
			}
		};
		loadSettings();
	}, []);

	// Keyboard shortcuts: Cmd/Ctrl+K and Cmd/Ctrl+F
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				(e.metaKey || e.ctrlKey) &&
				(e.key === 'k' || e.key === 'K' || e.key === 'f' || e.key === 'F')
			) {
				e.preventDefault();
				if (searchSettings?.enabled !== false) {
					setIsOpen(true);
				}
			}
			// Escape key is handled by Modal component (Dialog from Headless UI)
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [setIsOpen, searchSettings]);

	useEffect(() => {
		setIsOpen(false);
	}, [pathname, setIsOpen]);

	// Hide search button on store page
	const isStorePage =
		pathname?.includes('/store') || pathname?.includes('/shop');

	return (
		<>
			{!isStorePage && (
				<div className="hidden small:flex items-center gap-x-6 h-full">
					<Button
						onClick={() => setIsOpen(true)}
						variant="transparent"
						className="hover:text-ui-fg-base text-small-regular px-0 hover:bg-transparent focus:!bg-transparent flex items-center justify-center"
						aria-label="Suche öffnen"
					>
						<svg
							className="w-5 h-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<circle cx="11" cy="11" r="8" />
							<path d="m21 21-4.35-4.35" />
						</svg>
					</Button>
				</div>
			)}
			<Modal isOpen={isOpen} close={() => setIsOpen(false)} search={true}>
				<div className="w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-[80vw] xl:max-w-[1080px] mx-auto h-full flex flex-col bg-stone-950 rounded-xl p-3 sm:p-4 lg:p-5 overflow-hidden">
					<InstantSearch
						searchClient={searchClient}
						indexName={
							process.env.NEXT_PUBLIC_MEILISEARCH_INDEX_NAME || 'products'
						}
						future={{ preserveSharedStateOnUnmount: true }}
					>
						{/* Configure to sort by availability and filter out products without prices */}
						<Configure
							ranking={[
								'desc(is_available)',
								'typo',
								'words',
								'proximity',
								'attribute',
								'sort',
								'exactness',
							]}
							filters='NOT (tags = "internal" OR tags = "verbrauchsstoffe") AND min_price > 0'
						/>

						<div className="flex flex-col h-full min-h-0">
							{/* Search Box - Own Row */}
							<div className="mb-4 sm:mb-5 flex-shrink-0 flex justify-center">
								<div className="w-full max-w-2xl px-4 sm:px-6">
									<SearchBox
										placeholder="Suche nach Produkten..."
										classNames={{
											root: 'relative',
											form: 'relative',
											input:
												'w-full px-4 sm:px-5 py-3 sm:py-3.5 pl-10 sm:pl-12 pr-10 sm:pr-12 bg-stone-800 border-2 border-gray-700 rounded-xl focus:outline-none focus:border-gray-600 text-sm sm:text-base text-white placeholder:text-gray-500',
											submit:
												'absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 p-1.5 text-gray-300 hover:text-white transition-colors pointer-events-auto',
											submitIcon: 'w-5 sm:w-5 h-5 sm:h-5',
											reset: 'hidden',
										}}
										submitIconComponent={({ classNames }) => (
											<svg
												className={classNames.submitIcon}
												width="20"
												height="20"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
											>
												<circle cx="11" cy="11" r="8" />
												<path d="m21 21-4.35-4.35" />
											</svg>
										)}
									/>
								</div>
							</div>

							{/* Compact Toolbar - Own Row */}
							<div className="mb-3 sm:mb-4 flex-shrink-0">
								<CompactToolbar />
							</div>

							{/* Results */}
							<div className="flex-1 overflow-y-auto min-h-0 -mx-3 sm:-mx-4 lg:-mx-5 px-3 sm:px-4 lg:px-5">
								<CustomHits />
							</div>
						</div>
					</InstantSearch>
				</div>
			</Modal>
		</>
	);
}

const Hit = ({ hit, viewMode }: { hit: Hit; viewMode?: 'grid' | 'list' }) => {
	if (viewMode === 'list') {
		return (
			<Link href={`/products/${hit.handle}`} className="group block h-full">
				<div className="bg-stone-950 rounded-lg overflow-hidden border border-gray-700 hover:border-gray-600 hover:bg-gray-800/70 transition-all duration-200 h-full flex flex-row gap-2 sm:gap-3 p-2 sm:p-2.5">
					{/* Image - responsive in list view */}
					<div className="relative w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 flex-shrink-0 bg-stone-900 rounded overflow-hidden">
						{hit.thumbnail ? (
							<Image
								src={hit.thumbnail}
								alt={hit.title}
								fill
								className="object-contain group-hover:scale-105 transition-transform duration-300 p-1.5"
								sizes="128px"
							/>
						) : (
							<div className="absolute inset-0 flex items-center justify-center bg-stone-950">
								<svg
									className="w-6 h-6 text-gray-600"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1.5}
										d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
									/>
								</svg>
							</div>
						)}
					</div>

					{/* Content - horizontal layout with responsive 120% zoom */}
					<div className="flex-1 flex flex-col gap-1.5 sm:gap-2 min-w-0">
						{/* Title */}
						<h3 className="font-semibold text-sm sm:text-base text-gray-200 line-clamp-2 group-hover:text-blue-400 transition-colors">
							{hit.title}
						</h3>

						{/* Description */}
						{hit.description && (
							<p className="text-xs sm:text-sm text-gray-400 line-clamp-1 flex-1">
								{hit.description}
							</p>
						)}

						{/* Bottom row: Categories, Price, Availability */}
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2 mt-auto">
							{/* Categories */}
							{hit.category_names && hit.category_names.length > 0 && (
								<div className="flex flex-wrap gap-1">
									{hit.category_names.slice(0, 1).map((category, idx) => (
										<span
											key={idx}
											className="text-xs sm:text-sm px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-700/50 text-gray-300 rounded-full font-medium border border-gray-600"
										>
											{category}
										</span>
									))}
								</div>
							)}

							{/* Price and Availability */}
							<div className="flex items-center gap-2 sm:gap-3">
								{/* Price */}
								{hit.min_price && (
									<div className="flex flex-col">
										<div className="flex items-baseline gap-1.5 sm:gap-2">
											<span className="text-base sm:text-lg font-semibold text-gray-300">
												€{hit.min_price.toFixed(2)}
											</span>
											{hit.max_price && hit.max_price !== hit.min_price && (
												<span className="text-xs sm:text-sm text-gray-500 font-medium">
													- €{hit.max_price.toFixed(2)}
												</span>
											)}
										</div>
										<span className="text-xs sm:text-sm text-gray-500">
											inkl. MwSt.
										</span>
									</div>
								)}

								{/* Availability */}
								<div>
									{hit.is_available ? (
										<span className="text-xs sm:text-sm text-blue-400 font-medium">
											● Verfügbar
										</span>
									) : (
										<span className="text-xs sm:text-sm text-red-400 font-medium">
											✕ Nicht lieferbar
										</span>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			</Link>
		);
	}

	// Grid view - Responsive cards for modal
	return (
		<Link href={`/products/${hit.handle}`} className="group block h-full">
			<div className="bg-stone-950 rounded-lg overflow-hidden border border-gray-700 hover:border-gray-600 hover:bg-gray-800/70 transition-all duration-200 h-full flex flex-col">
				{/* Image - Responsive */}
				<div className="relative w-full aspect-[4/3] bg-stone-950">
					{hit.thumbnail ? (
						<Image
							src={hit.thumbnail}
							alt={hit.title}
							fill
							className="object-contain group-hover:scale-105 transition-transform duration-300 p-1 sm:p-1.5 lg:p-2"
							sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
						/>
					) : (
						<div className="absolute inset-0 flex items-center justify-center bg-stone-950">
							<svg
								className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={1.5}
									d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
								/>
							</svg>
						</div>
					)}
				</div>

				{/* Content - Responsive with 120% zoom effect */}
				<div className="p-2 sm:p-2.5 lg:p-3 flex-1 flex flex-col gap-1.5 sm:gap-2">
					{/* Title */}
					<h3 className="font-semibold text-sm sm:text-base text-gray-200 line-clamp-2 group-hover:text-blue-400 transition-colors">
						{hit.title}
					</h3>

					{/* Description */}
					{hit.description && (
						<p className="text-xs sm:text-sm text-gray-400 line-clamp-1">
							{hit.description}
						</p>
					)}

					{/* Categories */}
					{hit.category_names && hit.category_names.length > 0 && (
						<div className="flex flex-wrap gap-1">
							{hit.category_names.slice(0, 1).map((category, idx) => (
								<span
									key={idx}
									className="text-xs sm:text-sm px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-700/50 text-gray-300 rounded-full font-medium border border-gray-600"
								>
									{category}
								</span>
							))}
						</div>
					)}

					{/* Price and Availability */}
					<div className="mt-auto pt-1.5 sm:pt-2 space-y-1 sm:space-y-1.5">
						{/* Price */}
						{hit.min_price && (
							<div className="flex flex-col gap-0.5">
								<div className="flex items-baseline gap-1.5 sm:gap-2">
									<span className="text-base sm:text-lg font-semibold text-gray-300">
										€{hit.min_price.toFixed(2)}
									</span>
									{hit.max_price && hit.max_price !== hit.min_price && (
										<span className="text-xs sm:text-sm text-gray-500 font-medium">
											- €{hit.max_price.toFixed(2)}
										</span>
									)}
								</div>
								<span className="text-xs sm:text-sm text-gray-500">
									inkl. MwSt.
								</span>
							</div>
						)}

						{/* Stock Availability */}
						<div className="flex items-center justify-between">
							<div className="flex-1">
								{hit.is_available ? (
									<span className="text-xs sm:text-sm text-blue-400 font-medium">
										● Verfügbar
									</span>
								) : (
									<span className="text-xs sm:text-sm text-red-400 font-medium">
										✕ Nicht lieferbar
									</span>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</Link>
	);
};
