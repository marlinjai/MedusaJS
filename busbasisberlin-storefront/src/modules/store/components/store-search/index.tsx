'use client';

import { searchClient } from '@lib/config';
import { createRouting } from '@lib/search-routing';
import { useHeroAlertPadding } from '@lib/util/use-hero-alert-padding';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { BsFilter, BsGrid3X3, BsList, BsSortDown, BsX } from 'react-icons/bs';
import {
	Configure,
	HitsPerPage,
	InstantSearch,
	RefinementList,
	SearchBox,
	SortBy,
	Stats,
	useCurrentRefinements,
	useInstantSearch,
	usePagination,
	useStats,
} from 'react-instantsearch';
import CategoryTree from './category-tree';
import ProductGrid from './product-grid';
import SkeletonToolbar from './skeleton-toolbar';

// View Toggle Component (Grid/List)
function ViewToggle() {
	const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

	useEffect(() => {
		// Store view preference in sessionStorage
		const stored = sessionStorage.getItem('productViewMode');
		if (stored === 'grid' || stored === 'list') {
			setViewMode(stored);
		}
	}, []);

	useEffect(() => {
		sessionStorage.setItem('productViewMode', viewMode);
		// Dispatch custom event to notify ProductGrid
		window.dispatchEvent(
			new CustomEvent('viewModeChange', { detail: viewMode }),
		);
	}, [viewMode]);

	return (
		<div className="flex items-center gap-2">
			<span className="text-sm font-medium text-gray-400">Ansicht:</span>
			<div className="flex items-center gap-1 bg-stone-800 border border-stone-700 rounded-lg p-1">
				<button
					onClick={() => setViewMode('grid')}
					className={`p-2 rounded transition-colors ${
						viewMode === 'grid'
							? 'bg-blue-600 text-white'
							: 'text-gray-400 hover:text-white hover:bg-stone-700'
					}`}
					aria-label="Grid-Ansicht"
				>
					<BsGrid3X3 className="w-4 h-4" />
				</button>
				<button
					onClick={() => setViewMode('list')}
					className={`p-2 rounded transition-colors ${
						viewMode === 'list'
							? 'bg-blue-600 text-white'
							: 'text-gray-400 hover:text-white hover:bg-stone-700'
					}`}
					aria-label="Listen-Ansicht"
				>
					<BsList className="w-4 h-4" />
				</button>
			</div>
		</div>
	);
}

