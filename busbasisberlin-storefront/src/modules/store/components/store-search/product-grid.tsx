'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useHits, useInstantSearch } from 'react-instantsearch';
import { useStoreSettings } from '@lib/context/store-settings-context';
import SkeletonProductCard from './skeleton-product-card';

type ProductHit = {
	id: string;
	title: string;
	subtitle?: string;
	description: string;
	handle: string;
	thumbnail: string;
	images?: string[];
	min_price: number;
	max_price: number;
	category_names?: string[];
	hierarchical_categories?: Record<string, string>;
	tags?: string[];
	is_available?: boolean;
	total_inventory?: number;
	is_favoriten?: boolean;
};

function Hit({
	hit,
	viewMode,
	showSubtitle = false,
}: {
	hit: ProductHit & { objectID: string };
	viewMode: 'grid' | 'list';
	showSubtitle?: boolean;
}) {
	// Use thumbnail with fallback to first image
	const imageUrl = hit.thumbnail || hit.images?.[0] || null;

	if (viewMode === 'list') {
		return (
			<Link href={`/products/${hit.handle}`} className="group block h-full">
				<div className="bg-stone-950 rounded-xl overflow-hidden border border-gray-700 hover:border-gray-600 hover:bg-gray-800/70 transition-all duration-200 h-full flex flex-row gap-4 p-4">
					{/* Image - smaller in list view */}
					<div className="relative w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0 bg-stone-900 rounded-lg overflow-hidden">
						{imageUrl ? (
							<Image
								src={imageUrl}
								alt={hit.title}
								fill
								className="object-contain group-hover:scale-105 transition-transform duration-300 p-2"
								sizes="160px"
							/>
						) : (
							<div className="absolute inset-0 flex items-center justify-center bg-stone-950">
								<svg
									className="w-12 h-12 text-gray-600"
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

				{/* Content - horizontal layout */}
				<div className="flex-1 flex flex-col gap-2 min-w-0">
					{/* Title */}
					<h3 className="font-semibold text-base text-gray-200 line-clamp-2 group-hover:text-blue-400 transition-colors">
						{hit.title}
					</h3>

					{/* Subtitle */}
					{showSubtitle && hit.subtitle && (
						<p className="text-xs text-gray-400 line-clamp-1 italic">
							{hit.subtitle}
						</p>
					)}

					{/* Description */}
					{hit.description && (
						<p className="text-sm text-gray-400 line-clamp-2 flex-1">
							{hit.description}
						</p>
					)}

						{/* Bottom row: Categories, Price, Availability */}
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-auto">
							{/* Categories */}
							{hit.category_names && hit.category_names.length > 0 && (
								<div className="flex flex-wrap gap-1">
									{hit.category_names.slice(0, 3).map((category, idx) => (
										<span
											key={idx}
											className="text-xs px-2 py-0.5 bg-gray-700/50 text-gray-300 rounded-full font-medium border border-gray-600"
										>
											{category}
										</span>
									))}
								</div>
							)}

							{/* Price and Availability */}
							<div className="flex items-center gap-4">
								{/* Price */}
								{hit.min_price && (
									<div className="flex flex-col">
										<div className="flex items-baseline gap-2">
											<span className="text-lg font-semibold text-gray-300">
												€{hit.min_price.toFixed(2)}
											</span>
											{hit.max_price && hit.max_price !== hit.min_price && (
												<span className="text-sm text-gray-500 font-medium">
													- €{hit.max_price.toFixed(2)}
												</span>
											)}
										</div>
										<span className="text-xs text-gray-500">inkl. MwSt.</span>
									</div>
								)}

								{/* Availability */}
								<div>
									{hit.total_inventory !== undefined &&
									hit.total_inventory > 0 ? (
										<span className="text-xs text-green-400 font-medium">
											● {hit.total_inventory} Stück
										</span>
									) : hit.is_available ? (
										<span className="text-xs text-blue-400 font-medium">
											● Verfügbar
										</span>
									) : (
										<span className="text-xs text-red-400 font-medium">
											✕ Nicht lieferbar
										</span>
									)}
								</div>

								{/* View Details Link */}
								<div className="flex items-center gap-1 text-sm text-gray-400 group-hover:text-blue-400 transition-colors">
									<span>Details</span>
									<svg
										className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M9 5l7 7-7 7"
										/>
									</svg>
								</div>
							</div>
						</div>
					</div>
				</div>
			</Link>
		);
	}

	// Grid view with mobile-optimized layout
	return (
		<Link href={`/products/${hit.handle}`} className="group block h-full">
			<div className="bg-stone-950 rounded-xl overflow-hidden border border-gray-700 hover:border-gray-600 hover:bg-gray-800/70 transition-all duration-200 h-full flex flex-col">
				{/* Mobile: Image + Description in one row, Desktop: Image on top */}
				<div className="sm:block">
					{/* Image - smaller aspect ratio on mobile */}
					<div className="relative w-full aspect-square sm:aspect-[4/3] bg-stone-950">
						{imageUrl ? (
							<Image
								src={imageUrl}
								alt={hit.title}
								fill
								className="object-contain group-hover:scale-105 transition-transform duration-300 p-1 sm:p-2"
								sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
							/>
						) : (
							<div className="absolute inset-0 flex items-center justify-center bg-stone-950">
								<svg
									className="w-12 h-12 sm:w-16 sm:h-16 text-gray-600"
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
				</div>

			{/* Content - smaller padding on mobile */}
			<div className="p-2 sm:p-4 flex-1 flex flex-col gap-1.5 sm:gap-2">
				{/* Title */}
				<h3 className="font-semibold text-sm sm:text-base text-gray-200 line-clamp-2 group-hover:text-blue-400 transition-colors">
					{hit.title}
				</h3>

				{/* Subtitle */}
				{showSubtitle && hit.subtitle && (
					<p className="text-[10px] sm:text-xs text-gray-400 line-clamp-1 italic">
						{hit.subtitle}
					</p>
				)}

				{/* Description - hide on very small screens, clamp to 3 lines on desktop */}
				{hit.description && (
					<p
						className="hidden sm:block text-sm text-gray-400 overflow-hidden"
						style={{
							display: '-webkit-box',
							WebkitLineClamp: 3,
							WebkitBoxOrient: 'vertical',
							overflow: 'hidden',
						}}
					>
						{hit.description}
					</p>
				)}

					{/* Categories - hide on very small screens */}
					{hit.category_names && hit.category_names.length > 0 && (
						<div className="hidden sm:flex flex-wrap gap-1">
							{hit.category_names.slice(0, 2).map((category, idx) => (
								<span
									key={idx}
									className="text-xs px-2 py-0.5 bg-gray-700/50 text-gray-300 rounded-full font-medium border border-gray-600"
								>
									{category}
								</span>
							))}
						</div>
					)}

					{/* Price, Availability, Details - Compact for mobile */}
					<div className="mt-auto pt-1.5 sm:pt-2 space-y-1.5 sm:space-y-2">
						{/* Row 1: Price + Availability */}
						<div className="flex items-center justify-between gap-2">
							{/* Price */}
							{hit.min_price && (
								<div className="flex flex-col gap-0">
									<div className="flex items-baseline gap-1 sm:gap-2">
										<span className="text-base sm:text-lg font-semibold text-gray-300">
											€{hit.min_price.toFixed(2)}
										</span>
										{hit.max_price && hit.max_price !== hit.min_price && (
											<span className="text-xs sm:text-sm text-gray-500 font-medium">
												- €{hit.max_price.toFixed(2)}
											</span>
										)}
									</div>
									<span className="text-[10px] sm:text-xs text-gray-500">
										inkl. MwSt.
									</span>
								</div>
							)}

							{/* Availability - compact on mobile */}
							<div>
								{hit.total_inventory !== undefined &&
								hit.total_inventory > 0 ? (
									<span className="text-[10px] sm:text-xs text-green-400 font-medium">
										●{' '}
										<span className="hidden sm:inline">
											{hit.total_inventory} Stück{' '}
										</span>
										Verfügbar
									</span>
								) : hit.is_available ? (
									<span className="text-[10px] sm:text-xs text-blue-400 font-medium">
										● Verfügbar
									</span>
								) : (
									<span className="text-[10px] sm:text-xs text-red-400 font-medium">
										✕ <span className="hidden sm:inline">Nicht </span>lieferbar
									</span>
								)}
							</div>
						</div>

						{/* Row 2: View Details Link */}
						<div className="flex items-center gap-1 text-xs sm:text-sm text-gray-400 group-hover:text-blue-400 transition-colors">
							<span>
								Details<span className="hidden sm:inline"> ansehen</span>
							</span>
							<svg
								className="w-3 h-3 sm:w-4 sm:h-4 transform group-hover:translate-x-1 transition-transform duration-200"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</div>
					</div>
				</div>
			</div>
		</Link>
	);
}

export default function ProductGrid() {
	const { hits } = useHits<ProductHit & { objectID: string }>();
	const { status } = useInstantSearch();
	const isLoading = status === 'loading' || status === 'stalled';
	const { settings } = useStoreSettings();

	// Initialize viewMode from sessionStorage immediately to avoid hydration issues
	const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
		if (typeof window !== 'undefined') {
			const stored = sessionStorage.getItem('productViewMode');
			if (stored === 'grid' || stored === 'list') {
				return stored;
			}
		}
		return 'grid';
	});

	useEffect(() => {
		// Listen for view mode changes
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

	// Show skeleton loaders while loading
	if (isLoading && hits.length === 0) {
		const skeletonCount = 12; // Match default hits per page

		if (viewMode === 'list') {
			return (
				<div className="flex flex-col gap-4">
					{Array.from({ length: skeletonCount }).map((_, index) => (
						<SkeletonProductCard key={index} viewMode="list" />
					))}
				</div>
			);
		}

		// Grid view skeleton
		return (
			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
				{Array.from({ length: skeletonCount }).map((_, index) => (
					<SkeletonProductCard key={index} viewMode="grid" />
				))}
			</div>
		);
	}

	// Render hits based on view mode
	if (viewMode === 'list') {
		return (
			<div className="flex flex-col gap-4">
				{hits.map(hit => (
					<Hit
						key={hit.objectID || hit.id}
						hit={hit}
						viewMode={viewMode}
						showSubtitle={settings.product_display.show_subtitle_in_cards}
					/>
				))}
			</div>
		);
	}

	// Grid view - 2 cols mobile, 3 cols tablet, 4 cols desktop
	// Wider sidebar (384px) with line-clamp-2 allows 4 columns to work well
	return (
		<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
			{hits.map(hit => (
				<Hit
					key={hit.objectID || hit.id}
					hit={hit}
					viewMode={viewMode}
					showSubtitle={settings.product_display.show_subtitle_in_cards}
				/>
			))}
		</div>
	);
}
