'use client';

import { searchClient } from '@lib/config';
import { createRouting } from '@lib/search-routing';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import {
	Configure,
	HitsPerPage,
	InstantSearch,
	RefinementList,
	SearchBox,
	SortBy,
	Stats,
	useInstantSearch,
	usePagination,
	useStats,
} from 'react-instantsearch';
import CategoryTree from './category-tree';
import ProductGrid from './product-grid';

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
					className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
						? 'bg-blue-600 text-white border border-blue-600'
						: 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
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
							? 'bg-blue-600 text-white border border-blue-600'
							: 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
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
							? 'bg-blue-600 text-white border border-blue-600'
							: 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
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
					className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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

	return (
		<InstantSearch
			searchClient={searchClient}
			indexName={process.env.NEXT_PUBLIC_MEILISEARCH_INDEX_NAME || 'products'}
			routing={routing}
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
				<div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
					<div className="flex flex-col lg:flex-row gap-8">
						{/* Filters Sidebar */}
						<aside className="w-full lg:w-80 flex-shrink-0">
							<div className="sticky top-8 space-y-6">
								{/* Category Tree */}
								<div className="bg-stone-950 rounded-lg p-4">
									<h2 className="text-lg font-semibold text-white mb-3">
										Kategorien
									</h2>
									<CategoryTree />
								</div>

								{/* Other Filters */}
								<div className="bg-stone-950 rounded-lg p-4">
									<h3 className="text-lg font-semibold text-white mb-4">
										Filter
									</h3>

									<div className="space-y-6">
										{/* Availability */}
										<div>
											<h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
												<svg
													className="w-4 h-4"
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
											</h3>
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
													root: 'space-y-1',
													item: 'py-1.5 px-2 rounded-lg hover:bg-gray-800/50 transition-colors',
													label: 'flex items-center gap-2 cursor-pointer group',
													checkbox:
														'h-4 w-4 rounded border-gray-600 bg-gray-800 text-gray-300 focus:ring-gray-500 cursor-pointer',
													labelText:
														'text-sm text-gray-300 group-hover:text-white flex-1',
													count:
														'text-xs text-gray-400 bg-gray-700/50 px-2 py-0.5 rounded-full min-w-[32px] text-center',
												}}
											/>
										</div>
									</div>
								</div>
							</div>
						</aside>

						{/* Main Content Area */}
						<div className="flex-1 min-w-0">
							{/* Header */}
							<div className="mb-6">
								<h1 className="text-3xl font-bold text-gray-300 mb-2">
									Teile Shop
								</h1>
								<p className="text-gray-400">
									Durchsuchen Sie unseren vollständigen Produktkatalog
								</p>
							</div>

							{/* Search Box */}
							<div className="mb-6 bg-stone-950 rounded-xl p-4">
								<SearchBox
									placeholder="Suche nach Produkten, Teilen oder Stichwörtern..."
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
											'w-full px-4 py-4 pl-12 pr-12 bg-stone-800 border-2 border-gray-700 rounded-lg focus:outline-none focus:border-gray-600 text-base text-white placeholder:text-gray-500',
										submit:
											'absolute left-4 top-1/2 -translate-y-1/2 p-1.5 text-gray-300 hover:text-white transition-colors',
										submitIcon: 'w-5 h-5',
										reset: 'hidden',
									}}
								/>
							</div>

							{/* Toolbar: Results Stats and Sort */}
							<div className="bg-stone-950 rounded-xl p-4 mb-6">
								<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
									{/* Results Count */}
									<Stats
										translations={{
											rootElementText({ nbHits, nbSortedHits }) {
												const count = nbSortedHits ?? nbHits;
												return `${count.toLocaleString(
													'de-DE',
												)} Produkte gefunden`;
											},
										}}
										classNames={{
											root: 'text-sm text-gray-300',
										}}
									/>

									{/* Sort and Display Options */}
									<div className="flex flex-wrap items-center gap-4">
										{/* Results per page */}
										<div className="flex items-center gap-2">
											<span className="text-sm font-medium text-gray-300">
												Anzeigen:
											</span>
											<HitsPerPage
												items={[
													{ label: '12', value: 12, default: true },
													{ label: '24', value: 24 },
													{ label: '48', value: 48 },
													{ label: '96', value: 96 },
												]}
												classNames={{
													select:
														'bg-stone-700 border border-stone-600 rounded-lg px-3 py-2 text-sm font-medium text-gray-200 focus:outline-none focus:border-stone-600 cursor-pointer',
												}}
											/>
										</div>

										{/* Sort options */}
										<div className="flex items-center gap-2">
											<span className="text-sm font-medium text-gray-300">
												Sortieren:
											</span>
											<SortBy
												items={[
													{ label: 'Neueste zuerst', value: 'products' },
													{
														label: 'Preis: Niedrig bis Hoch',
														value: 'products:min_price:asc',
													},
													{
														label: 'Preis: Hoch bis Niedrig',
														value: 'products:max_price:desc',
													},
													{ label: 'Name: A-Z', value: 'products:title:asc' },
												]}
												classNames={{
													select:
														'bg-stone-700 border border-stone-600 rounded-lg px-3 py-2 text-sm font-medium text-gray-200 focus:outline-none focus:border-stone-600 cursor-pointer',
												}}
											/>
										</div>
									</div>
								</div>
							</div>

							{/* Products Grid */}
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
