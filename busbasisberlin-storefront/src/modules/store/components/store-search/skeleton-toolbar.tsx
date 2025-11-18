// skeleton-toolbar.tsx
// Skeleton loader for the toolbar matching actual dimensions

'use client';

export default function SkeletonToolbar() {
	return (
		<div className="bg-stone-950 rounded-xl border border-stone-800 p-4 mb-6 shadow-lg animate-pulse">
			<div className="flex flex-col gap-4">
				{/* Top Row: Stats and Clear Filters */}
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
					{/* Results Count skeleton */}
					<div className="h-5 bg-stone-800 rounded w-48" />

					{/* Clear Filters Button skeleton */}
					<div className="h-10 bg-stone-800 rounded-lg w-40" />
				</div>

				{/* Bottom Row: View Toggle and Display Options */}
				<div className="flex flex-wrap items-center gap-3 pt-3 border-t border-stone-800">
					{/* View Toggle skeleton */}
					<div className="h-10 bg-stone-800 rounded-lg w-32" />

					{/* Divider */}
					<div className="h-6 w-px bg-stone-700" />

					{/* Results per page skeleton */}
					<div className="h-10 bg-stone-800 rounded-lg w-32" />
				</div>
			</div>
		</div>
	);
}

