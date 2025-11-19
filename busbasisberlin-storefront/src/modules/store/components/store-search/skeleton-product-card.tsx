// skeleton-product-card.tsx
// Skeleton loader for product cards matching the actual card dimensions

'use client';

type SkeletonProductCardProps = {
	viewMode?: 'grid' | 'list';
};

export default function SkeletonProductCard({
	viewMode = 'grid',
}: SkeletonProductCardProps) {
	if (viewMode === 'list') {
		return (
			<div className="bg-stone-950 rounded-xl overflow-hidden border border-gray-700 h-full flex flex-row gap-4 p-4 animate-pulse">
				{/* Image skeleton - matches list view dimensions */}
				<div className="w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0 bg-stone-800 rounded-lg" />

				{/* Content skeleton */}
				<div className="flex-1 flex flex-col gap-3 min-w-0">
					{/* Title */}
					<div className="h-5 bg-stone-800 rounded w-3/4" />
					<div className="h-5 bg-stone-800 rounded w-1/2" />

					{/* Description */}
					<div className="h-4 bg-stone-800 rounded w-full" />
					<div className="h-4 bg-stone-800 rounded w-5/6" />

					{/* Bottom row */}
					<div className="mt-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
						{/* Categories */}
						<div className="flex gap-2">
							<div className="h-6 bg-stone-800 rounded-full w-20" />
							<div className="h-6 bg-stone-800 rounded-full w-16" />
						</div>

						{/* Price and availability */}
						<div className="flex items-center gap-4">
							<div className="h-6 bg-stone-800 rounded w-20" />
							<div className="h-5 bg-stone-800 rounded w-24" />
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Grid view skeleton
	return (
		<div className="bg-stone-950 rounded-xl overflow-hidden border border-gray-700 h-full flex flex-col animate-pulse">
			{/* Image skeleton - matches grid view aspect ratio [4/3] */}
			<div className="relative w-full aspect-[4/3] bg-stone-800" />

			{/* Content skeleton */}
			<div className="p-4 flex-1 flex flex-col gap-3">
				{/* Title */}
				<div className="h-5 bg-stone-800 rounded w-3/4" />
				<div className="h-5 bg-stone-800 rounded w-1/2" />

				{/* Description */}
				<div className="h-4 bg-stone-800 rounded w-full" />
				<div className="h-4 bg-stone-800 rounded w-5/6" />

				{/* Categories */}
				<div className="flex gap-2">
					<div className="h-6 bg-stone-800 rounded-full w-20" />
					<div className="h-6 bg-stone-800 rounded-full w-16" />
				</div>

				{/* Price and availability */}
				<div className="mt-auto pt-2 space-y-2">
					<div className="h-6 bg-stone-800 rounded w-24" />
					<div className="h-4 bg-stone-800 rounded w-32" />
				</div>
			</div>
		</div>
	);
}


