'use client';

import { Button } from '@medusajs/ui';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import {
	Configure,
	InstantSearch,
	SearchBox,
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

// Custom Hits component using useHits hook for better styling control
function CustomHits() {
	const { items } = useHits();
	const { results } = useInstantSearch();

	// Show empty state if there's a query but no results
	if (results?.query && items.length === 0) {
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

	// Show grid of hits
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
			{items.map(hit => (
				<div key={hit.id || (hit as any).objectID} className="h-full w-[280px]">
					<Hit hit={hit as unknown as Hit} />
				</div>
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
	const pathname = usePathname();

	// Use external state if provided, otherwise use internal
	const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
	const setIsOpen =
		externalSetIsOpen !== undefined ? externalSetIsOpen : setInternalIsOpen;

	useEffect(() => {
		setIsOpen(false);
	}, [pathname, setIsOpen]);

	return (
		<>
			<div className="hidden small:flex items-center gap-x-6 h-full">
				<Button
					onClick={() => setIsOpen(true)}
					variant="transparent"
					className="hover:text-ui-fg-base text-small-regular px-0 hover:bg-transparent focus:!bg-transparent"
				>
					Suche
				</Button>
			</div>
			<Modal isOpen={isOpen} close={() => setIsOpen(false)} search={true}>
				<div className="w-full max-w-[98vw] mx-auto h-full flex flex-col px-4">
					<InstantSearch
						searchClient={searchClient}
						indexName={
							process.env.NEXT_PUBLIC_MEILISEARCH_INDEX_NAME || 'products'
						}
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
						<div className="flex flex-col items-center justify-center">
							{/* Custom Search Box */}
							<div className="mb-6 flex-shrink-0">
								<div className="relative">
									<SearchBox
										placeholder="Suche nach Produkten..."
										classNames={{
											root: 'relative',
											form: 'relative flex items-center',
											input:
												'w-full pl-12 pr-4 py-3 text-base text-foreground placeholder:text-muted-foreground bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all',
											submit: 'absolute left-3 top-1/2 -translate-y-1/2',
											reset: 'absolute right-3 top-1/2 -translate-y-1/2',
											submitIcon: 'hidden',
											resetIcon: 'hidden',
											loadingIcon: 'hidden',
										}}
										submitIconComponent={() => (
											<FiSearch className="w-5 h-5 text-muted-foreground" />
										)}
									/>
								</div>
							</div>

							{/* Results */}
							<div className="flex-1 overflow-y-auto min-h-0 max-h-[750px] bg-stone-950 p-8 rounded-lg w-[75vw]">
								<CustomHits />
							</div>
						</div>
					</InstantSearch>
				</div>
			</Modal>
		</>
	);
}

const Hit = ({ hit }: { hit: Hit }) => {
	return (
		<Link href={`/products/${hit.handle}`} className="group block h-full">
			<div className="bg-stone-950 rounded-lg overflow-hidden border border-gray-700 hover:border-gray-600 hover:shadow-lg transition-all duration-200 h-full flex flex-col">
				{/* Image */}
				<div className="relative w-full aspect-square bg-stone-900">
					{hit.thumbnail ? (
						<Image
							src={hit.thumbnail}
							alt={hit.title}
							fill
							className="object-cover group-hover:scale-105 transition-transform duration-300"
							sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
						/>
					) : (
						<div className="absolute inset-0 flex items-center justify-center">
							<svg
								className="w-16 h-16 text-gray-600"
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

					{/* Availability Badge */}
					{hit.is_available === false && (
						<div className="absolute top-2 right-2">
							<span className="px-2 py-1 text-xs font-semibold bg-red-600 text-white rounded">
								Ausverkauft
							</span>
						</div>
					)}
				</div>

				{/* Content */}
				<div className="p-4 flex-1 flex flex-col">
					<h3 className="font-semibold text-base text-white mb-2 line-clamp-2 group-hover:text-primary transition-colors min-h-[2.5rem]">
						{hit.title}
					</h3>

					{/* Description */}
					{hit.description && (
						<p className="text-sm text-gray-400 line-clamp-2 mb-3">
							{hit.description}
						</p>
					)}

					{/* Categories */}
					{hit.category_names && hit.category_names.length > 0 && (
						<div className="mb-3">
							<div className="flex flex-wrap gap-1">
								{hit.category_names.slice(0, 2).map((category, idx) => (
									<span
										key={idx}
										className="text-xs px-2 py-0.5 bg-gray-800 text-gray-300 rounded-full"
									>
										{category}
									</span>
								))}
							</div>
						</div>
					)}

					{/* Price and Availability */}
					<div className="mt-auto pt-2 border-t border-gray-700">
						{hit.min_price ? (
							<div className="flex flex-col gap-1">
								<div className="flex items-baseline gap-2">
									<span className="text-xl font-bold text-primary">
										€{hit.min_price.toFixed(2)}
									</span>
									{hit.max_price && hit.max_price !== hit.min_price && (
										<span className="text-sm text-gray-400">
											- €{hit.max_price.toFixed(2)}
										</span>
									)}
								</div>
								<span className="text-xs text-gray-400">inkl. MwSt.</span>
							</div>
						) : (
							<span className="text-sm text-gray-400">Preis auf Anfrage</span>
						)}
						{/* Availability Status */}
						<div className="mt-2">
							{hit.is_available !== false ? (
								<span className="text-xs text-green-600 font-medium">
									● Verfügbar
								</span>
							) : (
								<span className="text-xs text-red-600 font-medium">
									✕ Nicht verfügbar
								</span>
							)}
						</div>
					</div>
				</div>
			</div>
		</Link>
	);
};
