// infinite-slider.tsx

'use client';

import { searchClient } from '@lib/config';
import { HttpTypes } from '@medusajs/types';
import { useEffect, useRef } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { Configure, InstantSearch, useInfiniteHits } from 'react-instantsearch';
import UnifiedProductCard from '../unified-product-card';

type InfiniteSliderProps = {
	region: HttpTypes.StoreRegion;
	currentProductId: string;
};

// Inner component that uses InstantSearch hooks
function SliderContent({ region, currentProductId }: InfiniteSliderProps) {
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const { hits, showMore, isLastPage } = useInfiniteHits();
	const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

	const scroll = (direction: 'left' | 'right') => {
		if (!scrollContainerRef.current) return;
		const container = scrollContainerRef.current;
		const scrollAmount = container.offsetWidth * 0.85;

		container.scrollBy({
			left: direction === 'left' ? -scrollAmount : scrollAmount,
			behavior: 'smooth',
		});
	};

	// Intersection Observer for infinite loading
	useEffect(() => {
		const trigger = loadMoreTriggerRef.current;
		if (!trigger) return;

		const observer = new IntersectionObserver(
			entries => {
				if (entries[0].isIntersecting && !isLastPage) {
					showMore();
				}
			},
			{ rootMargin: '400px' },
		);

		observer.observe(trigger);
		return () => observer.disconnect();
	}, [showMore, isLastPage]);

	// Filter out current product
	const filteredHits = hits.filter((hit: any) => hit.id !== currentProductId);

	if (filteredHits.length === 0) {
		return (
			<div className="text-center text-muted-foreground py-8">
				Keine weiteren Produkte verfügbar
			</div>
		);
	}

	return (
		<div className="relative px-12 md:px-16">
			{/* Slider Container with Fluid Grid */}
			<div
				ref={scrollContainerRef}
				className="grid auto-cols-[minmax(100%,1fr)] sm:auto-cols-[minmax(calc(50%-1rem),1fr)] lg:auto-cols-[minmax(calc(33.333%-1.5rem),1fr)] xl:auto-cols-[minmax(calc(25%-1.875rem),1fr)] grid-flow-col gap-6 md:gap-8 overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar pb-4"
			>
				{filteredHits.map((product: any) => (
					<div key={product.id} className="snap-start">
						<UnifiedProductCard
							product={product}
							showDescription={false}
							showCategories={true}
							showStock={true}
						/>
					</div>
				))}

				{/* Invisible trigger for infinite loading */}
				{!isLastPage && <div ref={loadMoreTriggerRef} className="w-1 h-1" />}
			</div>

			{/* Navigation Arrows - Outside */}
			{filteredHits.length > 1 && (
				<>
					<button
						onClick={() => scroll('left')}
						className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-card border-2 border-border shadow-xl flex items-center justify-center transition-all duration-200 hover:bg-primary hover:border-primary hover:scale-110 hover:text-primary-foreground z-10"
						aria-label="Vorheriges Produkt"
					>
						<FiChevronLeft className="w-6 h-6" />
					</button>

					<button
						onClick={() => scroll('right')}
						className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-card border-2 border-border shadow-xl flex items-center justify-center transition-all duration-200 hover:bg-primary hover:border-primary hover:scale-110 hover:text-primary-foreground z-10"
						aria-label="Nächstes Produkt"
					>
						<FiChevronRight className="w-6 h-6" />
					</button>
				</>
			)}
		</div>
	);
}

// Wrapper with InstantSearch
export default function InfiniteSlider({
	region,
	currentProductId,
}: InfiniteSliderProps) {
	return (
		<InstantSearch
			searchClient={searchClient}
			indexName={process.env.NEXT_PUBLIC_MEILISEARCH_INDEX_NAME || 'products'}
		>
			<Configure
				hitsPerPage={12}
				filters='NOT (tags = "internal" OR tags = "verbrauchsstoffe") AND min_price > 0'
			/>
			<SliderContent region={region} currentProductId={currentProductId} />
		</InstantSearch>
	);
}