// Custom Filter Sidebar Component
function FilterSidebar() {
	const [isMobileOpen, setIsMobileOpen] = useState(false);

	return (
		<div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-6">
			{/* Category Tree - Always visible on mobile and desktop */}
			<div className="bg-stone-950 border border-stone-800 rounded-xl p-5">
				<h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
					<svg
						className="w-5 h-5 text-blue-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M4 6h16M4 12h16M4 18h16"
						/>
					</svg>
					Kategorien
				</h2>
				<CategoryTree />
			</div>

			{/* Mobile Filter Toggle Button - Only for other filters */}
			<button
				onClick={() => setIsMobileOpen(!isMobileOpen)}
				className="lg:hidden w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-white font-medium hover:bg-stone-900 transition-colors"
			>
				<BsFilter className="w-5 h-5" />
				Weitere Filter {isMobileOpen ? 'ausblenden' : 'anzeigen'}
			</button>

			{/* Other Filters Sidebar - Toggleable on mobile, always visible on desktop */}
			{/* Always render to preserve filter state - use max-height/overflow instead of display:none */}
			<aside
				className={`w-full transition-all duration-300 ${
					isMobileOpen
						? 'max-h-[9999px] opacity-100'
						: 'max-h-0 lg:max-h-[9999px] opacity-0 lg:opacity-100 overflow-hidden lg:overflow-visible'
				}`}
				aria-hidden={!isMobileOpen}
			>
				<div className="space-y-6">
					{/* Other Filters */}
					<div className="bg-stone-950 border border-stone-800 rounded-xl p-5">
						<h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
							<BsFilter className="w-5 h-5 text-blue-400" />
							Filter
						</h3>

						<div className="space-y-6">
							{/* Availability */}
							<div>
								<h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
									<svg
										className="w-4 h-4 text-green-400"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
									Verfügbarkeit
								</h4>
								<RefinementList
									attribute="is_available"
									transformItems={items =>
										items.map(item => ({
											...item,
											label:
												item.label === 'true'
													? 'Verfügbar'
													: 'Zurzeit nicht lieferbar',
										}))
									}
									classNames={{
										root: 'space-y-2',
										item: 'py-2 px-3 rounded-lg hover:bg-stone-800 transition-colors border border-transparent hover:border-stone-700',
										label: 'flex items-center gap-3 cursor-pointer group',
										checkbox:
											'h-4 w-4 rounded border-stone-600 bg-stone-800 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-stone-950 cursor-pointer transition-colors',
										labelText:
											'text-sm text-gray-300 group-hover:text-white flex-1 font-medium',
										count:
											'text-xs text-gray-400 bg-stone-800 px-2.5 py-1 rounded-full min-w-[32px] text-center font-medium',
									}}
								/>
							</div>
						</div>
					</div>

					{/* Sort Options */}
					<div className="bg-stone-950 border border-stone-800 rounded-xl p-5">
						<h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
							<BsSortDown className="w-5 h-5 text-blue-400" />
							Sortieren
						</h3>
						<div className="relative">
							<SortBy
								items={[
									{ label: 'Neueste zuerst', value: 'products' },
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
								]}
								classNames={{
									root: 'relative',
									select:
										'w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 pr-10 text-sm font-medium text-white hover:bg-stone-700 hover:border-stone-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer transition-all appearance-none',
								}}
							/>
							<div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
								<svg
									className="w-4 h-4 text-gray-400"
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
				</div>
			</aside>
		</div>
	);
}

// Custom Toolbar Component - Simplified: Stats, Clear Filters, View Toggle, and Items Per Page
function Toolbar() {
	const { items: refinements, refine: clearRefinement } =
		useCurrentRefinements();
	const { status, results } = useInstantSearch();
	const isLoading =
		(status === 'loading' || status === 'stalled') && !results?.nbHits;
	const hasActiveFilters = refinements.length > 0;

	// Show skeleton while loading (only on initial load when no results yet)
	if (isLoading) {
		return <SkeletonToolbar />;
	}

	return (
		<div className="bg-stone-950 rounded-xl border border-stone-800 p-4 mb-6 shadow-lg">
			<div className="flex flex-col gap-4">
				{/* Top Row: Stats and Clear Filters */}
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
					{/* Results Count */}
					<div className="text-sm font-medium text-gray-300">
						<Stats
							translations={{
								rootElementText({ nbHits, nbSortedHits }) {
									const count = nbSortedHits ?? nbHits;
									return `${count.toLocaleString('de-DE')} Produkte gefunden`;
								},
							}}
							classNames={{
								root: 'inline',
							}}
						/>
					</div>

					{/* Clear Filters Button */}
					{hasActiveFilters && (
						<button
							onClick={() => {
								refinements.forEach(refinement => {
									refinement.refinements.forEach(r => {
										clearRefinement(r);
									});
								});
							}}
							className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg transition-colors"
						>
							<BsX className="w-4 h-4" />
							Filter zurücksetzen
						</button>
					)}
				</div>

				{/* Bottom Row: View Toggle and Display Options */}
				<div className="flex flex-wrap items-center gap-3 pt-3 border-t border-stone-800">
					{/* View Toggle: Grid/List */}
					<ViewToggle />

					{/* Divider */}
					<div className="h-6 w-px bg-stone-700" />

					{/* Results per page */}
					<div className="flex items-center gap-2">
						<BsGrid3X3 className="w-4 h-4 text-gray-400" />
						<span className="text-sm font-medium text-gray-400">Anzeigen:</span>
						<div className="relative">
							<HitsPerPage
								items={[
									{ label: '12', value: 12, default: true },
									{ label: '24', value: 24 },
									{ label: '48', value: 48 },
									{ label: '96', value: 96 },
								]}
								classNames={{
									root: 'relative',
									select:
										'bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 pr-10 text-sm font-medium text-white hover:bg-stone-700 hover:border-stone-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer transition-all appearance-none',
								}}
							/>
							<div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
								<svg
									className="w-4 h-4 text-gray-400"
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
				</div>
			</div>
		</div>
	);
}

