// product-slider.tsx

'use client';

import { HttpTypes } from '@medusajs/types';
import Product from '../product-preview';
import { useRef } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

type ProductSliderProps = {
	products: HttpTypes.StoreProduct[];
	region: HttpTypes.StoreRegion;
};

export default function ProductSlider({ products, region }: ProductSliderProps) {
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	const scroll = (direction: 'left' | 'right') => {
		if (!scrollContainerRef.current) return;
		const container = scrollContainerRef.current;
		const scrollAmount = container.offsetWidth * 0.85;

		container.scrollBy({
			left: direction === 'left' ? -scrollAmount : scrollAmount,
			behavior: 'smooth',
		});
	};

	return (
		<div className="relative px-12 md:px-16">
			{/* Slider Container with CSS Grid for perfect card display - fluid responsive */}
			<div
				ref={scrollContainerRef}
				className="grid auto-cols-[minmax(100%,1fr)] sm:auto-cols-[minmax(calc(50%-1rem),1fr)] lg:auto-cols-[minmax(calc(33.333%-1.5rem),1fr)] xl:auto-cols-[minmax(calc(25%-1.875rem),1fr)] grid-flow-col gap-6 md:gap-8 overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar pb-4"
			>
				{products.map((product) => (
					<div key={product.id} className="snap-start">
						<Product region={region} product={product} />
					</div>
				))}
			</div>

			{/* Navigation Buttons - Outside container */}
			{products.length > 1 && (
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
