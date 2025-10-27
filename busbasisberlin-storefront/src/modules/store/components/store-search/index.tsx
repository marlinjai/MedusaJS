'use client';

import { searchClient } from '@lib/config';
import { createRouting } from '@lib/search-routing';
import { useMemo } from 'react';
import {
	Configure,
	HitsPerPage,
	InstantSearch,
	Pagination,
	RefinementList,
	SearchBox,
	SortBy,
	Stats,
} from 'react-instantsearch';
import CategoryTree from './category-tree';
import ProductGrid from './product-grid';

export default function StoreSearch() {
	// Create routing configuration client-side only
	const routing = useMemo(() => createRouting(), []);

	return (
		<InstantSearch
			searchClient={searchClient}
			indexName={process.env.NEXT_PUBLIC_MEILISEARCH_INDEX_NAME || 'products'}
			routing={routing}
		>
			<div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="flex flex-col lg:flex-row gap-8">
					{/* Filters Sidebar */}
					<aside className="w-full lg:w-80 flex-shrink-0">
						<div className="sticky top-8 space-y-6">
							{/* Category Tree */}
							<div className="bg-gray-900 rounded-lg p-4">
								<h2 className="text-lg font-semibold text-white mb-3">
									Kategorien
								</h2>
								<CategoryTree />
							</div>

							{/* Other Filters */}
							<div className="bg-white rounded-lg border border-gray-200 p-6">
								<h3 className="text-lg font-bold text-gray-900 mb-6">Filter</h3>

								<div className="space-y-6">
									{/* Availability */}
									<div>
										<h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
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
															? 'Auf Lager'
															: 'Nicht auf Lager',
												}))
											}
											classNames={{
												root: 'space-y-1',
												item: 'py-1.5',
												label: 'flex items-center gap-2 cursor-pointer group',
												checkbox:
													'h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer',
												labelText:
													'text-sm text-gray-700 group-hover:text-gray-900 flex-1',
												count:
													'text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full min-w-[32px] text-center',
											}}
										/>
									</div>

									{/* Tags */}
									<div>
										<h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
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
													d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
												/>
											</svg>
											Schlagwörter
										</h3>
										<RefinementList
											attribute="tags"
											transformItems={items =>
												items.filter(
													item =>
														item.label !== 'internal' &&
														item.label !== 'verbrauchsstoffe',
												)
											}
											classNames={{
												root: 'space-y-1 max-h-[300px] overflow-y-auto',
												item: 'py-1.5',
												label: 'flex items-center gap-2 cursor-pointer group',
												checkbox:
													'h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer',
												labelText:
													'text-sm text-gray-700 group-hover:text-gray-900 flex-1',
												count:
													'text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full min-w-[32px] text-center',
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
						<div className="mb-6">
							<SearchBox
								placeholder="Suche nach Produkten, Teilen oder Stichwörtern..."
								classNames={{
									root: 'relative',
									form: 'relative',
									input:
										'w-full px-4 py-4 pl-12 pr-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base',
									submit:
										'absolute left-4 top-1/2 -translate-y-1/2 p-1.5 text-gray-400',
									reset: 'hidden',
								}}
							/>
						</div>

						{/* Toolbar: Results Stats and Sort */}
						<div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
							{/* Results Count */}
							<Stats
								translations={{
									rootElementText({ nbHits, nbSortedHits }) {
										const count = nbSortedHits ?? nbHits;
										return `${count.toLocaleString('de-DE')} Produkte gefunden`;
									},
								}}
								classNames={{
									root: 'text-sm text-gray-400',
								}}
							/>

							{/* Sort and Display Options */}
							<div className="flex items-center gap-6">
								{/* Results per page */}
								<div className="flex items-center gap-3">
									<span className="text-sm font-medium text-gray-400">
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
												'border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer',
										}}
									/>
								</div>

								{/* Sort options */}
								<div className="flex items-center gap-3">
									<span className="text-sm font-medium text-gray-400">
										Sortieren nach:
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
												'border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer',
										}}
									/>
								</div>
							</div>
						</div>

						{/* Products Grid */}
						<ProductGrid />

						{/* Pagination */}
						<div className="mt-12 flex justify-center">
							<Pagination
								classNames={{
									root: 'flex justify-center items-center gap-1',
									list: 'flex gap-1',
									item: 'inline-flex',
									link: 'px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors',
									selectedItem:
										'bg-blue-600 text-white border-blue-600 hover:bg-blue-700',
								}}
								showFirst
								showPrevious
								showNext
								showLast
							/>
						</div>

						{/* Configure filters to exclude internal products */}
						<Configure filters='NOT (tags = "internal" OR tags = "verbrauchsstoffe")' />
					</div>
				</div>
			</div>
		</InstantSearch>
	);
}