// Custom Pagination Component
function CustomPagination() {
	const { currentRefinement, refine, isFirstPage, isLastPage, createURL } =
		usePagination();
	const { nbHits } = useStats();
	const { results } = useInstantSearch();
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const currentPage = currentRefinement;

	// Get hits per page from results or default to 12
	const hitsPerPage = results?.hitsPerPage || 12;
	const totalPages = Math.ceil(nbHits / hitsPerPage);

	// Prefetch adjacent pages for instant navigation
	useEffect(() => {
		// Prefetch previous page
		if (currentPage > 0) {
			const prevUrl = createURL(currentPage - 1);
			router.prefetch(prevUrl);
		}

		// Prefetch next 2-3 pages
		for (let i = 1; i <= 3; i++) {
			const nextPage = currentPage + i;
			if (nextPage < totalPages) {
				const nextUrl = createURL(nextPage);
				router.prefetch(nextUrl);
			}
		}
	}, [currentPage, totalPages, router, createURL]);

	const renderPages = () => {
		const pages = [];

		// Previous arrow
		if (!isFirstPage) {
			pages.push(
				<button
					key="prev"
					onClick={() => refine(currentPage - 1)}
					className="px-4 py-2 text-sm font-medium text-gray-300 bg-stone-800 border border-stone-700 rounded-lg hover:bg-stone-700 hover:border-stone-600 transition-colors"
				>
					←
				</button>,
			);
		}

		// Always show first page
		pages.push(
			<button
				key={0}
				onClick={() => refine(0)}
				className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
					currentPage === 0
						? 'bg-blue-600 text-white border border-blue-600 shadow-lg shadow-blue-600/20'
						: 'text-gray-300 bg-stone-800 border border-stone-700 hover:bg-stone-700 hover:border-stone-600'
				}`}
			>
				1
			</button>,
		);

		// Show middle pages (current +/- 2)
		const startPage = Math.max(1, currentPage - 2);
		const endPage = Math.min(totalPages - 1, currentPage + 2);

		// Add ellipsis after first page if needed
		if (startPage > 1) {
			pages.push(
				<span key="ellipsis-start" className="px-2 text-gray-500">
					...
				</span>,
			);
		}

		// Add middle pages
		for (let i = startPage; i <= endPage; i++) {
			pages.push(
				<button
					key={i}
					onClick={() => refine(i)}
					className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
						currentPage === i
							? 'bg-blue-600 text-white border border-blue-600 shadow-lg shadow-blue-600/20'
							: 'text-gray-300 bg-stone-800 border border-stone-700 hover:bg-stone-700 hover:border-stone-600'
					}`}
				>
					{i + 1}
				</button>,
			);
		}

		// Add ellipsis before last page if we're not near the end
		if (endPage < totalPages - 1) {
			pages.push(
				<span key="ellipsis-end" className="px-2 text-gray-500">
					...
				</span>,
			);
		}

		// Show last known page if it's not already shown
		if (totalPages > 1 && endPage < totalPages - 1) {
			pages.push(
				<button
					key={totalPages - 1}
					onClick={() => refine(totalPages - 1)}
					className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
						currentPage === totalPages - 1
							? 'bg-blue-600 text-white border border-blue-600 shadow-lg shadow-blue-600/20'
							: 'text-gray-300 bg-stone-800 border border-stone-700 hover:bg-stone-700 hover:border-stone-600'
					}`}
				>
					{totalPages}
				</button>,
			);
		}

		// Next arrow
		if (!isLastPage) {
			pages.push(
				<button
					key="next"
					onClick={() => refine(currentPage + 1)}
					className="px-4 py-2 text-sm font-medium text-gray-300 bg-stone-800 border border-stone-700 rounded-lg hover:bg-stone-700 hover:border-stone-600 transition-colors"
				>
					→
				</button>,
			);
		}

		return pages;
	};

	if (totalPages <= 1) return null;

	return (
		<div className="flex justify-center items-center gap-1">
			{renderPages()}
		</div>
	);
}

export default function StoreSearch() {
	// Create routing configuration client-side only
	const routing = useMemo(() => createRouting(), []);
	// Get dynamic padding based on hero alert visibility
	const { large: paddingTop } = useHeroAlertPadding();

	// Hide skeleton and show content after hydration
	useEffect(() => {
		const skeletonWrapper = document.getElementById('store-skeleton');
		const contentWrapper = document.getElementById('store-content');

		if (skeletonWrapper && contentWrapper) {
			skeletonWrapper.style.display = 'none';
			contentWrapper.style.display = 'block';
		}
	}, []);

	return (
		<InstantSearch
			searchClient={searchClient}
			indexName={process.env.NEXT_PUBLIC_MEILISEARCH_INDEX_NAME || 'products'}
			routing={routing}
			future={{ preserveSharedStateOnUnmount: true }}
		>
			{/* Texture Background - rotated 90 degrees for vertical aspect */}
			<div className="relative min-h-screen">
				<div
					className="fixed inset-0 opacity-10 pointer-events-none"
					style={{
						backgroundImage: 'url(/images/texture_I.jpg)',
						backgroundSize: 'contain',
						backgroundPosition: 'center',
						backgroundRepeat: 'repeat',
						transform: ' scale(1.1)',
						transformOrigin: 'center center',
					}}
				/>
				<div
					className={`relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 ${paddingTop}`}
				>
					{/* Header with Search in one row - Full width */}
					<div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
						{/* Title */}
						<div>
							<h1 className="text-2xl sm:text-3xl font-bold text-gray-300">
								Teile Shop
							</h1>
							<p className="text-sm text-gray-400 mt-1 hidden sm:block">
								Durchsuchen Sie unseren vollständigen Produktkatalog
							</p>
						</div>

						{/* Search Box */}
						<div className="w-full sm:w-auto sm:flex-1 sm:max-w-md bg-stone-950 rounded-xl p-4">
							<SearchBox
								placeholder="Suche nach Produkten..."
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
								classNames={{
									root: 'relative',
									form: 'relative',
									input:
										'w-full px-4 py-3 pl-12 pr-12 bg-stone-800 border-2 border-gray-700 rounded-lg focus:outline-none focus:border-gray-600 text-sm text-white placeholder:text-gray-500',
									submit:
										'absolute left-4 top-1/2 -translate-y-1/2 p-1.5 text-gray-300 hover:text-white transition-colors',
									submitIcon: 'w-4 h-4',
									reset: 'hidden',
								}}
							/>
						</div>
					</div>

					{/* Main Content Area with Sidebar and Toolbar aligned */}
					<div className="flex flex-col lg:flex-row gap-8">
						{/* Filters Sidebar */}
						<FilterSidebar />

						{/* Main Content Area */}
						<div className="flex-1 min-w-0">
							{/* Toolbar: Results Stats and Sort */}
							<Toolbar />

							{/* Products Grid/List */}
							<ProductGrid />

							{/* Pagination */}
							<div className="mt-12">
								<CustomPagination />
							</div>

							{/* Configure filters to exclude internal products and products without prices */}
							<Configure filters='NOT (tags = "internal" OR tags = "verbrauchsstoffe") AND min_price > 0' />
						</div>
					</div>
				</div>
			</div>
		</InstantSearch>
	);
}
